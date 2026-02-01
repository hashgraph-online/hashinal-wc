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
import { createAppKit } from '@reown/appkit';
import type { AppKit } from '@reown/appkit';
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaAdapter,
  HederaChainDefinition,
  HederaChainId,
  hederaNamespace,
  HederaProvider,
  SignMessageResult,
  extensionOpen,
  ExtensionData,
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

const HASH_PACK_WALLET_ID =
  'a29498d225fa4b13468ff4d6cf4ae0ea4adcbd95f07ce8a843a1dee10b632f3f';

/**
 * Well-known HashPack browser extension ID.
 * Used to trigger the extension popup for signing when the signer doesn't have an extensionId.
 */
const HASHPACK_EXTENSION_ID = 'gjagmgiddbbciopjhllkdnddhcglnemk';

/**
 * HashPack deep link for mobile wallet connection
 * 
 * IMPORTANT: HashPack only supports the universal link format (https://link.hashpack.app).
 * The hashpack:// custom scheme does not exist and will not work.
 */
const HASHPACK_DEEP_LINK = 'https://link.hashpack.app';

/**
 * HashPack app store URLs for fallback when app is not installed
 */
const HASHPACK_STORE_URLS = {
  ios: 'https://apps.apple.com/app/hashpack/id1646514851',
  android: 'https://play.google.com/store/apps/details?id=app.hashpack.wallet',
  fallback: 'https://www.hashpack.app/',
} as const;

/**
 * Key for storing the return URL in sessionStorage.
 */
const WALLET_RETURN_URL_KEY = 'hashinal_wc_return_url';

/**
 * Detect if current device is mobile
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
}

/**
 * Detect if device is iOS
 */
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent.toLowerCase());
}

/**
 * Detect if device is Android
 */
function isAndroidDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent.toLowerCase());
}

/**
 * Get the HashPack deep link for WalletConnect connections.
 * Uses the universal link format (https://link.hashpack.app) which is the only
 * supported deep link format for HashPack.
 */
function getHashPackDeepLink(wcUri?: string): string {
  if (wcUri) {
    return `${HASHPACK_DEEP_LINK}/wc?uri=${encodeURIComponent(wcUri)}`;
  }
  
  return `${HASHPACK_DEEP_LINK}/wc`;
}

/**
 * Get the appropriate app store URL for the current platform
 */
function getHashPackStoreUrl(): string {
  if (isIOSDevice()) return HASHPACK_STORE_URLS.ios;
  if (isAndroidDevice()) return HASHPACK_STORE_URLS.android;
  return HASHPACK_STORE_URLS.fallback;
}

/**
 * Patches all signers in the DAppConnector to have the HashPack extensionId set.
 * 
 * This ensures that when DAppSigner.request() is called, it will automatically
 * trigger extensionOpen() to open the HashPack browser extension popup.
 * 
 * The extensionId property is readonly in TypeScript but can be assigned at runtime
 * since JavaScript doesn't enforce readonly constraints.
 * 
 * @param dAppConnector - The DAppConnector instance with signers to patch
 * @param extensionId - The extension ID to set (defaults to HashPack)
 */
function patchSignersWithExtensionId(
  dAppConnector: DAppConnector | null,
  extensionId: string = HASHPACK_EXTENSION_ID
): void {
  if (!dAppConnector?.signers?.length) return;
  if (isMobileDevice()) return;
  
  for (const signer of dAppConnector.signers) {
    if (!signer.extensionId) {
      // TypeScript says extensionId is readonly, but JavaScript allows assignment
      (signer as any).extensionId = extensionId;
    }
  }
}

/**
 * Open HashPack app on mobile device.
 * Used primarily for sign requests after a connection is already established.
 * 
 * Uses a hidden anchor element to trigger the deep link without navigating
 * away from the current page. This ensures users can return to the dApp
 * after signing in the wallet.
 * 
 * @param wcUri - Optional WalletConnect URI to pass to HashPack
 */
