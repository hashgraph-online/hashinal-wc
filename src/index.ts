function ensureGlobalHTMLElement() {
  if (typeof globalThis === 'undefined') {
    return;
  }
  if (typeof (globalThis as any).HTMLElement === 'undefined') {
    (globalThis as any).HTMLElement = class {};
  }
}

ensureGlobalHTMLElement();

import { Buffer } from 'buffer';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import {
  Transaction,
  TransferTransaction,
  TopicMessageSubmitTransaction,
  ContractExecuteTransaction,
  Hbar,
  TransactionId,
  AccountId,
  TopicId,
  ContractId,
  LedgerId,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TopicCreateTransaction,
  TransactionReceipt,
  ContractFunctionParameters,
  PrivateKey,
  AccountCreateTransaction,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  AccountUpdateTransaction,
  AccountAllowanceApproveTransaction,
  TokenId,
} from '@hashgraph/sdk';
import * as HashgraphSDK from '@hashgraph/sdk';
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
  SignMessageResult,
} from '@hashgraph/hedera-wallet-connect';
import {
  Message,
  FetchMessagesResult,
  TokenBalance,
  HederaAccountResponse,
  HederaTXResponse,
  HBarNFT,
  Nft,
} from './types';
import { Logger } from './logger';
import { fetchWithRetry } from './utils/retry';

class HashinalsWalletConnectSDK {
  private static instance: HashinalsWalletConnectSDK;
  private static dAppConnectorInstance: DAppConnector;
  private static proxyInstance: HashinalsWalletConnectSDK | null = null;
  // Maximum number of node account IDs to use from the signer's network
  // Using 3 nodes provides redundancy while keeping transaction overhead reasonable
  private static readonly MAX_NODE_ACCOUNT_IDS = 3;
  private logger: Logger;
  private network: LedgerId;
  private extensionCheckInterval: NodeJS.Timeout | null = null;
  private hasCalledExtensionCallback: boolean = false;

  public get dAppConnector(): DAppConnector {
    return HashinalsWalletConnectSDK.dAppConnectorInstance;
  }

  constructor(logger?: Logger, network?: LedgerId) {
    this.logger = logger || new Logger();
    this.network = network || LedgerId.MAINNET;
  }

