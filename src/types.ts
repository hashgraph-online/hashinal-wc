import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import * as hashgraph from '@hashgraph/sdk';
import {
  ContractFunctionParameters,
  TransactionReceipt,
  PrivateKey,
  Transaction,
} from '@hashgraph/sdk';
import { SessionTypes, SignClientTypes } from '@walletconnect/types';

export interface HederaAccountResponse {
  account: string;
  alias: null;
  auto_renew_period: number;
  balance: Balance;
  created_timestamp: string;
  decline_reward: boolean;
  deleted: boolean;
  ethereum_nonce: number;
  evm_address: string;
  expiry_timestamp: string;
  key: Key;
  max_automatic_token_associations: number;
  memo: string;
  pending_reward: number;
  receiver_sig_required: boolean;
  staked_account_id: null;
  staked_node_id: number;
  stake_period_start: string;
  transactions: HBARTransaction[];
  links: Links;
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

export interface Links {
  next: string;
}

export interface HBARTransaction {
  bytes: null;
  charged_tx_fee: number;
  consensus_timestamp: string;
  entity_id: null | string;
  max_fee: string;
  memo_base64: string;
  name: Name;
  nft_transfers: NftTransfer[];
  node: string;
  nonce: number;
  parent_consensus_timestamp: null;
  result: Result;
  scheduled: boolean;
  staking_reward_transfers: StakingRewardTransfer[];
  token_transfers: Transfer[];
  transaction_hash: string;
  transaction_id: string;
  transfers: Transfer[];
  valid_duration_seconds: string;
  valid_start_timestamp: string;
}

export enum Name {
  Contractcall = 'CONTRACTCALL',
  Cryptotransfer = 'CRYPTOTRANSFER',
}

export interface NftTransfer {
  is_approval: boolean;
  receiver_account_id: string;
  sender_account_id: string;
  serial_number: number;
  token_id: string;
}

export enum Result {
  Success = 'SUCCESS',
}

export interface StakingRewardTransfer {
  account: string;
  amount: number;
}

export interface Transfer {
  token_id?: string;
  account: string;
  amount: number;
  is_approval: boolean;
}

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
  disconnectAll: () => Promise<boolean>;
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
