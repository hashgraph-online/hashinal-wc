import { Buffer } from "buffer";
import * as HashgraphSDK from "@hashgraph/sdk";
import { LedgerId, TopicMessageSubmitTransaction, TopicId, TransferTransaction, TransactionId, AccountId, Hbar, ContractExecuteTransaction, ContractId, TopicCreateTransaction, PrivateKey, TokenCreateTransaction, TokenType, TokenSupplyType, TokenMintTransaction, TokenId, AccountCreateTransaction, TokenAssociateTransaction, TokenDissociateTransaction, AccountUpdateTransaction, AccountAllowanceApproveTransaction } from "@hashgraph/sdk";
import { createAppKit } from "@reown/appkit";
import { HederaChainDefinition, HederaAdapter, hederaNamespace, HederaProvider, DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId } from "@hashgraph/hedera-wallet-connect";
import { base64StringToSignatureMap, prefixMessageToSign, verifyMessageSignature } from "@hashgraph/hedera-wallet-connect";
import { Logger } from "./logger.js";
import { fetchWithRetry } from "./utils/retry.js";
import { Name, Result } from "./types.js";
function ensureGlobalHTMLElement() {
  if (typeof globalThis === "undefined") {
    return;
  }
  if (typeof globalThis.HTMLElement === "undefined") {
    globalThis.HTMLElement = class {
    };
  }
}
ensureGlobalHTMLElement();
const HASH_PACK_WALLET_ID = "a29498d225fa4b13468ff4d6cf4ae0ea4adcbd95f07ce8a843a1dee10b632f3f";
const _HashinalsWalletConnectSDK = class _HashinalsWalletConnectSDK {
  constructor(logger, network) {
    this.reownAppKit = null;
    this.reownAppKitKey = null;
    this.extensionCheckInterval = null;
    this.hasCalledExtensionCallback = false;
    this.logger = logger || new Logger();
    this.network = network || LedgerId.MAINNET;
  }
  get dAppConnector() {
    return _HashinalsWalletConnectSDK.dAppConnectorInstance;
  }
  static getInstance(logger, network) {
    let instance = _HashinalsWalletConnectSDK?.instance;
    if (!instance) {
      _HashinalsWalletConnectSDK.instance = new _HashinalsWalletConnectSDK(
        logger,
        network
      );
      instance = _HashinalsWalletConnectSDK.instance;
      _HashinalsWalletConnectSDK.proxyInstance = null;
    }
    if (network) {
      instance.setNetwork(network);
    }
    if (!_HashinalsWalletConnectSDK.proxyInstance) {
      _HashinalsWalletConnectSDK.proxyInstance = new Proxy(instance, {
        get(target, prop, receiver) {
          const value = Reflect.get(target, prop, receiver);
          if (typeof value === "function") {
            return value.bind(target);
          }
          return value;
        }
      });
    }
    return _HashinalsWalletConnectSDK.proxyInstance;
  }
  setLogger(logger) {
    this.logger = logger;
  }
  setNetwork(network) {
    this.network = network;
  }
  getNetwork() {
    return this.network;
  }
  setReownAppKit(appKit) {
    this.reownAppKit = appKit;
  }
  async ensureReownAppKit(projectId, metadata, network) {
    if (typeof window === "undefined") {
      return;
    }
    const key = `${projectId}:${network.toString()}`;
    if (this.reownAppKit && this.reownAppKitKey === key) {
      return;
    }
    try {
      let defaultNetwork = HederaChainDefinition.Native.Mainnet;
      if (network.toString() === "testnet") {
        defaultNetwork = HederaChainDefinition.Native.Testnet;
      }
      const hederaNativeAdapter = new HederaAdapter({
        projectId,
        networks: [
          HederaChainDefinition.Native.Mainnet,
          HederaChainDefinition.Native.Testnet
        ],
        namespace: hederaNamespace
      });
      const universalProvider = await HederaProvider.init({
        projectId,
        metadata
      });
      this.reownAppKit = createAppKit({
        adapters: [hederaNativeAdapter],
        universalProvider,
        projectId,
        metadata,
        networks: [
          HederaChainDefinition.Native.Mainnet,
          HederaChainDefinition.Native.Testnet
        ],
        defaultNetwork,
        enableWalletGuide: false,
        enableWallets: true,
        featuredWalletIds: [HASH_PACK_WALLET_ID],
        includeWalletIds: [HASH_PACK_WALLET_ID]
      });
      this.reownAppKitKey = key;
    } catch (e) {
      this.logger.warn("Failed to initialize Reown AppKit", e);
      this.reownAppKit = null;
      this.reownAppKitKey = null;
    }
  }
  setLogLevel(level) {
    if (this.logger instanceof Logger) {
      this.logger.setLogLevel(level);
    }
  }
  async init(projectId, metadata, network, onSessionIframeCreated) {
    const chosenNetwork = network || this.network;
    const isMainnet = chosenNetwork.toString() === "mainnet";
    if (_HashinalsWalletConnectSDK.dAppConnectorInstance) {
      return _HashinalsWalletConnectSDK.dAppConnectorInstance;
    }
    _HashinalsWalletConnectSDK.dAppConnectorInstance = new DAppConnector(
      metadata,
      chosenNetwork,
      projectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [isMainnet ? HederaChainId.Mainnet : HederaChainId.Testnet],
      "debug"
    );
    await _HashinalsWalletConnectSDK.dAppConnectorInstance.init({
      logger: "error"
    });
    await this.ensureReownAppKit(projectId, metadata, chosenNetwork);
    _HashinalsWalletConnectSDK.dAppConnectorInstance.onSessionIframeCreated = (session) => {
      this.logger.info("new session from from iframe", session);
      this.handleNewSession(session);
      if (onSessionIframeCreated) {
        onSessionIframeCreated(session);
      }
    };
    this.logger.info(
      `Hedera Wallet Connect SDK initialized on ${chosenNetwork}`
    );
    return _HashinalsWalletConnectSDK.dAppConnectorInstance;
  }
  async connect(options) {
    this.ensureInitialized();
    const pairingTopic = options?.pairingTopic;
    const appKit = this.reownAppKit;
    if (appKit) {
      const session2 = await this.connectUsingReownAppKit(appKit, pairingTopic);
      this.handleNewSession(session2);
      return session2;
    }
    const session = await this.dAppConnector.openModal(pairingTopic);
    this.handleNewSession(session);
    return session;
  }
  async connectUsingReownAppKit(appKit, pairingTopic) {
    this.ensureInitialized();
    if (!appKit) {
      throw new Error("AppKit instance is required.");
    }
    try {
      return await this.dAppConnector.connect((uri) => {
        void appKit.open({ view: "Connect", uri }).catch((e) => {
          this.logger.error("Failed to open Reown AppKit modal", e);
        });
      }, pairingTopic);
    } finally {
      try {
        await appKit.close();
      } catch (e) {
        this.logger.warn("Failed to close Reown AppKit modal", e);
      }
    }
  }
  async disconnect() {
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
      this.logger.error("Failed to disconnect", e);
      return false;
    }
  }
  async disconnectAll() {
    try {
      this.ensureInitialized();
      await this.dAppConnector?.disconnectAll();
      this.logger.info(`Disconnected from all wallets`);
      return true;
    } catch (e) {
      this.logger.error("Failed to disconnect", e);
      return false;
    }
  }
  async executeTransaction(tx, disableSigner = false) {
    this.ensureInitialized();
    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo?.accountId;
    const signer = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === accountId
    );
    if (!signer) {
      throw new Error("No signer available. Please ensure wallet is connected.");
    }
    try {
      if (!disableSigner) {
        const signedTx = await tx.freezeWithSigner(signer);
        const executedTx2 = await signedTx.executeWithSigner(signer);
        return await executedTx2.getReceiptWithSigner(signer);
      }
      const executedTx = await tx.executeWithSigner(signer);
      return await executedTx.getReceiptWithSigner(signer);
    } catch (e) {
      const message = e.message ?? "";
      if (message.toLowerCase().includes("nodeaccountid")) {
        throw new Error(
          "Transaction execution failed because nodeAccountId is not set. Set node account IDs on the transaction before calling executeTransaction."
        );
      }
      throw e;
    }
  }
  async executeTransactionWithErrorHandling(tx, disableSigner) {
    try {
      const result = await this.executeTransaction(tx, disableSigner);
      return {
        result,
        error: void 0
      };
    } catch (e) {
      const error = e;
      const message = error.message?.toLowerCase();
      this.logger.error("Failed to execute transaction", e);
      this.logger.error("Failure reason for transaction is", message);
      if (message.includes("insufficient payer balance")) {
        return {
          result: void 0,
          error: "Insufficient balance to complete the transaction."
        };
      } else if (message.includes("reject")) {
        return {
          result: void 0,
          error: "You rejected the transaction"
        };
      } else if (message.includes("invalid signature")) {
        return {
          result: void 0,
          error: "Invalid signature. Please check your account and try again."
        };
      } else if (message.includes("transaction expired")) {
        return {
          result: void 0,
          error: "Transaction expired. Please try again."
        };
      } else if (message.includes("account not found")) {
        return {
          result: void 0,
          error: "Account not found. Please check the account ID and try again."
        };
      } else if (message.includes("unauthorized")) {
        return {
          result: void 0,
          error: "Unauthorized. You may not have the necessary permissions for this action."
        };
      } else if (message.includes("busy")) {
        return {
          result: void 0,
          error: "The network is busy. Please try again later."
        };
      } else if (message.includes("invalid transaction")) {
        return {
          result: void 0,
          error: "Invalid transaction. Please check your inputs and try again."
        };
      }
    }
  }
  async submitMessageToTopic(topicId, message, submitKey) {
    this.ensureInitialized();
    let transaction = new TopicMessageSubmitTransaction().setTopicId(TopicId.fromString(topicId)).setMessage(message);
    if (submitKey) {
      transaction = await transaction.sign(submitKey);
    }
    return this.executeTransaction(transaction);
  }
  async transferHbar(fromAccountId, toAccountId, amount) {
    this.ensureInitialized();
    const transaction = new TransferTransaction().setTransactionId(TransactionId.generate(fromAccountId)).addHbarTransfer(AccountId.fromString(fromAccountId), new Hbar(-amount)).addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount));
    return this.executeTransaction(transaction);
  }
  async executeSmartContract(contractId, functionName, parameters, gas = 1e5) {
    this.ensureInitialized();
    const transaction = new ContractExecuteTransaction().setContractId(ContractId.fromString(contractId)).setGas(gas).setFunction(functionName, parameters);
    return this.executeTransaction(transaction);
  }
  handleNewSession(session) {
    const sessionAccount = session.namespaces?.hedera?.accounts?.[0];
    const sessionParts = sessionAccount?.split(":");
    const accountId = sessionParts.pop();
    const network = sessionParts.pop();
    this.logger.info("sessionAccount is", accountId, network);
    if (!accountId) {
      this.logger.error("No account id found in the session");
      return;
    } else {
      this.saveConnectionInfo(accountId, network);
    }
  }
  getNetworkPrefix() {
    const accountInfo = this.getAccountInfo();
    const network = accountInfo?.network;
    if (!network) {
      this.logger.warn("Network is not set on SDK, defaulting.");
      const cachedNetwork = localStorage.getItem("connectedNetwork");
      if (cachedNetwork) {
        return cachedNetwork;
      }
      return "mainnet-public";
    }
    if (network !== this.network) {
      this.logger.warn(
        "Detected network mismatch, reverting to signer network",
        network
      );
      this.network = network;
    }
    return network.isMainnet() ? "mainnet-public" : "testnet";
  }
  async requestAccount(account) {
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
      this.logger.error("Failed to fetch account", e);
      throw e;
    }
  }
  async getAccountBalance() {
    this.ensureInitialized();
    const accountInfo = this.getAccountInfo();
    const account = accountInfo?.accountId;
    if (!account) {
      return null;
    }
    const accountResponse = await this.requestAccount(account);
    if (!accountResponse) {
      throw new Error(
        "Failed to fetch account. Try again or check if the Account ID is valid."
      );
    }
    const balance = accountResponse.balance.balance / 10 ** 8;
    return Number(balance).toLocaleString("en-US");
  }
  getAccountInfo() {
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
      network
    };
  }
  async createTopic(memo, adminKey, submitKey) {
    this.ensureInitialized();
    let transaction = new TopicCreateTransaction().setTopicMemo(memo || "");
    if (adminKey) {
      const adminWithPrivateKey = PrivateKey.fromString(adminKey);
      transaction.setAdminKey(adminWithPrivateKey.publicKey);
      transaction = await transaction.sign(adminWithPrivateKey);
    }
    if (submitKey) {
      transaction.setSubmitKey(PrivateKey.fromString(submitKey).publicKey);
    }
    const receipt = await this.executeTransaction(transaction);
    return receipt.topicId.toString();
  }
  async createToken(name, symbol, initialSupply, decimals, treasuryAccountId, adminKey, supplyKey) {
    this.ensureInitialized();
    let transaction = new TokenCreateTransaction().setTokenName(name).setTokenSymbol(symbol).setDecimals(decimals).setInitialSupply(initialSupply).setTreasuryAccountId(AccountId.fromString(treasuryAccountId)).setTokenType(TokenType.NonFungibleUnique).setSupplyType(TokenSupplyType.Finite);
    if (supplyKey) {
      transaction = transaction.setSupplyKey(PrivateKey.fromString(supplyKey));
    }
    if (adminKey) {
      transaction = transaction.setAdminKey(PrivateKey.fromString(adminKey));
      transaction = await transaction.sign(PrivateKey.fromString(adminKey));
    }
    const receipt = await this.executeTransaction(transaction);
    return receipt.tokenId.toString();
  }
  async mintNFT(tokenId, metadata, supplyKey) {
    this.ensureInitialized();
    let transaction = await new TokenMintTransaction().setTokenId(tokenId).setMetadata([Buffer.from(metadata, "utf-8")]).sign(supplyKey);
    return this.executeTransaction(transaction);
  }
  async getMessages(topicId, lastTimestamp, disableTimestampFilter = false, network) {
    const networkPrefix = network || this.getNetworkPrefix();
    const baseUrl = `https://${networkPrefix}.mirrornode.hedera.com`;
    const timestampQuery = Number(lastTimestamp) > 0 && !disableTimestampFilter ? `&timestamp=gt:${lastTimestamp}` : "";
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
      const collectedMessages = messages.map((msg) => {
        const parsedMessage = JSON.parse(atob(msg.message));
        return {
          ...parsedMessage,
          payer: msg.payer_account_id,
          created: new Date(Number(msg.consensus_timestamp) * 1e3),
          consensus_timestamp: msg.consensus_timestamp,
          sequence_number: msg.sequence_number
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
        error: ""
      };
    } catch (error) {
      this.logger.error("Error fetching topic data:", error);
      return {
        messages: [],
        error: error.toString()
      };
    }
  }
  async signMessage(message) {
    const dAppConnector = this.dAppConnector;
    if (!dAppConnector) {
      throw new Error("No active connection or signer");
    }
    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo?.accountId;
    const params = {
      signerAccountId: `hedera:${this.network}:${accountId}`,
      message
    };
    const result = await dAppConnector.signMessage(
      params
    );
    return { userSignature: result.signatureMap };
  }
  saveConnectionInfo(accountId, connectedNetwork) {
    if (!accountId) {
      localStorage.removeItem("connectedAccountId");
      localStorage.removeItem("connectedNetwork");
    } else {
      const cleanNetwork = connectedNetwork?.replace(/['"]+/g, "");
      localStorage.setItem("connectedNetwork", cleanNetwork);
      localStorage.setItem("connectedAccountId", accountId);
    }
  }
  loadConnectionInfo() {
    return {
      accountId: localStorage.getItem("connectedAccountId"),
      network: localStorage.getItem("connectedNetwork")
    };
  }
  async connectWallet(PROJECT_ID, APP_METADATA, network) {
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
        session
      };
    } catch (error) {
      this.logger.error("Failed to connect wallet:", error);
      throw error;
    }
  }
  async disconnectWallet(clearStorage = true) {
    try {
      const success = await this.disconnect();
      if (success && clearStorage) {
        localStorage.clear();
      }
      this.saveConnectionInfo(void 0);
      return success;
    } catch (error) {
      this.logger.error("Failed to disconnect wallet:", error);
      return false;
    }
  }
  async initAccount(PROJECT_ID, APP_METADATA, networkOverride, onSessionIframeCreated = () => {
  }) {
    const { accountId: savedAccountId, network: savedNetwork } = this.loadConnectionInfo();
    if (savedAccountId && savedNetwork) {
      try {
        const defaultNetwork = savedNetwork === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;
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
          balance
        };
      } catch (error) {
        this.logger.error("Failed to reconnect:", error);
        this.saveConnectionInfo(void 0, void 0);
        return null;
      }
    } else if (networkOverride) {
      try {
        this.logger.info(
          "initializing normally through override.",
          networkOverride
        );
        await this.init(
          PROJECT_ID,
          APP_METADATA,
          networkOverride,
          onSessionIframeCreated
        );
        this.logger.info("initialized", networkOverride);
        await this.connectViaDappBrowser();
        this.logger.info("connected via dapp browser");
      } catch (error) {
        this.logger.error("Failed to fallback connect:", error);
        this.saveConnectionInfo(void 0, void 0);
        return null;
      }
    }
    return null;
  }
  subscribeToExtensions(callback) {
    if (this.extensionCheckInterval) {
      clearInterval(this.extensionCheckInterval);
    }
    this.hasCalledExtensionCallback = false;
    this.extensionCheckInterval = setInterval(() => {
      const extensions = this.dAppConnector?.extensions || [];
      const availableExtension = extensions.find(
        (ext) => ext.availableInIframe
      );
      if (availableExtension && !this.hasCalledExtensionCallback) {
        this.hasCalledExtensionCallback = true;
        callback(availableExtension);
        if (this.extensionCheckInterval) {
          clearInterval(this.extensionCheckInterval);
          this.extensionCheckInterval = null;
        }
      }
    }, 1e3);
    return () => {
      if (this.extensionCheckInterval) {
        clearInterval(this.extensionCheckInterval);
        this.extensionCheckInterval = null;
      }
      this.hasCalledExtensionCallback = false;
    };
  }
  async connectViaDappBrowser() {
    const extensions = this.dAppConnector.extensions || [];
    const extension = extensions.find((ext) => {
      this.logger.info("Checking extension", ext);
      return ext.availableInIframe;
    });
    this.logger.info("extensions are", extensions, extension);
    if (extension) {
      await this.connectToExtension(extension);
    } else {
      this.subscribeToExtensions(async (newExtension) => {
        await this.connectToExtension(newExtension);
      });
    }
  }
  async connectToExtension(extension) {
    this.logger.info("found extension, connecting to iframe.", extension);
    const session = await this.dAppConnector.connectExtension(extension.id);
    const onSessionIframeCreated = this.dAppConnector.onSessionIframeCreated;
    if (onSessionIframeCreated) {
      onSessionIframeCreated(session);
    }
  }
  ensureInitialized() {
    if (!this.dAppConnector) {
      throw new Error("SDK not initialized. Call init() first.");
    }
  }
  static run() {
    try {
      if (typeof window !== "undefined") {
        window.HashinalsWalletConnectSDK = _HashinalsWalletConnectSDK.getInstance();
        window.HashgraphSDK = HashgraphSDK;
      }
    } catch (e) {
      console.error("[ERROR]: failed setting sdk on window");
    }
  }
  async transferToken(tokenId, fromAccountId, toAccountId, amount) {
    this.ensureInitialized();
    const transaction = new TransferTransaction().setTransactionId(TransactionId.generate(fromAccountId)).addTokenTransfer(
      TokenId.fromString(tokenId),
      AccountId.fromString(fromAccountId),
      -amount
    ).addTokenTransfer(
      TokenId.fromString(tokenId),
      AccountId.fromString(toAccountId),
      amount
    );
    return this.executeTransaction(transaction);
  }
  async createAccount(initialBalance) {
    this.ensureInitialized();
    const transaction = new AccountCreateTransaction().setInitialBalance(
      new Hbar(initialBalance)
    );
    return this.executeTransaction(transaction);
  }
  async associateTokenToAccount(accountId, tokenId) {
    this.ensureInitialized();
    const transaction = new TokenAssociateTransaction().setAccountId(AccountId.fromString(accountId)).setTokenIds([TokenId.fromString(tokenId)]);
    return this.executeTransaction(transaction);
  }
  async dissociateTokenFromAccount(accountId, tokenId) {
    this.ensureInitialized();
    const transaction = new TokenDissociateTransaction().setAccountId(AccountId.fromString(accountId)).setTokenIds([TokenId.fromString(tokenId)]);
    return this.executeTransaction(transaction);
  }
  async updateAccount(accountId, maxAutomaticTokenAssociations) {
    this.ensureInitialized();
    const transaction = new AccountUpdateTransaction().setAccountId(AccountId.fromString(accountId)).setMaxAutomaticTokenAssociations(maxAutomaticTokenAssociations);
    return this.executeTransaction(transaction);
  }
  async approveAllowance(spenderAccountId, tokenId, amount, ownerAccountId) {
    this.ensureInitialized();
    const transaction = new AccountAllowanceApproveTransaction().approveTokenAllowance(
      TokenId.fromString(tokenId),
      AccountId.fromString(ownerAccountId),
      AccountId.fromString(spenderAccountId),
      amount
    );
    return this.executeTransaction(transaction);
  }
  async getAccountTokens(accountId) {
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
      const tokens = [];
      for (const token of data.tokens) {
        if (token.token_id) {
          tokens.push({
            tokenId: token.token_id,
            balance: token.balance,
            decimals: token.decimals,
            formatted_balance: (token.balance / 10 ** token.decimals).toLocaleString("en-US"),
            created_timestamp: new Date(Number(token.created_timestamp) * 1e3)
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
              formatted_balance: (token.balance / 10 ** token.decimals).toLocaleString("en-US"),
              created_timestamp: new Date(
                Number(token.created_timestamp) * 1e3
              )
            });
          }
        }
        nextLink = nextData.links?.next;
      }
      return { tokens };
    } catch (error) {
      this.logger.error("Error fetching account tokens:", error);
      throw error;
    }
  }
  async getTransaction(transactionId) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/transactions/${transactionId}`;
      this.logger.debug("Fetching transaction", url);
      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(`Failed to fetch transaction: ${request.status}`);
      }
      return await request.json();
    } catch (e) {
      this.logger.error("Failed to get transaction", e);
      return null;
    }
  }
  async getTransactionByTimestamp(timestamp) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/transactions?timestamp=${timestamp}`;
      this.logger.debug("Fetching transaction by timestamp", url);
      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(
          `Failed to fetch transaction by timestamp: ${request.status}`
        );
      }
      const response = await request.json();
      const transaction = response?.transactions?.[0];
      if (transaction) {
        return await this.getTransaction(transaction.transaction_id);
      }
      return null;
    } catch (e) {
      this.logger.error("Failed to get transaction by timestamp", e);
      return null;
    }
  }
  async getAccountNFTs(accountId, tokenId) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const tokenQuery = tokenId ? `&token.id=${tokenId}` : "";
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts?limit=200${tokenQuery}`;
      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(`Failed to fetch NFTs for account: ${request.status}`);
      }
      const response = await request.json();
      let nextLink = response?.links?.next || null;
      let nfts = response.nfts || [];
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
          const nextResponse = await nextRequest.json();
          const nextNfts = nextResponse?.nfts || [];
          nfts = [...nfts, ...nextNfts];
          nextLink = nextResponse?.links?.next && nextLink !== nextResponse?.links?.next ? nextResponse.links.next : null;
        } catch (e) {
          this.logger.error("Failed to fetch next page of NFTs", e);
          break;
        }
      }
      return nfts.map((nft) => {
        try {
          nft.token_uri = Buffer.from(nft.metadata, "base64").toString("ascii");
        } catch (e) {
          this.logger.error("Failed to decode NFT metadata", e);
        }
        return nft;
      });
    } catch (e) {
      this.logger.error("Failed to get account NFTs", e);
      return [];
    }
  }
  async validateNFTOwnership(serialNumber, accountId, tokenId) {
    const userNFTs = await this.getAccountNFTs(accountId, tokenId);
    return userNFTs.find(
      (nft) => nft.token_id === tokenId && nft.serial_number.toString() === serialNumber
    ) || null;
  }
  async readSmartContract(data, fromAccount, contractId, estimate = true, value = 0) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const body = {
        block: "latest",
        data,
        estimate,
        from: fromAccount.toSolidityAddress(),
        to: contractId.toSolidityAddress(),
        value
      };
      if (!estimate) {
        body.gas = 3e5;
        body.gasPrice = 1e8;
      }
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/contracts/call`;
      const response = await fetchWithRetry()(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to make contract call: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      this.logger.error("Failed to make contract call", e);
      return null;
    }
  }
};
_HashinalsWalletConnectSDK.proxyInstance = null;
let HashinalsWalletConnectSDK = _HashinalsWalletConnectSDK;
export {
  HashgraphSDK,
  HashinalsWalletConnectSDK,
  Name,
  Result,
  base64StringToSignatureMap,
  prefixMessageToSign,
  verifyMessageSignature
};
//# sourceMappingURL=index.js.map
