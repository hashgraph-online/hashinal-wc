import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { ContractFunctionParameters, TransactionReceipt } from '@hashgraph/sdk';
import { SignClientTypes } from '@walletconnect/types';

interface Message {
  payer: string;
  created: Date;
  consensus_timestamp: string;
  sequence_number: number;
  [key: string]: any;
}

interface FetchMessagesResult {
  messages: Message[];
  error?: string;
}

interface Account {
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

export type HederaWalletConnectSDK = {
  init: (
    projectId: string,
    metadata: SignClientTypes.Metadata
  ) => Promise<DAppConnector>;
  connect: () => Promise<any>;
  disconnect: () => Promise<void>;
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
  getAccountInfo: () => Promise<string>;
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
  mintNFT: (tokenId: string, metadata: string) => Promise<TransactionReceipt>;
  dAppConnector?: DAppConnector;
  getMessages: (
    topicId: string,
    collectedMessages: Message[],
    lastTimestamp?: number,
    disableTimestampFilter?: boolean,
    nextUrl?: string
  ) => Promise<FetchMessagesResult>;
};

declare global {
  interface Window {
    HederaWalletConnectSDK: HederaWalletConnectSDK;
  }
}
