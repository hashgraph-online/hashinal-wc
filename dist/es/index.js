import { Buffer } from "buffer";
import * as HashgraphSDK from "@hashgraph/sdk";
import { LedgerId, TopicMessageSubmitTransaction, TopicId, TransferTransaction, TransactionId, AccountId, Hbar, ContractExecuteTransaction, ContractId, TopicCreateTransaction, PrivateKey, TokenCreateTransaction, TokenType, TokenSupplyType, TokenMintTransaction, TokenId, AccountCreateTransaction, TokenAssociateTransaction, TokenDissociateTransaction, AccountUpdateTransaction, AccountAllowanceApproveTransaction } from "@hashgraph/sdk";
import { createAppKit } from "@reown/appkit";
import { HederaChainDefinition, HederaAdapter, hederaNamespace, HederaProvider, DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId, extensionOpen } from "@hashgraph/hedera-wallet-connect";
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
const HASHPACK_EXTENSION_ID = "gjagmgiddbbciopjhllkdnddhcglnemk";
const HASHPACK_DEEP_LINK = "https://link.hashpack.app";
const HASHPACK_STORE_URLS = {
  ios: "https://apps.apple.com/app/hashpack/id1646514851",
  android: "https://play.google.com/store/apps/details?id=app.hashpack.wallet",
  fallback: "https://www.hashpack.app/"
};
const WALLET_RETURN_URL_KEY = "hashinal_wc_return_url";
function isMobileDevice() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || "";
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}
function isIOSDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}
function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent.toLowerCase());
}
function getHashPackDeepLink(wcUri) {
  if (wcUri) {
    return `${HASHPACK_DEEP_LINK}/wc?uri=${encodeURIComponent(wcUri)}`;
  }
  return `${HASHPACK_DEEP_LINK}/wc`;
}
function getHashPackStoreUrl() {
  if (isIOSDevice()) return HASHPACK_STORE_URLS.ios;
  if (isAndroidDevice()) return HASHPACK_STORE_URLS.android;
  return HASHPACK_STORE_URLS.fallback;
}
function patchSignersWithExtensionId(dAppConnector, extensionId = HASHPACK_EXTENSION_ID) {
  if (!dAppConnector?.signers?.length) return;
  if (isMobileDevice()) return;
  for (const signer of dAppConnector.signers) {
    if (!signer.extensionId) {
      signer.extensionId = extensionId;
    }
  }
}
async function openHashPackOnMobile(wcUri) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    sessionStorage.setItem(WALLET_RETURN_URL_KEY, window.location.href);
  } catch {
  }
  const deepLink = getHashPackDeepLink(wcUri);
  const anchor = document.createElement("a");
  anchor.href = deepLink;
  anchor.style.display = "none";
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer");
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  await new Promise((resolve) => setTimeout(resolve, 500));
}
let windowOpenPatched = false;
let originalWindowOpen = null;
function patchWindowOpenForMobileWalletLinks() {
  if (windowOpenPatched) return;
  if (typeof window === "undefined") return;
  try {
    originalWindowOpen = window.open.bind(window);
    window.open = function(url, target, features) {
      const urlString = url?.toString() || "";
      const isWalletDeepLink = urlString.includes("link.hashpack.app") || urlString.includes("wallet.hashpack.app") || urlString.includes("wc?uri=");
      if (isMobileDevice() && isWalletDeepLink && (target === "_self" || target === "_top")) {
        try {
          sessionStorage.setItem(WALLET_RETURN_URL_KEY, window.location.href);
        } catch {
        }
        try {
          const newWindow = originalWindowOpen(urlString, "_blank", "noopener,noreferrer");
          if (newWindow) {
            return newWindow;
          }
        } catch {
        }
        try {
          const anchor = document.createElement("a");
          anchor.href = urlString;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.style.cssText = "position:fixed;top:-9999px;left:-9999px;";
          document.body.appendChild(anchor);
          const clickEvent = new MouseEvent("click", {
            view: window,
            bubbles: true,
            cancelable: true
          });
          anchor.dispatchEvent(clickEvent);
          setTimeout(() => {
            try {
              document.body.removeChild(anchor);
            } catch {
            }
          }, 100);
          return null;
        } catch {
        }
        window.location.href = urlString;
        return null;
      }
      return originalWindowOpen(url, target, features);
    };
    windowOpenPatched = true;
  } catch {
  }
}
function checkWalletReturnUrl() {
  if (typeof window === "undefined") return null;
  try {
    const returnUrl = sessionStorage.getItem(WALLET_RETURN_URL_KEY);
    if (returnUrl) {
      sessionStorage.removeItem(WALLET_RETURN_URL_KEY);
      return returnUrl;
    }
  } catch {
  }
  return null;
}
const _HashinalsWalletConnectSDK = class _HashinalsWalletConnectSDK {
  constructor(logger, network) {
    this.reownAppKit = null;
    this.reownAppKitKey = null;
    this.extensionCheckInterval = null;
    this.hasCalledExtensionCallback = false;
    this.useAppKit = false;
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
      const isTestnet = network.toString() === "testnet";
      const defaultNetwork = isTestnet ? HederaChainDefinition.Native.Testnet : HederaChainDefinition.Native.Mainnet;
      const nativeHederaAdapter = new HederaAdapter({
        projectId,
        networks: isTestnet ? [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet] : [HederaChainDefinition.Native.Mainnet, HederaChainDefinition.Native.Testnet],
        namespace: hederaNamespace
      });
      const eip155HederaAdapter = new HederaAdapter({
        projectId,
        networks: isTestnet ? [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet] : [HederaChainDefinition.EVM.Mainnet, HederaChainDefinition.EVM.Testnet],
        namespace: "eip155"
      });
      const providerOpts = {
        projectId,
        metadata,
        optionalNamespaces: {
          eip155: {
            methods: [
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTypedData",
              "eth_signTypedData_v4",
              "eth_accounts",
              "eth_chainId"
            ],
            chains: isTestnet ? ["eip155:296", "eip155:295"] : ["eip155:295", "eip155:296"],
            events: ["chainChanged", "accountsChanged"],
            rpcMap: {
              "eip155:296": "https://testnet.hashio.io/api",
              "eip155:295": "https://mainnet.hashio.io/api"
            }
          },
          hedera: {
            methods: [
              "hedera_getNodeAddresses",
              "hedera_executeTransaction",
              "hedera_signMessage",
              "hedera_signAndExecuteQuery",
              "hedera_signAndExecuteTransaction",
              "hedera_signTransaction"
            ],
            chains: isTestnet ? ["hedera:testnet", "hedera:mainnet"] : ["hedera:mainnet", "hedera:testnet"],
            events: ["chainChanged", "accountsChanged"]
          }
        }
      };
      const universalProvider = await HederaProvider.init(providerOpts);
      this.reownAppKit = createAppKit({
        adapters: [nativeHederaAdapter, eip155HederaAdapter],
        universalProvider,
        projectId,
        metadata,
        networks: [
          HederaChainDefinition.Native.Mainnet,
          HederaChainDefinition.Native.Testnet,
          HederaChainDefinition.EVM.Mainnet,
          HederaChainDefinition.EVM.Testnet
        ],
        defaultNetwork,
        enableWalletGuide: true,
        enableWallets: true,
        enableReconnect: true,
        enableWalletConnect: false,
        allWallets: "HIDE",
        featuredWalletIds: [HASH_PACK_WALLET_ID],
        features: {
          analytics: true,
          socials: false,
          swaps: false,
          onramp: false,
          email: false
        },
        themeVariables: {
          "--w3m-accent": "#5599fe"
        },
        chainImages: {
          "hedera:testnet": "https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw",
          "hedera:mainnet": "https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw",
          "eip155:296": "https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw",
          "eip155:295": "https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw"
        },
        termsConditionsUrl: metadata.url ? `${metadata.url}/legal/terms` : void 0,
        privacyPolicyUrl: metadata.url ? `${metadata.url}/legal/privacy` : void 0
      });
      this.reownAppKitKey = key;
      patchWindowOpenForMobileWalletLinks();
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
  async init(projectId, metadata, network, onSessionIframeCreated, options) {
    patchWindowOpenForMobileWalletLinks();
    this.useAppKit = options?.useAppKit ?? false;
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
    if (this.useAppKit) {
      await this.ensureReownAppKit(projectId, metadata, chosenNetwork);
    }
    _HashinalsWalletConnectSDK.dAppConnectorInstance.onSessionIframeCreated = (session) => {
      this.logger.info("new session from from iframe", session);
      this.handleNewSession(session);
      patchSignersWithExtensionId(_HashinalsWalletConnectSDK.dAppConnectorInstance);
      if (onSessionIframeCreated) {
        onSessionIframeCreated(session);
      }
    };
    this.logger.info(
      `Hedera Wallet Connect SDK initialized on ${chosenNetwork}`
    );
    patchSignersWithExtensionId(_HashinalsWalletConnectSDK.dAppConnectorInstance);
    return _HashinalsWalletConnectSDK.dAppConnectorInstance;
  }
  async connect(options) {
    this.ensureInitialized();
    const pairingTopic = options?.pairingTopic;
    const appKit = this.useAppKit ? this.reownAppKit : null;
    if (appKit) {
      const session2 = await this.connectUsingReownAppKit(
        appKit,
        pairingTopic,
        options?.onUri
      );
      this.handleNewSession(session2);
      patchSignersWithExtensionId(this.dAppConnector);
      return session2;
    }
    const availableExtension = this.getAvailableDesktopExtension();
    if (availableExtension?.id) {
      this.logger.info("Desktop extension available, connecting directly...");
      try {
        const session2 = await this.dAppConnector.connectExtension(
          availableExtension.id,
          pairingTopic
        );
        this.handleNewSession(session2);
        patchSignersWithExtensionId(this.dAppConnector);
        return session2;
      } catch (e) {
        this.logger.warn("Direct extension connection failed, falling back to modal", e);
      }
    }
    if (isMobileDevice()) {
      this.logger.info("Mobile device detected, using HashPack deep link...");
      const session2 = await this.dAppConnector.connect(
        (uri) => {
          openHashPackOnMobile(uri);
        },
        pairingTopic,
        void 0
      );
      this.handleNewSession(session2);
      patchSignersWithExtensionId(this.dAppConnector);
      return session2;
    }
    this.logger.info("Opening DAppConnector modal...");
    const session = await this.dAppConnector.openModal(pairingTopic);
    this.handleNewSession(session);
    patchSignersWithExtensionId(this.dAppConnector);
    return session;
  }
  async connectUsingReownAppKit(appKit, pairingTopic, onUri) {
    this.ensureInitialized();
    if (!appKit) {
      throw new Error("AppKit instance is required.");
    }
    const availableExtension = this.getAvailableDesktopExtension();
    if (availableExtension?.id) {
      this.logger.info("Desktop extension available, connecting directly...");
      try {
        const session = await this.dAppConnector.connectExtension(
          availableExtension.id,
          pairingTopic
        );
        return session;
      } catch (e) {
        this.logger.warn(
          "Direct extension connection failed, falling back to AppKit modal",
          e
        );
      }
    }
    if (isMobileDevice()) {
      this.logger.info("Mobile device detected, using HashPack deep link...");
      return await this.dAppConnector.connect(
        (uri) => {
          openHashPackOnMobile(uri);
        },
        pairingTopic,
        void 0
      );
    }
    this.logger.info("Desktop without extension, opening AppKit Connect modal...");
    await appKit.open({ view: "Connect" });
    return new Promise((resolve, reject) => {
      let resolved = false;
      const checkInterval = setInterval(() => {
        const signers = this.dAppConnector?.signers || [];
        if (signers.length > 0) {
          const session = this.dAppConnector?.walletConnectClient?.session?.getAll()?.[0];
          if (session && !resolved) {
            resolved = true;
            clearInterval(checkInterval);
            void appKit.close().catch(() => {
            });
            resolve(session);
          }
        }
      }, 500);
      setTimeout(() => {
        if (!resolved) {
          clearInterval(checkInterval);
          void appKit.close().catch(() => {
          });
          reject(new Error("Connection timeout - no wallet connected"));
        }
      }, 5 * 60 * 1e3);
      const unsubscribe = appKit.subscribeState?.((state) => {
        if (state.open === false && !resolved) {
          clearInterval(checkInterval);
          unsubscribe?.();
          reject(new Error("Connection cancelled - modal closed"));
        }
      });
    });
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
  /**
   * Triggers the browser extension popup for signing on desktop.
   * This is needed when the signer doesn't have an extensionId set
   * (e.g., when connecting via the Reown AppKit modal).
   */
  triggerExtensionPopupIfNeeded() {
    if (isMobileDevice()) {
      return;
    }
    const availableExtension = this.getAvailableDesktopExtension();
    if (availableExtension) {
      this.logger.debug(
        "Triggering extension popup for signing",
        availableExtension.id
      );
      extensionOpen(availableExtension.id);
    }
  }
  /**
   * Gets the available desktop browser extension (e.g., HashPack).
   * Returns undefined if no extension is available or on mobile devices.
   */
  getAvailableDesktopExtension() {
    if (isMobileDevice()) {
      return void 0;
    }
    const extensions = this.dAppConnector?.extensions || [];
    return extensions.find((ext) => ext.available && !ext.availableInIframe);
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
    if (isMobileDevice()) {
      this.logger.info("Mobile device detected, opening HashPack app for transaction signing...");
      await openHashPackOnMobile();
    } else if (!signer.extensionId) {
      this.triggerExtensionPopupIfNeeded();
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
  /**
   * Sign a message with the connected wallet.
   * On mobile devices, this will automatically open the HashPack app
   * to prompt the user to sign the message.
   * 
   * @param message - The message to sign
   * @param options - Optional configuration for signing
   * @param options.openWalletOnMobile - Whether to open the wallet app on mobile (default: true)
   * @param options.onMobileRedirect - Callback before redirecting to wallet on mobile
   */
  async signMessage(message, options) {
    const dAppConnector = this.dAppConnector;
    if (!dAppConnector) {
      throw new Error("No active connection or signer");
    }
    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo?.accountId;
    if (!accountId) {
      throw new Error("No account connected. Please connect your wallet first.");
    }
    const params = {
      signerAccountId: `hedera:${this.network}:${accountId}`,
      message
    };
    const shouldOpenWallet = options?.openWalletOnMobile !== false;
    if (shouldOpenWallet && isMobileDevice()) {
      this.logger.info("Mobile device detected, opening HashPack app for signing...");
      options?.onMobileRedirect?.();
      await openHashPackOnMobile();
    } else if (!isMobileDevice()) {
      this.triggerExtensionPopupIfNeeded();
    }
    try {
      const result = await dAppConnector.signMessage(
        params
      );
      return { userSignature: result.signatureMap };
    } catch (error) {
      if (isMobileDevice()) {
        const originalError = error.message || String(error);
        if (originalError.toLowerCase().includes("timeout") || originalError.toLowerCase().includes("reject") || originalError.toLowerCase().includes("user")) {
          throw new Error(
            `Signing failed. Please make sure HashPack is open and try again. (${originalError})`
          );
        }
      }
      throw error;
    }
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
  async connectWallet(PROJECT_ID, APP_METADATA, network, options) {
    try {
      await this.init(PROJECT_ID, APP_METADATA, network, void 0, { useAppKit: options?.useAppKit });
      const session = await this.connect({ onUri: options?.onUri });
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
  }, options) {
    const { accountId: savedAccountId, network: savedNetwork } = this.loadConnectionInfo();
    if (savedAccountId && savedNetwork) {
      try {
        const defaultNetwork = savedNetwork === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;
        const network = networkOverride || defaultNetwork;
        await this.init(
          PROJECT_ID,
          APP_METADATA,
          network,
          onSessionIframeCreated,
          { useAppKit: options?.useAppKit }
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
          onSessionIframeCreated,
          { useAppKit: options?.useAppKit }
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
  checkWalletReturnUrl,
  getHashPackStoreUrl,
  isAndroidDevice,
  isIOSDevice,
  isMobileDevice,
  openHashPackOnMobile,
  prefixMessageToSign,
  verifyMessageSignature
};
//# sourceMappingURL=index.js.map
