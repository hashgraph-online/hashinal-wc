import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { Transaction, LedgerId, TransactionReceipt, ContractFunctionParameters, PrivateKey } from '@hashgraph/sdk';
import * as HashgraphSDK from '@hashgraph/sdk';
import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { FetchMessagesResult, TokenBalance, HederaAccountResponse } from './types';
import { ILogger } from './logger/logger';
declare class HashinalsWalletConnectSDK {
    private static instance;
    private static dAppConnectorInstance;
    private logger;
    private network;
    get dAppConnector(): DAppConnector;
    constructor(logger?: ILogger, network?: LedgerId);
    static getInstance(logger?: ILogger, network?: LedgerId): HashinalsWalletConnectSDK;
    setLogger(logger: ILogger): void;
    setNetwork(network: LedgerId): void;
    getNetwork(): LedgerId;
    setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
    init(projectId: string, metadata: SignClientTypes.Metadata, network?: LedgerId): Promise<DAppConnector>;
    connect(): Promise<SessionTypes.Struct>;
    disconnect(): Promise<boolean>;
    disconnectAll(): Promise<boolean>;
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
    getMessages(topicId: string, lastTimestamp?: number, disableTimestampFilter?: boolean): Promise<FetchMessagesResult>;
    signMessage(message: string): Promise<{
        userSignature: any;
    }>;
    private saveConnectionInfo;
    loadConnectionInfo(): {
        accountId: string | null;
        network: string | null;
    };
    connectWallet(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata, network?: LedgerId): Promise<{
        accountId: string;
        balance: string;
        session: SessionTypes.Struct;
    }>;
    disconnectWallet(clearStorage?: boolean): Promise<boolean>;
    initAccount(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata): Promise<{
        accountId: string;
        balance: string;
    } | null>;
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
}
export * from './types';
export * from './sign';
export { HashinalsWalletConnectSDK, HashgraphSDK };
