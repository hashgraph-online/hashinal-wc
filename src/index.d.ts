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
  setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
  init(
    projectId: string,
    metadata: SignClientTypes.Metadata,
    network?: LedgerId
  ): Promise<DAppConnector>;
  connect(): Promise<SessionTypes.Struct>;
  disconnect(): Promise<boolean>;
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
  getAccountInfo(): Promise<string>;
  createTopic(
    memo?: string,
    adminKey?: string,
    customFees?: { denominatingTokenId: string, amount: string, collectorAccountId: string }[] // Updated type
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
    disableTimestampFilter?: boolean
  ): Promise<FetchMessagesResult>;
  saveConnectionInfo(accountId: string | undefined): void;
  loadConnectionInfo(): string | null;
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
    APP_METADATA: SignClientTypes.Metadata
  ): Promise<{
    accountId: string;
    balance: string;
  } | null>;
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
  generatePrivateAndPublicKey(): Promise<{
    privateKey: string;
    publicKey: string;
  }>;
  updateTopic(topicId: string, memo: string, adminKey: string): Promise<string>;
  getTopicInfo(topicId: string): Promise<any>;
}

declare global {
  interface Window {
    HashinalsWalletConnectSDK: HashinalsWalletConnectSDK;
  }
}

declare const __UMD__: boolean;

export { HashinalsWalletConnectSDK, HashgraphSDK };
