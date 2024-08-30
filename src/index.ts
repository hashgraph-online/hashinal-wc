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
} from '@hashgraph/hedera-wallet-connect';
import { Message, FetchMessagesResult, TokenBalance } from './types';
import { DefaultLogger, ILogger } from './logger/logger';

class HashinalsWalletConnectSDK {
  private static instance: HashinalsWalletConnectSDK;
  public dAppConnector: DAppConnector | undefined;
  private logger: ILogger;
  private network: LedgerId;

  constructor(logger?: ILogger, network?: LedgerId) {
    this.logger = logger || new DefaultLogger();
    this.network = network || LedgerId.MAINNET;
  }

  static getInstance(
    logger?: ILogger,
    network?: LedgerId
  ): HashinalsWalletConnectSDK {
    if (!HashinalsWalletConnectSDK.instance) {
      HashinalsWalletConnectSDK.instance = new HashinalsWalletConnectSDK(
        logger,
        network
      );
    }
    return HashinalsWalletConnectSDK.instance;
  }

  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void {
    if (this.logger instanceof DefaultLogger) {
      this.logger.setLogLevel(level);
    } else {
      this.logger.warn('setLogLevel is only available for the default logger');
    }
  }

  async init(
    projectId: string,
    metadata: SignClientTypes.Metadata,
    network?: LedgerId
  ): Promise<DAppConnector> {
    const chosenNetwork = network || this.network;
    const isMainnet = chosenNetwork.toString() === 'mainnet';
    this.dAppConnector = new DAppConnector(
      metadata,
      chosenNetwork,
      projectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [isMainnet ? HederaChainId.Mainnet : HederaChainId.Testnet]
    );

    await this.dAppConnector.init({ logger: 'error' });

    this.dAppConnector.onSessionIframeCreated = (session) => {
      this.handleNewSession(session);
    };
    this.logger.info(
      `Hedera Wallet Connect SDK initialized on ${chosenNetwork}`
    );
    return this.dAppConnector;
  }

  async connect(): Promise<SessionTypes.Struct> {
    this.ensureInitialized();
    const session = await this.dAppConnector.openModal();
    this.handleNewSession(session);
    return session;
  }

  async disconnect(): Promise<boolean> {
    try {
      this.ensureInitialized();
      await this.dAppConnector!.disconnectAll();
      this.logger.info('Disconnected from all wallets');
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
    const accountId = await this.getAccountInfo();
    const signer = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === accountId
    );
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

  async submitMessageToTopic(
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

  async transferHbar(
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
    const accountId = sessionAccount?.split(':').pop();
    if (!accountId) {
      console.error('No account id found in the session');
      return;
    } else {
      this.saveConnectionInfo(accountId);
    }
  }

  private async requestAccount(account: string): Promise<any> {
    try {
      const url = `https://${
        this.network === LedgerId.MAINNET ? 'mainnet-public' : 'testnet'
      }.mirrornode.hedera.com/api/v1/accounts/${account}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      this.logger.error('Failed to fetch account', e);
      throw e;
    }
  }

  async getAccountBalance(): Promise<string> {
    this.ensureInitialized();
    const account = this.getAccountInfo();

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

  getAccountInfo(): string {
    const cachedAccountId = this.loadConnectionInfo();
    if (!cachedAccountId) {
      return null;
    }
    this.logger.info(`Getting signer for ${cachedAccountId}`);
    const cachedSigner = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === cachedAccountId
    );
    return cachedSigner?.getAccountId()?.toString();
  }

  async createTopic(
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

  async createToken(
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

  async mintNFT(
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

  async getMessages(
    topicId: string,
    lastTimestamp?: number,
    disableTimestampFilter: boolean = false
  ): Promise<FetchMessagesResult> {
    const baseUrl = `https://${
      this.network === LedgerId.MAINNET ? 'mainnet-public' : 'testnet'
    }.mirrornode.hedera.com`;
    const timestampQuery =
      Number(lastTimestamp) > 0 && !disableTimestampFilter
        ? `&timestamp=gt:${lastTimestamp}`
        : '';

    const url = `${baseUrl}/api/v1/topics/${topicId}/messages?limit=200${timestampQuery}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

  saveConnectionInfo(accountId: string | undefined): void {
    if (!accountId) {
      localStorage.removeItem('connectedAccountId');
    } else {
      localStorage.setItem('connectedAccountId', accountId);
    }
  }

  loadConnectionInfo(): string | null {
    return localStorage.getItem('connectedAccountId');
  }

  async connectWallet(
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

      const accountId = await this.getAccountInfo();
      const balance = await this.getAccountBalance();

      this.saveConnectionInfo(accountId);
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

  async disconnectWallet(clearStorage: boolean = true): Promise<boolean> {
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

  async initAccount(
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata
  ): Promise<{ accountId: string; balance: string } | null> {
    const savedAccountId = this.loadConnectionInfo();

    if (savedAccountId) {
      try {
        await this.init(PROJECT_ID, APP_METADATA);
        const balance = await this.getAccountBalance();
        return {
          accountId: savedAccountId,
          balance,
        };
      } catch (error) {
        this.logger.error('Failed to reconnect:', error);
        localStorage.removeItem('connectedAccountId');
        return null;
      }
    }
    return null;
  }

  private ensureInitialized(): void {
    if (!this.dAppConnector) {
      throw new Error('SDK not initialized. Call init() first.');
    }
  }

  static run(): void {
    if (typeof window !== 'undefined') {
      (window as any).HashinalsWalletConnectSDK =
        HashinalsWalletConnectSDK.getInstance();
    }
  }

  async transferToken(
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

  async associateTokenToAccount(
    accountId: string,
    tokenId: string
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)]);

    return this.executeTransaction(transaction);
  }

  async dissociateTokenFromAccount(
    accountId: string,
    tokenId: string
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new TokenDissociateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setTokenIds([TokenId.fromString(tokenId)]);

    return this.executeTransaction(transaction);
  }

  async updateAccount(
    accountId: string,
    maxAutomaticTokenAssociations: number
  ): Promise<TransactionReceipt> {
    this.ensureInitialized();

    const transaction = new AccountUpdateTransaction()
      .setAccountId(AccountId.fromString(accountId))
      .setMaxAutomaticTokenAssociations(maxAutomaticTokenAssociations);

    return this.executeTransaction(transaction);
  }

  async approveAllowance(
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

  async getAccountTokens(
    accountId: string
  ): Promise<{ tokens: TokenBalance[] }> {
    this.ensureInitialized();

    const baseUrl = `https://${
      this.network === LedgerId.MAINNET ? 'mainnet-public' : 'testnet'
    }.mirrornode.hedera.com`;
    const url = `${baseUrl}/api/v1/accounts/${accountId}/tokens?limit=200`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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
        const nextResponse = await fetch(nextUrl);
        if (!nextResponse.ok) {
          throw new Error(`HTTP error! status: ${nextResponse.status}`);
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
}

// This variable is replaced at build time.
// @ts-ignore
const isUMD = 'VITE_BUILD_FORMAT' === 'umd';
if (isUMD) {
  HashinalsWalletConnectSDK.run();
}

export { HashinalsWalletConnectSDK, HashgraphSDK };
