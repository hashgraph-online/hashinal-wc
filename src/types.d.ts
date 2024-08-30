import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import hashgraph, { PrivateKey, Transaction } from '@hashgraph/sdk';
import { ContractFunctionParameters, TransactionReceipt } from '@hashgraph/sdk';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';

export interface Message {
  payer: string;
  created: Date;
  consensus_timestamp: string;
  sequence_number: number;
  [key: string]: any;
}

export interface FetchMessagesResult {
  messages: Message[];
  error?: string;
}

export interface Account {
  account: string;
  alias: null;
  auto_renew_period: number;
  balance: Balance;
  decline_reward: boolean;
  deleted: boolean;
  ethereum_nonce: null;
  evm_address: null;
  expiry_timestamp: string;
  key: Key;
  max_automatic_token_associations: number;
  memo: string;
  receiver_sig_required: null;
  staked_account_id: null;
  staked_node_id: null;
  stake_period_start: null;
}

export interface Balance {
  balance: number;
  timestamp: string;
  tokens: Token[];
}

export interface Token {
  token_id: string;
  balance: number;
}

export interface Key {
  _type: string;
  key: string;
}

export interface TokenBalance {
  tokenId: string;
  balance: string;
  decimals: number;
  created_timestamp: Date;
  formatted_balance: string;
}

export type HashinalsWalletConnectSDK = {
  run: () => void;
  init: (
    projectId: string,
    metadata: SignClientTypes.Metadata
  ) => Promise<DAppConnector>;
  connect: () => Promise<SessionTypes.Struct>;
  connectWallet(
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata
  ): Promise<{
    accountId: string;
    balance: string;
    session: SessionTypes.Struct;
  }>;
  disconnect: () => Promise<boolean>;
  disconnectWallet: () => Promise<boolean>;
  loadConnectionInfo: () => string | null;
  saveConnectionInfo: (accountId: string) => void;
  executeTransaction: (
    tx: Transaction,
    disableSigner: boolean
  ) => Promise<TransactionReceipt>;
  executeTransationWithErrorHandling: (
    tx: Transaction,
    disableSigner: boolean
  ) => Promise<{ result?: TransactionReceipt; error?: string }>;
  submitMessageToTopic: (
    topicId: string,
    message: string
  ) => Promise<TransactionReceipt>;
  transferHbar: (
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ) => Promise<TransactionReceipt>;
  executeSmartContract: (
    contractId: string,
    functionName: string,
    parameters: ContractFunctionParameters,
    gas?: number
  ) => Promise<TransactionReceipt>;
  getAccountBalance: () => Promise<string>;
  getAccountInfo: () => string;
  createTopic: (
    memo?: string,
    adminKey?: string,
    submitKey?: string
  ) => Promise<string>;
  createToken: (
    name: string,
    symbol: string,
    initialSupply: number,
    decimals: number,
    treasuryAccountId: string,
    adminKey: string,
    supplyKey: string
  ) => Promise<string>;
  mintNFT: (
    tokenId: string,
    metadata: string,
    supplyKey: PrivateKey
  ) => Promise<TransactionReceipt>;
  dAppConnector?: DAppConnector;
  getMessages: (
    topicId: string,
    collectedMessages: Message[],
    lastTimestamp?: number,
    disableTimestampFilter?: boolean,
    nextUrl?: string
  ) => Promise<FetchMessagesResult>;
  initAccount: (
    PROJECT_ID: string,
    APP_METADATA: SignClientTypes.Metadata
  ) => Promise<{ accountId: string; balance: string } | null>;
  transferToken: (
    tokenId: string,
    fromAccountId: string,
    toAccountId: string,
    amount: number
  ) => Promise<TransactionReceipt>;
  createAccount: (initialBalance: number) => Promise<TransactionReceipt>;
  associateTokenToAccount: (
    accountId: string,
    tokenId: string
  ) => Promise<TransactionReceipt>;
  dissociateTokenFromAccount: (
    accountId: string,
    tokenId: string
  ) => Promise<TransactionReceipt>;
  updateAccount: (
    accountId: string,
    maxAutomaticTokenAssociations: number
  ) => Promise<TransactionReceipt>;
  approveAllowance: (
    spenderAccountId: string,
    tokenId: string,
    amount: number,
    ownerAccountId: string
  ) => Promise<TransactionReceipt>;
  getAccountTokens: (accountId: string) => Promise<{ tokens: TokenBalance[] }>;
  HashgraphSDK: typeof hashgraph;
};

declare global {
  interface Window {
    HashinalsWalletConnectSDK: HashinalsWalletConnectSDK;
  }
}

declare const __UMD__: boolean;