async function openHashPackOnMobile(wcUri?: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  try {
    sessionStorage.setItem(WALLET_RETURN_URL_KEY, window.location.href);
  } catch {
    /* sessionStorage not available */
  }

  const deepLink = getHashPackDeepLink(wcUri);
  
  const anchor = document.createElement('a');
  anchor.href = deepLink;
  anchor.style.display = 'none';
  anchor.setAttribute('target', '_blank');
  anchor.setAttribute('rel', 'noopener noreferrer');
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Flag to track if window.open has been patched for mobile wallet deep links.
 * We only want to patch once per page load.
 */
let windowOpenPatched = false;

/**
 * Original window.open reference, stored before patching.
 */
let originalWindowOpen: typeof window.open | null = null;

/**
 * Patch window.open to prevent mobile wallet deep links from navigating away
 * from the current page.
 * 
 * On mobile browsers, opening wallet deep links typically navigates the current
 * page away. This patch intercepts those calls and:
 * 
 * 1. Saves the current URL to sessionStorage before any navigation
 * 2. Attempts to open the deep link in a way that preserves the current page
 * 3. Falls back to direct navigation if needed, but with saved state for recovery
 * 
 * The dApp should check for the return URL on page load and restore if needed.
 */
function patchWindowOpenForMobileWalletLinks(): void {
  if (windowOpenPatched) return;
  if (typeof window === 'undefined') return;
  
  try {
    originalWindowOpen = window.open.bind(window);
    
    window.open = function(
      url?: string | URL,
      target?: string,
      features?: string
    ): WindowProxy | null {
      const urlString = url?.toString() || '';
      const isWalletDeepLink = urlString.includes('link.hashpack.app') || 
                               urlString.includes('wallet.hashpack.app') ||
                               urlString.includes('wc?uri=');
      
      if (isMobileDevice() && isWalletDeepLink && (target === '_self' || target === '_top')) {
        try {
          sessionStorage.setItem(WALLET_RETURN_URL_KEY, window.location.href);
        } catch {
          /* sessionStorage not available */
        }
        
        try {
          const newWindow = originalWindowOpen!(urlString, '_blank', 'noopener,noreferrer');
          if (newWindow) {
            return newWindow;
          }
        } catch {
          /* _blank failed, try alternative */
        }
        
        try {
          const anchor = document.createElement('a');
          anchor.href = urlString;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
          document.body.appendChild(anchor);
          
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          anchor.dispatchEvent(clickEvent);
          
          setTimeout(() => {
            try { document.body.removeChild(anchor); } catch { /* ignore */ }
          }, 100);
          
          return null;
        } catch {
          /* anchor approach failed */
        }
        
        window.location.href = urlString;
        return null;
      }
      
      return originalWindowOpen!(url, target, features);
    };
    
    windowOpenPatched = true;
  } catch {
    /* Patch failed silently - fallback to default behavior */
  }
}

/**
 * Check if there's a saved return URL from a wallet connection attempt.
 * If found, returns the URL and clears it from storage.
 * 
 * dApps should call this on page load and redirect if a URL is returned.
 */
function checkWalletReturnUrl(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const returnUrl = sessionStorage.getItem(WALLET_RETURN_URL_KEY);
    if (returnUrl) {
      sessionStorage.removeItem(WALLET_RETURN_URL_KEY);
      return returnUrl;
    }
  } catch {
    /* sessionStorage not available */
  }
  
  return null;
}

/**
 * Remove the window.open patch (for cleanup if needed)
 */
function unpatchWindowOpen(): void {
  if (!windowOpenPatched || !originalWindowOpen) return;
  if (typeof window === 'undefined') return;
  
  try {
    window.open = originalWindowOpen;
    windowOpenPatched = false;
    originalWindowOpen = null;
  } catch {
    /* Unpatch failed silently */
  }
}

class HashinalsWalletConnectSDK {
  private static instance: HashinalsWalletConnectSDK;
  private static dAppConnectorInstance: DAppConnector;
  private static proxyInstance: HashinalsWalletConnectSDK | null = null;
  private logger: Logger;
  private network: LedgerId;
  private reownAppKit: AppKit | null = null;
  private reownAppKitKey: string | null = null;
  private extensionCheckInterval: NodeJS.Timeout | null = null;
  private hasCalledExtensionCallback: boolean = false;
  private useAppKit: boolean = false;

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

  public setReownAppKit(appKit: AppKit | null): void {
    this.reownAppKit = appKit;
  }

  private async ensureReownAppKit(
    projectId: string,
    metadata: SignClientTypes.Metadata,
    network: LedgerId
  ): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const key = `${projectId}:${network.toString()}`;
    if (this.reownAppKit && this.reownAppKitKey === key) {
      return;
    }

