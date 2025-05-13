import { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { Transaction, AccountId, ContractId, LedgerId, TransactionReceipt, ContractFunctionParameters, PrivateKey } from '@hashgraph/sdk';
import { DAppConnector } from '@hashgraph/hedera-wallet-connect';
import { FetchMessagesResult, TokenBalance, HederaAccountResponse, HederaTXResponse, Nft } from './types';
import { ILogger } from './logger/logger';
import * as HashgraphSDK from '@hashgraph/sdk';
declare class HashinalsWalletConnectSDK {
    private static instance;
    private static dAppConnectorInstance;
    private logger;
    private network;
    private extensionCheckInterval;
    private hasCalledExtensionCallback;
    get dAppConnector(): DAppConnector;
    constructor(logger?: ILogger, network?: LedgerId);
    static getInstance(logger?: ILogger, network?: LedgerId): HashinalsWalletConnectSDK;
    setLogger(logger: ILogger): void;
    setNetwork(network: LedgerId): void;
    getNetwork(): LedgerId;
    setLogLevel(level: 'error' | 'warn' | 'info' | 'debug'): void;
    init(projectId: string, metadata: SignClientTypes.Metadata, network?: LedgerId, onSessionIframeCreated?: (session: SessionTypes.Struct) => void): Promise<DAppConnector>;
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
    generatePrivateAndPublicKey(): Promise<{
        privateKey: string;
        publicKey: string;
    }>;
    updateTopic(topicId: string, memo: string, adminKey: string): Promise<string>;
    createTopic(memo?: string, adminKey?: string, submitKey?: string): Promise<string>;
    createToken(name: string, symbol: string, initialSupply: number, decimals: number, treasuryAccountId: string, adminKey: string, supplyKey: string): Promise<string>;
    mintNFT(tokenId: string, metadata: string, supplyKey: PrivateKey): Promise<TransactionReceipt>;
    getTopicInfo(topicId: string, network?: string): Promise<any>;
    getMessages(topicId: string, lastTimestamp?: number, disableTimestampFilter?: boolean, network?: string): Promise<FetchMessagesResult>;
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
    initAccount(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata, networkOverride?: LedgerId, onSessionIframeCreated?: (session: SessionTypes.Struct) => void): Promise<{
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
export { HashinalsWalletConnectSDK, HashgraphSDK };
