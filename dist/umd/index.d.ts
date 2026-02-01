import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { Transaction, AccountId, ContractId, LedgerId, TransactionReceipt, ContractFunctionParameters, PrivateKey } from '@hashgraph/sdk';
import { AppKit } from '@reown/appkit';
import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { FetchMessagesResult, TokenBalance, HederaAccountResponse, HederaTXResponse, Nft } from './types';
import { Logger } from './logger';
import * as HashgraphSDK from '@hashgraph/sdk';
/**
 * Detect if current device is mobile
 */
declare function isMobileDevice(): boolean;
/**
 * Detect if device is iOS
 */
declare function isIOSDevice(): boolean;
/**
 * Detect if device is Android
 */
declare function isAndroidDevice(): boolean;
/**
 * Get the appropriate app store URL for the current platform
 */
declare function getHashPackStoreUrl(): string;
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
declare function openHashPackOnMobile(wcUri?: string): Promise<void>;
/**
 * Check if there's a saved return URL from a wallet connection attempt.
 * If found, returns the URL and clears it from storage.
 *
 * dApps should call this on page load and redirect if a URL is returned.
 */
declare function checkWalletReturnUrl(): string | null;
declare class HashinalsWalletConnectSDK {
    private static instance;
    private static dAppConnectorInstance;
    private static proxyInstance;
    private logger;
    private network;
    private reownAppKit;
    private reownAppKitKey;
    private extensionCheckInterval;
    private hasCalledExtensionCallback;
    private useAppKit;
    get dAppConnector(): DAppConnector;
    constructor(logger?: Logger, network?: LedgerId);
    static getInstance(logger?: Logger, network?: LedgerId): HashinalsWalletConnectSDK;
    setLogger(logger: Logger): void;
    setNetwork(network: LedgerId): void;
    getNetwork(): LedgerId;
    setReownAppKit(appKit: AppKit | null): void;
    private ensureReownAppKit;
    setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
    init(projectId: string, metadata: SignClientTypes.Metadata, network?: LedgerId, onSessionIframeCreated?: (session: SessionTypes.Struct) => void, options?: {
        useAppKit?: boolean;
    }): Promise<DAppConnector>;
    connect(options?: {
        pairingTopic?: string;
        onUri?: (uri: string) => void;
    }): Promise<SessionTypes.Struct>;
    private connectUsingReownAppKit;
    disconnect(): Promise<boolean>;
    disconnectAll(): Promise<boolean>;
    /**
     * Triggers the browser extension popup for signing on desktop.
     * This is needed when the signer doesn't have an extensionId set
     * (e.g., when connecting via the Reown AppKit modal).
     */
    private triggerExtensionPopupIfNeeded;
    /**
     * Gets the available desktop browser extension (e.g., HashPack).
     * Returns undefined if no extension is available or on mobile devices.
     */
    private getAvailableDesktopExtension;
    executeTransaction(tx: Transaction, disableSigner?: boolean): Promise<TransactionReceipt>;
    executeTransactionWithErrorHandling(tx: Transaction, disableSigner: boolean): Promise<{
        result?: TransactionReceipt;
        error?: string;
    }>;
    submitMessageToTopic(topicId: string, message: string, submitKey?: PrivateKey): Promise<TransactionReceipt>;
    transferHbar(fromAccountId: string, toAccountId: string, amount: number): Promise<TransactionReceipt>;
    executeSmartContract(contractId: string, functionName: string, parameters: ContractFunctionParameters, gas?: number): Promise<TransactionReceipt>;
    private handleNewSession;
    private getNetworkPrefix;
    requestAccount(account: string): Promise<HederaAccountResponse>;
    getAccountBalance(): Promise<string>;
    getAccountInfo(): {
        accountId: string;
        network: LedgerId;
    };
    createTopic(memo?: string, adminKey?: string, submitKey?: string): Promise<string>;
    createToken(name: string, symbol: string, initialSupply: number, decimals: number, treasuryAccountId: string, adminKey: string, supplyKey: string): Promise<string>;
    mintNFT(tokenId: string, metadata: string, supplyKey: PrivateKey): Promise<TransactionReceipt>;
    getMessages(topicId: string, lastTimestamp?: number, disableTimestampFilter?: boolean, network?: string): Promise<FetchMessagesResult>;
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
    signMessage(message: string, options?: {
        openWalletOnMobile?: boolean;
        onMobileRedirect?: () => void;
    }): Promise<{
        userSignature: string;
    }>;
    private saveConnectionInfo;
    loadConnectionInfo(): {
        accountId: string | null;
        network: string | null;
    };
    connectWallet(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata, network?: LedgerId, options?: {
        onUri?: (uri: string) => void;
        useAppKit?: boolean;
    }): Promise<{
        accountId: string;
        balance: string;
        session: SessionTypes.Struct;
    }>;
    disconnectWallet(clearStorage?: boolean): Promise<boolean>;
    initAccount(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata, networkOverride?: LedgerId, onSessionIframeCreated?: (session: SessionTypes.Struct) => void, options?: {
        useAppKit?: boolean;
    }): Promise<{
        accountId: string;
        balance: string;
    } | null>;
    subscribeToExtensions(callback: (extension: any) => void): () => void;
    connectViaDappBrowser(): Promise<void>;
    private connectToExtension;
    private ensureInitialized;
    static run(): void;
    transferToken(tokenId: string, fromAccountId: string, toAccountId: string, amount: number): Promise<TransactionReceipt>;
    createAccount(initialBalance: number): Promise<TransactionReceipt>;
    associateTokenToAccount(accountId: string, tokenId: string): Promise<TransactionReceipt>;
    dissociateTokenFromAccount(accountId: string, tokenId: string): Promise<TransactionReceipt>;
    updateAccount(accountId: string, maxAutomaticTokenAssociations: number): Promise<TransactionReceipt>;
    approveAllowance(spenderAccountId: string, tokenId: string, amount: number, ownerAccountId: string): Promise<TransactionReceipt>;
    getAccountTokens(accountId: string): Promise<{
        tokens: TokenBalance[];
    }>;
    getTransaction(transactionId: string): Promise<HederaTXResponse | null>;
    getTransactionByTimestamp(timestamp: string): Promise<HederaTXResponse | null>;
    getAccountNFTs(accountId: string, tokenId?: string): Promise<Nft[]>;
    validateNFTOwnership(serialNumber: string, accountId: string, tokenId: string): Promise<Nft | null>;
    readSmartContract(data: string, fromAccount: AccountId, contractId: ContractId, estimate?: boolean, value?: number): Promise<any>;
}
export * from './types';
export * from './sign';
export { HashinalsWalletConnectSDK, HashgraphSDK, isMobileDevice, isIOSDevice, isAndroidDevice, openHashPackOnMobile, getHashPackStoreUrl, checkWalletReturnUrl, };