  public static getInstance(
    logger?: Logger,
    network?: LedgerId
  ): HashinalsWalletConnectSDK {
    let instance = HashinalsWalletConnectSDK?.instance;
    if (!instance) {
      HashinalsWalletConnectSDK.instance = new HashinalsWalletConnectSDK(
        logger,
        network
      );
      instance = HashinalsWalletConnectSDK.instance;
      HashinalsWalletConnectSDK.proxyInstance = null;
    }
    if (network) {
      instance.setNetwork(network);
    }
    if (!HashinalsWalletConnectSDK.proxyInstance) {
      HashinalsWalletConnectSDK.proxyInstance =
        new Proxy(instance, {
          get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value === 'function') {
              return value.bind(target);
            }
            return value;
          },
        }) as HashinalsWalletConnectSDK;
    }
    return HashinalsWalletConnectSDK.proxyInstance;
  }

  public setLogger(logger: Logger): void {
    this.logger = logger;
  }

  public setNetwork(network: LedgerId): void {
    this.network = network;
  }

  public getNetwork(): LedgerId {
    return this.network;
  }

  public setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    if (this.logger instanceof Logger) {
      this.logger.setLogLevel(level);
    }
  }

  public async init(
    projectId: string,
    metadata: SignClientTypes.Metadata,
    network?: LedgerId,
    onSessionIframeCreated?: (session: SessionTypes.Struct) => void
  ): Promise<DAppConnector> {
    const chosenNetwork = network || this.network;
    const isMainnet = chosenNetwork.toString() === 'mainnet';

    if (HashinalsWalletConnectSDK.dAppConnectorInstance) {
      return HashinalsWalletConnectSDK.dAppConnectorInstance;
    }

    HashinalsWalletConnectSDK.dAppConnectorInstance = new DAppConnector(
      metadata,
      chosenNetwork,
      projectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [isMainnet ? HederaChainId.Mainnet : HederaChainId.Testnet],
      'debug'
    );

    await HashinalsWalletConnectSDK.dAppConnectorInstance.init({
      logger: 'error',
    });

    HashinalsWalletConnectSDK.dAppConnectorInstance.onSessionIframeCreated = (
      session
    ) => {
      this.logger.info('new session from from iframe', session);
      this.handleNewSession(session);
      if (onSessionIframeCreated) {
        onSessionIframeCreated(session);
      }
    };

    this.logger.info(
      `Hedera Wallet Connect SDK initialized on ${chosenNetwork}`
    );
    return HashinalsWalletConnectSDK.dAppConnectorInstance;
  }

  public async connect(): Promise<SessionTypes.Struct> {
    this.ensureInitialized();
    const session = await this.dAppConnector.openModal();
    this.handleNewSession(session);
    return session;
  }

  public async disconnect(): Promise<boolean> {
    try {
      this.ensureInitialized();
      const accountInfo = this.getAccountInfo();
      const accountId = accountInfo?.accountId;
      const network = accountInfo?.network;
      const signer = this?.dAppConnector?.signers.find(
        (signer_) => signer_.getAccountId().toString() === accountId
      );
      await this.dAppConnector?.disconnect(signer?.topic);
      this.logger.info(`Disconnected from ${accountId} on ${network}`);
      return true;
    } catch (e) {
      this.logger.error('Failed to disconnect', e);
      return false;
    }
  }

  public async disconnectAll(): Promise<boolean> {
    try {
      this.ensureInitialized();
      await this.dAppConnector?.disconnectAll();
      this.logger.info(`Disconnected from all wallets`);
      return true;
    } catch (e) {
      this.logger.error('Failed to disconnect', e);
      return false;
    }
  }

  public async executeTransaction(
    tx: Transaction,
    disableSigner: boolean = false
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();
    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo?.accountId;
    const signer = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === accountId
    );

    if (!signer) {
      throw new Error('No signer available. Please ensure wallet is connected.');
    }

    // Ensure the transaction has node account IDs set before freezing
    // This prevents the "nodeAccountId must be set" error
    // Check if nodeAccountIds is null or empty array
    const nodeAccountIds = tx.nodeAccountIds || [];
    if (nodeAccountIds.length === 0) {
      const network = signer.getNetwork();
      if (!network) {
        throw new Error('Signer network is not available. Please reconnect your wallet.');
      }

      const networkNodeIds = Object.values(network)
        .filter((value) => value instanceof AccountId)
        .slice(0, HashinalsWalletConnectSDK.MAX_NODE_ACCOUNT_IDS) as AccountId[];

      if (networkNodeIds.length > 0) {
        tx.setNodeAccountIds(networkNodeIds);
      } else {
        throw new Error('No node account IDs available from signer network.');
      }
    }

    if (!disableSigner) {
      const signedTx = await tx.freezeWithSigner(signer);
      const executedTx = await signedTx.executeWithSigner(signer);
      return await executedTx.getReceiptWithSigner(signer);
    } else {
      const executedTx = await tx.executeWithSigner(signer);
      return await executedTx.getReceiptWithSigner(signer);
    }
  }

  public async executeTransactionWithErrorHandling(
    tx: Transaction,
    disableSigner: boolean
  ): Promise<{ result?: TransactionReceipt; error?: string }> {
    try {
      const result = await this.executeTransaction(tx, disableSigner);
      return {
        result,
        error: undefined,
      };
    } catch (e) {
      const error = e as Error;
      const message = error.message?.toLowerCase();
      this.logger.error('Failed to execute transaction', e);
      this.logger.error('Failure reason for transaction is', message);
      if (message.includes('insufficient payer balance')) {
        return {
          result: undefined,
          error: 'Insufficient balance to complete the transaction.',
        };
      } else if (message.includes('reject')) {
        return {
          result: undefined,
          error: 'You rejected the transaction',
        };
      } else if (message.includes('invalid signature')) {
        return {
          result: undefined,
          error: 'Invalid signature. Please check your account and try again.',
        };
      } else if (message.includes('transaction expired')) {
        return {
          result: undefined,
          error: 'Transaction expired. Please try again.',
        };
      } else if (message.includes('account not found')) {
        return {
          result: undefined,
          error:
            'Account not found. Please check the account ID and try again.',
        };
      } else if (message.includes('unauthorized')) {
        return {
          result: undefined,
          error:
            'Unauthorized. You may not have the necessary permissions for this action.',
        };
      } else if (message.includes('busy')) {
        return {
          result: undefined,
          error: 'The network is busy. Please try again later.',
        };
      } else if (message.includes('invalid transaction')) {
        return {
          result: undefined,
          error: 'Invalid transaction. Please check your inputs and try again.',
        };
      }
    }
  }

  public async submitMessageToTopic(
    topicId: string,
    message: string,
    submitKey?: PrivateKey
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    let transaction = new TopicMessageSubmitTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setMessage(message);

    if (submitKey) {
      transaction = await transaction.sign(submitKey);
    }

    return this.executeTransaction(transaction);
  }

  public async transferHbar(
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(fromAccountId))
      .addHbarTransfer(AccountId.fromString(fromAccountId), new Hbar(-amount))
      .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount));

    return this.executeTransaction(transaction);
  }

  async executeSmartContract(
    contractId: string,
    functionName: string,
    parameters: ContractFunctionParameters,
    gas: number = 100000
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(contractId))
      .setGas(gas)
      .setFunction(functionName, parameters);

    return this.executeTransaction(transaction);
  }

  private handleNewSession(session: SessionTypes.Struct) {
    const sessionAccount = session.namespaces?.hedera?.accounts?.[0];
    const sessionParts = sessionAccount?.split(':');
    const accountId = sessionParts.pop();
    const network = sessionParts.pop();
    this.logger.info('sessionAccount is', accountId, network);
    if (!accountId) {
      this.logger.error('No account id found in the session');
      return;
    } else {
      this.saveConnectionInfo(accountId, network);
    }
  }

  private getNetworkPrefix(): string {
    const accountInfo = this.getAccountInfo();
    const network = accountInfo?.network;

    if (!network) {
      this.logger.warn('Network is not set on SDK, defaulting.');

      const cachedNetwork = localStorage.getItem('connectedNetwork');

      if (cachedNetwork) {
        return cachedNetwork;
      }

      return 'mainnet-public';
    }

    if (network !== this.network) {
      this.logger.warn(
        'Detected network mismatch, reverting to signer network',
        network
      );
      this.network = network;
    }

    return network.isMainnet() ? 'mainnet-public' : 'testnet';
  }

  public async requestAccount(account: string): Promise<HederaAccountResponse> {
    try {
      const networkPrefix = this.getNetworkPrefix();

      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/accounts/${account}`;
      const response = await fetchWithRetry()(url);
      if (!response.ok) {
        throw new Error(
          `Failed to make request to mirror node for account: ${response.status}`
        );
      }
      return await response.json();
    } catch (e) {
      this.logger.error('Failed to fetch account', e);
      throw e;
    }
  }

  public async getAccountBalance(): Promise<string> {
    this.ensureInitialized();
    const accountInfo = this.getAccountInfo();
    const account = accountInfo?.accountId;

    if (!account) {
      return null;
    }

    const accountResponse = await this.requestAccount(account);
    if (!accountResponse) {
      throw new Error(
        'Failed to fetch account. Try again or check if the Account ID is valid.'
      );
    }
    const balance = accountResponse.balance.balance / 10 ** 8;
    return Number(balance).toLocaleString('en-US');
  }

  public getAccountInfo(): {
    accountId: string;
    network: LedgerId;
  } {
    const { accountId: cachedAccountId } = this.loadConnectionInfo();
    if (!cachedAccountId) {
      return null;
    }
    const signers = this?.dAppConnector?.signers;

    if (!signers?.length) {
      return null;
    }

    const cachedSigner = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === cachedAccountId
    );
    if (!cachedSigner) {
      return null;
    }
    const accountId = cachedSigner?.getAccountId()?.toString();
    if (!accountId) {
      return null;
    }
    const network = cachedSigner.getLedgerId();
    return {
      accountId,
      network,
    };
  }

  public async createTopic(
    memo?: string,
    adminKey?: string,
    submitKey?: string
  ): Promise<string> {
    this.ensureInitialized();

    let transaction = new TopicCreateTransaction().setTopicMemo(memo || '');

    if (adminKey) {
      const adminWithPrivateKey = PrivateKey.fromString(adminKey);
      transaction.setAdminKey(adminWithPrivateKey.publicKey);
      transaction = await transaction.sign(adminWithPrivateKey);
    }

    if (submitKey) {
      transaction.setSubmitKey(PrivateKey.fromString(submitKey).publicKey);
    }

    const receipt = await this.executeTransaction(transaction);
    return receipt.topicId!.toString();
  }

  public async createToken(
    name: string,
    symbol: string,
    initialSupply: number,
    decimals: number,
    treasuryAccountId: string,
    adminKey: string,
    supplyKey: string
  ): Promise<string> {
    this.ensureInitialized();

    let transaction = new TokenCreateTransaction()
      .setTokenName(name)
      .setTokenSymbol(symbol)
      .setDecimals(decimals)
      .setInitialSupply(initialSupply)
      .setTreasuryAccountId(AccountId.fromString(treasuryAccountId))
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite);

    if (supplyKey) {
      transaction = transaction.setSupplyKey(PrivateKey.fromString(supplyKey));
    }

    if (adminKey) {
      transaction = transaction.setAdminKey(PrivateKey.fromString(adminKey));
      transaction = await transaction.sign(PrivateKey.fromString(adminKey));
    }

    const receipt = await this.executeTransaction(transaction);
    return receipt.tokenId!.toString();
  }

  public async mintNFT(
    tokenId: string,
    metadata: string,
    supplyKey: PrivateKey
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    let transaction = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([Buffer.from(metadata, 'utf-8')])
      .sign(supplyKey);

    return this.executeTransaction(transaction);
  }

  public async getMessages(
    topicId: string,
    lastTimestamp?: number,
    disableTimestampFilter: boolean = false,
    network?: string
  ): Promise<FetchMessagesResult> {
    const networkPrefix = network || this.getNetworkPrefix();
    const baseUrl = `https://${networkPrefix}.mirrornode.hedera.com`;
    const timestampQuery =
      Number(lastTimestamp) > 0 && !disableTimestampFilter
        ? `&timestamp=gt:${lastTimestamp}`
        : '';

    const url = `${baseUrl}/api/v1/topics/${topicId}/messages?limit=200${timestampQuery}`;

    try {
      const response = await fetchWithRetry()(url);
      if (!response.ok) {
        throw new Error(
          `Failed to make request to mirror node: ${response.status}`
        );
      }
      const data = await response.json();
      const messages = data?.messages || [];
      const nextLink = data?.links?.next;

      const collectedMessages: Message[] = messages.map((msg: any) => {
        const parsedMessage = JSON.parse(atob(msg.message));
        return {
          ...parsedMessage,
          payer: msg.payer_account_id,
          created: new Date(Number(msg.consensus_timestamp) * 1000),
          consensus_timestamp: msg.consensus_timestamp,
          sequence_number: msg.sequence_number,
        };
      });

      if (nextLink) {
        const nextResult = await this.getMessages(
          topicId,
          Number(
            collectedMessages[collectedMessages.length - 1]?.consensus_timestamp
          ),
          disableTimestampFilter
        );
        collectedMessages.push(...nextResult.messages);
      }

      return {
        messages: collectedMessages.sort(
          (a, b) => a.sequence_number - b.sequence_number
        ),
        error: '',
      };
    } catch (error) {
      this.logger.error('Error fetching topic data:', error);
      return {
        messages: [],
        error: (error as Error).toString(),
      };
    }
  }

  public async signMessage(message: string) {
    const dAppConnector = this.dAppConnector;
    if (!dAppConnector) {
      throw new Error('No active connection or signer');
    }

    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo?.accountId;

    const params = {
      signerAccountId: `hedera:${this.network}:${accountId}`,
      message,
    };

    const result = (await dAppConnector.signMessage(
      params
    )) as SignMessageResult;

    // @ts-ignore
    return { userSignature: result.signatureMap };
  }

  private saveConnectionInfo(
    accountId: string | undefined,
    connectedNetwork?: string | undefined
  ): void {
    if (!accountId) {
      localStorage.removeItem('connectedAccountId');
      localStorage.removeItem('connectedNetwork');
    } else {
      const cleanNetwork = connectedNetwork?.replace(/['"]+/g, '');
      localStorage.setItem('connectedNetwork', cleanNetwork);
      localStorage.setItem('connectedAccountId', accountId);
    }
  }

  public loadConnectionInfo(): {
    accountId: string | null;
    network: string | null;
  } {
    return {
      accountId: localStorage.getItem('connectedAccountId'),
      network: localStorage.getItem('connectedNetwork'),
    };
  }

  public async connectWallet(
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata,
    network?: LedgerId
  ): Promise<{
    accountId: string;
    balance: string;
    session: SessionTypes.Struct;
  }> {
    try {
      await this.init(PROJECT_ID, APP_METADATA, network);
      const session = await this.connect();

      const accountInfo = this.getAccountInfo();
      const accountId = accountInfo?.accountId;
      const balance = await this.getAccountBalance();
      const networkPrefix = this.getNetworkPrefix();

      this.saveConnectionInfo(accountId, networkPrefix);
      return {
        accountId,
        balance,
        session,
      };
    } catch (error) {
      this.logger.error('Failed to connect wallet:', error);
      throw error;
    }
  }

  public async disconnectWallet(
    clearStorage: boolean = true
  ): Promise<boolean> {
    try {
      const success = await this.disconnect();

      if (success && clearStorage) {
        localStorage.clear();
      }

      this.saveConnectionInfo(undefined);
      return success;
    } catch (error) {
      this.logger.error('Failed to disconnect wallet:', error);
      return false;
    }
  }

  public async initAccount(
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata,
    networkOverride?: LedgerId,
    onSessionIframeCreated: (session: SessionTypes.Struct) => void = () => {}
  ): Promise<{ accountId: string; balance: string } | null> {
    const { accountId: savedAccountId, network: savedNetwork } =
      this.loadConnectionInfo();

    if (savedAccountId && savedNetwork) {
      try {
        const defaultNetwork =
          savedNetwork === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;
        const network = networkOverride || defaultNetwork;
        await this.init(
          PROJECT_ID,
          APP_METADATA,
          network,
          onSessionIframeCreated
        );
        const balance = await this.getAccountBalance();
        return {
          accountId: savedAccountId,
          balance,
        };
      } catch (error) {
        this.logger.error('Failed to reconnect:', error);
        this.saveConnectionInfo(undefined, undefined);
        return null;
      }
    } else if (networkOverride) {
      try {
        this.logger.info(
          'initializing normally through override.',
          networkOverride
        );
        await this.init(
          PROJECT_ID,
          APP_METADATA,
          networkOverride,
          onSessionIframeCreated
        );
        this.logger.info('initialized', networkOverride);
        await this.connectViaDappBrowser();
        this.logger.info('connected via dapp browser');
      } catch (error) {
        this.logger.error('Failed to fallback connect:', error);
        this.saveConnectionInfo(undefined, undefined);
        return null;
      }
    }

    return null;
  }

  public subscribeToExtensions(callback: (extension: any) => void) {
    // Clear any existing interval and reset flag
    if (this.extensionCheckInterval) {
      clearInterval(this.extensionCheckInterval);
    }
    this.hasCalledExtensionCallback = false;

    // Set up polling to check for extensions
    this.extensionCheckInterval = setInterval(() => {
      const extensions = this.dAppConnector?.extensions || [];
      const availableExtension = extensions.find(
        (ext) => ext.availableInIframe
      );

      if (availableExtension && !this.hasCalledExtensionCallback) {
        this.hasCalledExtensionCallback = true;
        callback(availableExtension);
        // Clear the interval once we find an available extension
        if (this.extensionCheckInterval) {
          clearInterval(this.extensionCheckInterval);
          this.extensionCheckInterval = null;
        }
      }
    }, 1000); // Check every second

    // Return cleanup function
    return () => {
      if (this.extensionCheckInterval) {
        clearInterval(this.extensionCheckInterval);
        this.extensionCheckInterval = null;
      }
      this.hasCalledExtensionCallback = false;
    };
  }

  public async connectViaDappBrowser() {
    const extensions = this.dAppConnector.extensions || [];
    const extension = extensions.find((ext) => {
      this.logger.info('Checking extension', ext);
      return ext.availableInIframe;
    });
    this.logger.info('extensions are', extensions, extension);

    if (extension) {
      await this.connectToExtension(extension);
    } else {
      // If no extension is immediately available, subscribe to changes
      this.subscribeToExtensions(async (newExtension) => {
        await this.connectToExtension(newExtension);
      });
    }
  }

  private async connectToExtension(extension: any) {
    this.logger.info('found extension, connecting to iframe.', extension);
    const session = await this.dAppConnector.connectExtension(extension.id);
    const onSessionIframeCreated = this.dAppConnector.onSessionIframeCreated;
    if (onSessionIframeCreated) {
      onSessionIframeCreated(session);
    }
  }

  private ensureInitialized(): void {
    if (!this.dAppConnector) {
      throw new Error('SDK not initialized. Call init() first.');
    }
  }

  static run(): void {
    try {
      if (typeof window !== 'undefined') {
        (window as any).HashinalsWalletConnectSDK =
          HashinalsWalletConnectSDK.getInstance();
        (window as any).HashgraphSDK = HashgraphSDK;
      }
    } catch (e) {
      console.error('[ERROR]: failed setting sdk on window');
    }
  }

  public async transferToken(
    tokenId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(fromAccountId))
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(fromAccountId),
        -amount
      )
      .addTokenTransfer(
        TokenId.fromString(tokenId),
        AccountId.fromString(toAccountId),
        amount
      );

    return this.executeTransaction(transaction);
  }

  async createAccount(initialBalance: number): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new AccountCreateTransaction().setInitialBalance(
      new Hbar(initialBalance)
    );

    return this.executeTransaction(transaction);
  }

  public async associateTokenToAccount(
    accountId: string,
    tokenId: string
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)]);

    return this.executeTransaction(transaction);
  }

  public async dissociateTokenFromAccount(
    accountId: string,
    tokenId: string
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new TokenDissociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)]);

    return this.executeTransaction(transaction);
  }

  public async updateAccount(
    accountId: string,
    maxAutomaticTokenAssociations: number
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new AccountUpdateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setMaxAutomaticTokenAssociations(maxAutomaticTokenAssociations);

    return this.executeTransaction(transaction);
  }

  public async approveAllowance(
    spenderAccountId: string,
    tokenId: string,
    amount: number,
    ownerAccountId: string
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction =
      new AccountAllowanceApproveTransaction().approveTokenAllowance(
        TokenId.fromString(tokenId),
        AccountId.fromString(ownerAccountId),
        AccountId.fromString(spenderAccountId),
        amount
      );

    return this.executeTransaction(transaction);
  }

  public async getAccountTokens(
    accountId: string
  ): Promise<{ tokens: TokenBalance[] }> {
    this.ensureInitialized();

    const networkPrefix = this.getNetworkPrefix();
    const baseUrl = `https://${networkPrefix}.mirrornode.hedera.com`;
    const url = `${baseUrl}/api/v1/accounts/${accountId}/tokens?limit=200`;

    try {
      const response = await fetchWithRetry()(url);
      if (!response.ok) {
        throw new Error(
          `Failed to make request to mirror node for account tokens: ${response.status}`
        );
      }
      const data = await response.json();

      const tokens: TokenBalance[] = [];

      for (const token of data.tokens) {
        if (token.token_id) {
          tokens.push({
            tokenId: token.token_id,
            balance: token.balance,
            decimals: token.decimals,
            formatted_balance: (
              token.balance /
              10 ** token.decimals
            ).toLocaleString('en-US'),
            created_timestamp: new Date(Number(token.created_timestamp) * 1000),
          });
        }
      }
      let nextLink = data.links?.next;
      while (nextLink) {
        const nextUrl = `${baseUrl}${nextLink}`;
        const nextResponse = await fetchWithRetry()(nextUrl);
        if (!nextResponse.ok) {
          throw new Error(
            `Failed to make request to mirror node for account tokens: ${nextResponse.status}, page: ${nextUrl}`
          );
        }
        const nextData = await nextResponse.json();

        for (const token of nextData.tokens) {
          if (token.token_id) {
            tokens.push({
              tokenId: token.token_id,
              balance: token.balance,
              decimals: token.decimals,
              formatted_balance: (
                token.balance /
                10 ** token.decimals
              ).toLocaleString('en-US'),
              created_timestamp: new Date(
                Number(token.created_timestamp) * 1000
              ),
            });
          }
        }

        nextLink = nextData.links?.next;
      }

      return { tokens };
    } catch (error) {
      this.logger.error('Error fetching account tokens:', error);
      throw error;
    }
  }

  public async getTransaction(
    transactionId: string
  ): Promise<HederaTXResponse | null> {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/transactions/${transactionId}`;

      this.logger.debug('Fetching transaction', url);
      const request = await fetchWithRetry()(url);

      if (!request.ok) {
        throw new Error(`Failed to fetch transaction: ${request.status}`);
      }

      return await request.json();
    } catch (e) {
      this.logger.error('Failed to get transaction', e);
      return null;
    }
  }

  public async getTransactionByTimestamp(
    timestamp: string
  ): Promise<HederaTXResponse | null> {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/transactions?timestamp=${timestamp}`;

      this.logger.debug('Fetching transaction by timestamp', url);
      const request = await fetchWithRetry()(url);

      if (!request.ok) {
        throw new Error(
          `Failed to fetch transaction by timestamp: ${request.status}`
        );
      }

      const response = (await request.json()) as HederaTXResponse;
      const transaction = response?.transactions?.[0];

      if (transaction) {
        return await this.getTransaction(transaction.transaction_id);
      }

      return null;
    } catch (e) {
      this.logger.error('Failed to get transaction by timestamp', e);
      return null;
    }
  }

  public async getAccountNFTs(
    accountId: string,
    tokenId?: string
  ): Promise<Nft[]> {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const tokenQuery = tokenId ? `&token.id=${tokenId}` : '';
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts?limit=200${tokenQuery}`;

      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(`Failed to fetch NFTs for account: ${request.status}`);
      }

      const response = (await request.json()) as HBarNFT;
      let nextLink: string | null = response?.links?.next || null;
      let nfts: Nft[] = (response.nfts || []) as Nft[];

      while (nextLink) {
        try {
          const nextRequest = await fetchWithRetry()(
            `https://${networkPrefix}.mirrornode.hedera.com${nextLink}`
          );

          if (!nextRequest.ok) {
            throw new Error(
              `Failed to fetch next page of NFTs: ${nextRequest.status}`
            );
          }

          const nextResponse = (await nextRequest.json()) as HBarNFT;
          const nextNfts = (nextResponse?.nfts || []) as Nft[];
          nfts = [...nfts, ...nextNfts];

          nextLink =
            nextResponse?.links?.next && nextLink !== nextResponse?.links?.next
              ? nextResponse.links.next
              : null;
        } catch (e) {
          this.logger.error('Failed to fetch next page of NFTs', e);
          break;
        }
      }

      return nfts.map((nft: Nft) => {
        try {
          nft.token_uri = Buffer.from(nft.metadata, 'base64').toString('ascii');
        } catch (e) {
          this.logger.error('Failed to decode NFT metadata', e);
        }
        return nft;
      });
    } catch (e) {
      this.logger.error('Failed to get account NFTs', e);
      return [];
    }
  }

  public async validateNFTOwnership(
    serialNumber: string,
    accountId: string,
    tokenId: string
  ): Promise<Nft | null> {
    const userNFTs = await this.getAccountNFTs(accountId, tokenId);

    return (
      userNFTs.find(
        (nft) =>
          nft.token_id === tokenId &&
          nft.serial_number.toString() === serialNumber
      ) || null
    );
  }

  public async readSmartContract(
    data: string,
    fromAccount: AccountId,
    contractId: ContractId,
    estimate: boolean = true,
    value: number = 0
  ): Promise<any> {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const body: any = {
        block: 'latest',
        data: data,
        estimate: estimate,
        from: fromAccount.toSolidityAddress(),
        to: contractId.toSolidityAddress(),
        value,
      };

      if (!estimate) {
        body.gas = 300000;
        body.gasPrice = 100000000;
      }

      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/contracts/call`;

      const response = await fetchWithRetry()(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to make contract call: ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      this.logger.error('Failed to make contract call', e);
      return null;
    }
  }
}

// This variable is replaced at build time.
// @ts-ignore
if ('VITE_BUILD_FORMAT' === 'umd') {
  HashinalsWalletConnectSDK.run();
}

export * from './types';
export * from './sign';
export { HashinalsWalletConnectSDK, HashgraphSDK };