    try {
      const isTestnet = network.toString() === 'testnet';
      const defaultNetwork = isTestnet
        ? HederaChainDefinition.Native.Testnet
        : HederaChainDefinition.Native.Mainnet;

      /**
       * Create two adapters following hedera-app pattern:
       * 1. Native Hedera adapter (hederaNamespace)
       * 2. EIP155 adapter for EVM compatibility
       */
      const nativeHederaAdapter = new HederaAdapter({
        projectId,
        networks: isTestnet
          ? [HederaChainDefinition.Native.Testnet, HederaChainDefinition.Native.Mainnet]
          : [HederaChainDefinition.Native.Mainnet, HederaChainDefinition.Native.Testnet],
        namespace: hederaNamespace,
      });

      const eip155HederaAdapter = new HederaAdapter({
        projectId,
        networks: isTestnet
          ? [HederaChainDefinition.EVM.Testnet, HederaChainDefinition.EVM.Mainnet]
          : [HederaChainDefinition.EVM.Mainnet, HederaChainDefinition.EVM.Testnet],
        namespace: 'eip155',
      });

      /**
       * Create universal provider with optionalNamespaces
       * Following hedera-app pattern - HashPack only uses the first chain in the list
       */
      const providerOpts = {
        projectId,
        metadata,
        optionalNamespaces: {
          eip155: {
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction',
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4',
              'eth_accounts',
              'eth_chainId',
            ],
            chains: isTestnet
              ? ['eip155:296', 'eip155:295']
              : ['eip155:295', 'eip155:296'],
            events: ['chainChanged', 'accountsChanged'],
            rpcMap: {
              'eip155:296': 'https://testnet.hashio.io/api',
              'eip155:295': 'https://mainnet.hashio.io/api',
            },
          },
          hedera: {
            methods: [
              'hedera_getNodeAddresses',
              'hedera_executeTransaction',
              'hedera_signMessage',
              'hedera_signAndExecuteQuery',
              'hedera_signAndExecuteTransaction',
              'hedera_signTransaction',
            ],
            chains: isTestnet
              ? ['hedera:testnet', 'hedera:mainnet']
              : ['hedera:mainnet', 'hedera:testnet'],
            events: ['chainChanged', 'accountsChanged'],
          },
        },
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
          HederaChainDefinition.EVM.Testnet,
        ],
        defaultNetwork,
        enableWalletGuide: true,
        enableWallets: true,
        enableReconnect: true,
        enableWalletConnect: false,
        allWallets: 'HIDE',
        featuredWalletIds: [HASH_PACK_WALLET_ID],
        features: {
          analytics: true,
          socials: false,
          swaps: false,
          onramp: false,
          email: false,
        },
        themeVariables: {
          '--w3m-accent': '#5599fe',
        },
        chainImages: {
          'hedera:testnet': 'https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw',
          'hedera:mainnet': 'https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw',
          'eip155:296': 'https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw',
          'eip155:295': 'https://arweave.net/mBqmJSvl4wGWbUv3XbMHmwpjlVzO2zZCY9xPQWMwBxw',
        },
        termsConditionsUrl: metadata.url ? `${metadata.url}/legal/terms` : undefined,
        privacyPolicyUrl: metadata.url ? `${metadata.url}/legal/privacy` : undefined,
      }) as AppKit;
      this.reownAppKitKey = key;
      
      patchWindowOpenForMobileWalletLinks();
    } catch (e) {
      this.logger.warn('Failed to initialize Reown AppKit', e);
      this.reownAppKit = null;
      this.reownAppKitKey = null;
    }
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
    onSessionIframeCreated?: (session: SessionTypes.Struct) => void,
    options?: { useAppKit?: boolean }
  ): Promise<DAppConnector> {
    patchWindowOpenForMobileWalletLinks();
    
    // Store useAppKit preference (default false for simple HashPack-only modal)
    this.useAppKit = options?.useAppKit ?? false;
    
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

    // Only initialize AppKit if explicitly requested (for MetaMask/EVM wallet support)
    if (this.useAppKit) {
      await this.ensureReownAppKit(projectId, metadata, chosenNetwork);
    }

    HashinalsWalletConnectSDK.dAppConnectorInstance.onSessionIframeCreated = (
      session
    ) => {
      this.logger.info('new session from from iframe', session);
      this.handleNewSession(session);
      // Patch signers created from iframe session
      patchSignersWithExtensionId(HashinalsWalletConnectSDK.dAppConnectorInstance);
      if (onSessionIframeCreated) {
        onSessionIframeCreated(session);
      }
    };

    this.logger.info(
      `Hedera Wallet Connect SDK initialized on ${chosenNetwork}`
    );
    
    // Patch any restored session signers to have extensionId for desktop extension popup
    patchSignersWithExtensionId(HashinalsWalletConnectSDK.dAppConnectorInstance);
    
    return HashinalsWalletConnectSDK.dAppConnectorInstance;
  }

  public async connect(options?: {
    pairingTopic?: string;
    onUri?: (uri: string) => void;
  }): Promise<SessionTypes.Struct> {
    this.ensureInitialized();
    const pairingTopic = options?.pairingTopic;
    
    // If AppKit is enabled and available, use it (for MetaMask/EVM wallet support)
    const appKit = this.useAppKit ? this.reownAppKit : null;
    if (appKit) {
      const session = await this.connectUsingReownAppKit(
        appKit,
        pairingTopic,
        options?.onUri
      );
      this.handleNewSession(session);
      patchSignersWithExtensionId(this.dAppConnector);
      return session;
    }

    // Simple HashPack-only flow (default)
    const availableExtension = this.getAvailableDesktopExtension();
    
    // Desktop with extension: connect directly
    if (availableExtension?.id) {
      this.logger.info('Desktop extension available, connecting directly...');
      try {
        const session = await this.dAppConnector.connectExtension(
          availableExtension.id,
          pairingTopic
        );
        this.handleNewSession(session);
        patchSignersWithExtensionId(this.dAppConnector);
        return session;
      } catch (e) {
        this.logger.warn('Direct extension connection failed, falling back to modal', e);
      }
    }

    // Mobile: use deep link to HashPack
    if (isMobileDevice()) {
      this.logger.info('Mobile device detected, using HashPack deep link...');
      const session = await this.dAppConnector.connect(
        (uri) => {
          openHashPackOnMobile(uri);
        },
        pairingTopic,
        undefined
      );
      this.handleNewSession(session);
      patchSignersWithExtensionId(this.dAppConnector);
      return session;
    }

    // Desktop without extension: use DAppConnector's built-in modal
    this.logger.info('Opening DAppConnector modal...');
    const session = await this.dAppConnector.openModal(pairingTopic);
    this.handleNewSession(session);
    patchSignersWithExtensionId(this.dAppConnector);
    return session;
  }

  private async connectUsingReownAppKit(
    appKit: AppKit,
    pairingTopic?: string,
    onUri?: (uri: string) => void
  ): Promise<SessionTypes.Struct> {
    this.ensureInitialized();
    if (!appKit) {
      throw new Error('AppKit instance is required.');
    }

    const availableExtension = this.getAvailableDesktopExtension();

    // Desktop with extension available: connect directly without modal
    if (availableExtension?.id) {
      this.logger.info('Desktop extension available, connecting directly...');
      try {
        const session = await this.dAppConnector.connectExtension(
          availableExtension.id,
          pairingTopic
        );
        return session;
      } catch (e) {
        this.logger.warn(
          'Direct extension connection failed, falling back to AppKit modal',
          e
        );
        // Fall through to AppKit modal
      }
    }

    // Mobile: deep link to HashPack directly
    if (isMobileDevice()) {
      this.logger.info('Mobile device detected, using HashPack deep link...');
      return await this.dAppConnector.connect(
        (uri) => {
          openHashPackOnMobile(uri);
        },
        pairingTopic,
        undefined
      );
    }

    /**
     * Desktop without extension: Use AppKit's native connect flow
     * Following hedera-app pattern - let AppKit handle the entire UX
     */
    this.logger.info('Desktop without extension, opening AppKit Connect modal...');

    // Open AppKit's native connect modal with hedera namespace
    // This provides a clean UX with wallet selection, QR code, etc.
    await appKit.open({ view: 'Connect' });

    // Wait for the connection to be established
    // AppKit will handle showing QR codes, wallet selection, etc.
    return new Promise<SessionTypes.Struct>((resolve, reject) => {
      let resolved = false;
      const checkInterval = setInterval(() => {
        // Check if we have a new session
        const signers = this.dAppConnector?.signers || [];
        if (signers.length > 0) {
          const session = this.dAppConnector?.walletConnectClient?.session?.getAll()?.[0];
          if (session && !resolved) {
            resolved = true;
            clearInterval(checkInterval);
            void appKit.close().catch(() => {});
            resolve(session);
          }
        }
      }, 500);

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!resolved) {
          clearInterval(checkInterval);
          void appKit.close().catch(() => {});
          reject(new Error('Connection timeout - no wallet connected'));
        }
      }, 5 * 60 * 1000);

      // Also listen for AppKit state changes
      const unsubscribe = appKit.subscribeState?.((state: { open?: boolean }) => {
        if (state.open === false && !resolved) {
          // Modal was closed without connecting
          clearInterval(checkInterval);
          unsubscribe?.();
          reject(new Error('Connection cancelled - modal closed'));
        }
      });
    });
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

  /**
   * Triggers the browser extension popup for signing on desktop.
   * This is needed when the signer doesn't have an extensionId set
   * (e.g., when connecting via the Reown AppKit modal).
   */
  private triggerExtensionPopupIfNeeded(): void {
    if (isMobileDevice()) {
      return;
    }

    const availableExtension = this.getAvailableDesktopExtension();

    if (availableExtension) {
      this.logger.debug(
        'Triggering extension popup for signing',
        availableExtension.id
      );
      extensionOpen(availableExtension.id);
    }
  }

  /**
   * Gets the available desktop browser extension (e.g., HashPack).
   * Returns undefined if no extension is available or on mobile devices.
   */
  private getAvailableDesktopExtension(): ExtensionData | undefined {
    if (isMobileDevice()) {
      return undefined;
    }

    const extensions = this.dAppConnector?.extensions || [];
    return extensions.find((ext) => ext.available && !ext.availableInIframe);
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

    // Trigger wallet prompt before signing
    if (isMobileDevice()) {
      // On mobile, open HashPack app for transaction signing
      this.logger.info('Mobile device detected, opening HashPack app for transaction signing...');
      await openHashPackOnMobile();
    } else if (!signer.extensionId) {
      // On desktop, trigger extension popup if the signer doesn't have extensionId set
      // This happens when connecting via the Reown AppKit modal
      this.triggerExtensionPopupIfNeeded();
    }

    try {
      if (!disableSigner) {
        const signedTx = await tx.freezeWithSigner(signer);
        const executedTx = await signedTx.executeWithSigner(signer);
        return await executedTx.getReceiptWithSigner(signer);
      }
      const executedTx = await tx.executeWithSigner(signer);
      return await executedTx.getReceiptWithSigner(signer);
    } catch (e) {
      const message = (e as Error).message ?? '';
      if (message.toLowerCase().includes('nodeaccountid')) {
        throw new Error(
          'Transaction execution failed because nodeAccountId is not set. Set node account IDs on the transaction before calling executeTransaction.'
        );
      }
      throw e;
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
  public async signMessage(
    message: string,
    options?: {
      openWalletOnMobile?: boolean;
      onMobileRedirect?: () => void;
    }
  ) {
    const dAppConnector = this.dAppConnector;
    if (!dAppConnector) {
      throw new Error('No active connection or signer');
    }

    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo?.accountId;

    if (!accountId) {
      throw new Error('No account connected. Please connect your wallet first.');
    }

    const params = {
      signerAccountId: `hedera:${this.network}:${accountId}`,
      message,
    };

    const shouldOpenWallet = options?.openWalletOnMobile !== false;
    if (shouldOpenWallet && isMobileDevice()) {
      this.logger.info('Mobile device detected, opening HashPack app for signing...');
      options?.onMobileRedirect?.();
      await openHashPackOnMobile();
    } else if (!isMobileDevice()) {
      // On desktop, trigger extension popup if needed
      this.triggerExtensionPopupIfNeeded();
    }

    try {
      const result = (await dAppConnector.signMessage(
        params
      )) as SignMessageResult;

      return { userSignature: (result as unknown as { signatureMap: string }).signatureMap };
    } catch (error) {
      if (isMobileDevice()) {
        const originalError = (error as Error).message || String(error);
        if (originalError.toLowerCase().includes('timeout') || 
            originalError.toLowerCase().includes('reject') ||
            originalError.toLowerCase().includes('user')) {
          throw new Error(
            `Signing failed. Please make sure HashPack is open and try again. (${originalError})`
          );
        }
      }
      throw error;
    }
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
    network?: LedgerId,
    options?: { onUri?: (uri: string) => void; useAppKit?: boolean }
  ): Promise<{
    accountId: string;
    balance: string;
    session: SessionTypes.Struct;
  }> {
    try {
      await this.init(PROJECT_ID, APP_METADATA, network, undefined, { useAppKit: options?.useAppKit });
      const session = await this.connect({ onUri: options?.onUri });

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
    onSessionIframeCreated: (session: SessionTypes.Struct) => void = () => {},
    options?: { useAppKit?: boolean }
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
          onSessionIframeCreated,
          { useAppKit: options?.useAppKit }
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
          onSessionIframeCreated,
          { useAppKit: options?.useAppKit }
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
    }, 1000);

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
export { 
  HashinalsWalletConnectSDK, 
  HashgraphSDK, 
  isMobileDevice, 
  isIOSDevice, 
  isAndroidDevice,
  openHashPackOnMobile,
  getHashPackStoreUrl,
  checkWalletReturnUrl,
};
