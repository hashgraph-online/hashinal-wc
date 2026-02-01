import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import {
  LedgerId,
  TransactionReceipt,
  ContractFunctionParameters,
  PrivateKey,
} from '@hashgraph/sdk';
import * as HashgraphSDK from '@hashgraph/sdk';
import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import type {
  FetchMessagesResult,
  HederaAccountResponse,
  TokenBalance,
} from './types';
import { ILogger } from './logger/logger';

declare class HashinalsWalletConnectSDK {
  private static instance;
  private dAppConnector;
  private logger;
  private network;
  constructor(logger?: ILogger, network?: LedgerId);
  static getInstance(
    logger?: ILogger,
    network?: LedgerId
  ): HashinalsWalletConnectSDK;
  setLogger(logger: ILogger): void;
  setNetwork(network: LedgerId): void;
  getNetwork(): LedgerId;
  setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
  init(
    projectId: string,
    metadata: SignClientTypes.Metadata,
    network?: LedgerId,
    onSessionIframeCreated?: (session: SessionTypes.Struct) => void
  ): Promise<DAppConnector>;
  connect(options?: { pairingTopic?: string }): Promise<SessionTypes.Struct>;
  disconnect(): Promise<boolean>;
  disconnectAll(): Promise<boolean>;
  private executeTransaction;
  submitMessageToTopic(
    topicId: string,
    message: string,
    submitKey?: PrivateKey
  ): Promise<TransactionReceipt>;
  transferHbar(
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<TransactionReceipt>;
  executeSmartContract(
    contractId: string,
    functionName: string,
    parameters: ContractFunctionParameters,
    gas?: number
  ): Promise<TransactionReceipt>;
  requestAccount(account: string): Promise<HederaAccountResponse>;
  getAccountBalance(): Promise<string>;
  getAccountInfo(): { accountId: string; network: LedgerId } | null;
  createTopic(
    memo?: string,
    adminKey?: string,
    submitKey?: string
  ): Promise<string>;
  createToken(
    name: string,
    symbol: string,
    initialSupply: number,
    decimals: number,
    treasuryAccountId: string,
    adminKey: string,
    supplyKey: string
  ): Promise<string>;
  mintNFT(
    tokenId: string,
    metadata: string,
    supplyKey: PrivateKey
  ): Promise<TransactionReceipt>;
  getMessages(
    topicId: string,
    lastTimestamp?: number,
    disableTimestampFilter?: boolean,
    network?: string
  ): Promise<FetchMessagesResult>;
  saveConnectionInfo(accountId: string | undefined, connectedNetwork?: string): void;
  loadConnectionInfo(): { accountId: string | null; network: string | null };
  connectWallet(
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata,
    network?: LedgerId
  ): Promise<{
    accountId: string;
    balance: string;
    session: SessionTypes.Struct;
  }>;
  disconnectWallet(clearStorage?: boolean): Promise<boolean>;
  initAccount(
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata,
    networkOverride?: LedgerId,
    onSessionIframeCreated?: (session: SessionTypes.Struct) => void
  ): Promise<{
    accountId: string;
    balance: string;
  } | null>;
  subscribeToExtensions(callback: (extension: any) => void): () => void;
  connectViaDappBrowser(): Promise<void>;
  private ensureInitialized;
  static run(): void;
  transferToken(
    tokenId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ): Promise<TransactionReceipt>;
  createAccount(initialBalance: number): Promise<TransactionReceipt>;
  associateTokenToAccount(
    accountId: string,
    tokenId: string
  ): Promise<TransactionReceipt>;
  dissociateTokenFromAccount(
    accountId: string,
    tokenId: string
  ): Promise<TransactionReceipt>;
  updateAccount(
    accountId: string,
    maxAutomaticTokenAssociations: number
  ): Promise<TransactionReceipt>;
  approveAllowance(
    spenderAccountId: string,
    tokenId: string,
    amount: number,
    ownerAccountId: string
  ): Promise<TransactionReceipt>;
  getAccountTokens(accountId: string): Promise<{
    tokens: TokenBalance[];
  }>;
  signMessage(
    message: string,
    options?: {
      openWalletOnMobile?: boolean;
      onMobileRedirect?: () => void;
    }
  ): Promise<{ userSignature: string }>;
}

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
 * Open HashPack app on mobile device.
 * Used primarily for sign requests after a connection is already established.
 * 
 * @param wcUri - Optional WalletConnect URI to pass to HashPack
 */
declare function openHashPackOnMobile(wcUri?: string): Promise<void>;

/**
 * Get the appropriate app store URL for the current platform
 */
declare function getHashPackStoreUrl(): string;

declare global {
  interface Window {
    HashinalsWalletConnectSDK: HashinalsWalletConnectSDK;
  }
}

declare const __UMD__: boolean;

export { 
  HashinalsWalletConnectSDK, 
  HashgraphSDK, 
  isMobileDevice, 
  isIOSDevice, 
  isAndroidDevice,
  openHashPackOnMobile,
  getHashPackStoreUrl,
};

