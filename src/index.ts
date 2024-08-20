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
  PrivateKey,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TopicCreateTransaction,
  TransactionReceipt,
  ContractFunctionParameters,
  PrivateKey,
} from '@hashgraph/sdk';
import * as HashgraphSDK from '@hashgraph/sdk';
import {
  HederaSessionEvent,
  HederaJsonRpcMethod,
  DAppConnector,
  HederaChainId,
} from '@hashgraph/hedera-wallet-connect';
import { FetchMessagesResult, HederaWalletConnectSDK, Message } from './types';

let dAppConnector: DAppConnector | undefined;

/**
 * Starts the DAppConnector, without opening a modal.
 * @param projectId
 * @param metadata
 * @returns {DAppConnector}
 */
export async function init(
  projectId: string,
  metadata: SignClientTypes.Metadata
) {
  dAppConnector = new DAppConnector(
    metadata,
    LedgerId.MAINNET,
    projectId,
    Object.values(HederaJsonRpcMethod),
    [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
    [HederaChainId.Mainnet]
  );

  await dAppConnector.init({ logger: 'error' });
  console.log('Hedera Wallet Connect SDK initialized');
  return dAppConnector;
}

/**
 * Opens Wallet Connect Modal to start a session.
 * @returns
 */
export async function connect(): Promise<SessionTypes.Struct> {
  if (!dAppConnector) throw new Error('SDK not initialized');

  await dAppConnector.init({ logger: 'error' });
  const session = await dAppConnector.openModal();
  console.log('Connected to wallet:', session);
  return session;
}

/**
 * Disconnects from all wallets
 */
export async function disconnect(): Promise<boolean> {
  try {
    if (!dAppConnector) throw new Error('SDK not initialized');
    await dAppConnector.disconnectAll();
    console.log('Disconnected from all wallets');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Executes a Transaction.
 * @param {Transaction} tx
 * @returns {Promise<TransactionResponse>}
 */
export const executeTransaction = async (tx: Transaction) => {
  if (!dAppConnector) throw new Error('SDK not initialized');
  const signer = dAppConnector.signers[0];
  const signedTx = await tx.freezeWithSigner(signer);
  const exectedTx = await signedTx.executeWithSigner(signer);
  return await exectedTx.getReceiptWithSigner(signer);
};

/**
 *
 * Submits a new message to a Topic Id
 * @param {string} topicId
 * @param {string} message
 * @param {string} submitKey
 * @returns {Promise<TransactionReceipt>}
 */
export async function submitMessageToTopic(
  topicId: string,
  message: string,
  submitKey?: PrivateKey
) {
  if (!dAppConnector) throw new Error('SDK not initialized');

  let transaction = new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(message);

  if (submitKey) {
    transaction = await transaction.sign(submitKey);
  }

  return executeTransaction(transaction);
}

/**
 * Transfers HBAR from one Account Id to another.
 * @param {string} fromAccountId
 * @param {string} toAccountId
 * @param {number} amount
 * @returns {Promise<TransactionReceipt>}
 */
export async function transferHbar(
  fromAccountId: string,
  toAccountId: string,
  amount: number
) {
  if (!dAppConnector) throw new Error('SDK not initialized');

  const transaction = new TransferTransaction()
    .setTransactionId(TransactionId.generate(fromAccountId))
    .addHbarTransfer(AccountId.fromString(fromAccountId), new Hbar(-amount))
    .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount));

  return executeTransaction(transaction);
}

/**
 * Execute a smart contract given an id, name and params.
 * @param contractId
 * @param functionName
 * @param parameters
 * @param gas
 * @returns
 */
export async function executeSmartContract(
  contractId: string,
  functionName: string,
  parameters: ContractFunctionParameters,
  gas: number = 100000
) {
  if (!dAppConnector) throw new Error('SDK not initialized');

  const transaction = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(contractId))
    .setGas(gas)
    .setFunction(functionName, parameters);

  return await executeTransaction(transaction);
}

/**
 * Fetch an Account Id
 * @param {string} account
 * @returns {any}
 */
const requestAccount = async (account: string) => {
  try {
    const url = `https://mainnet-public.mirrornode.hedera.com/api/v1/accounts/${account}`;
    const req = await fetch(url);
    const res = await req.json();
    return res;
  } catch (e) {
    console.log(e);
  }
};

/**
 * Gets the current account balance, formatted.
 * @returns {string}
 */
export async function getAccountBalance() {
  if (!dAppConnector) throw new Error('SDK not initialized');
  const account = await getAccountInfo();
  const accountResponse = await requestAccount(account);
  if (!accountResponse) {
    throw new Error(
      'Failed to fetch account. Try again or check if the Account ID is valid.'
    );
  }
  const balance = (await accountResponse?.balance?.balance) / 10 ** 8;
  return Number(balance).toLocaleString('en-US');
}

/**
 * Gets the current Account Id authenticated with Wallet Connect
 * @returns {string}
 */
export async function getAccountInfo() {
  if (!dAppConnector) throw new Error('SDK not initialized');
  const signer = dAppConnector.signers[0];
  return signer.getAccountId().toString();
}

/**
 * Function to create a new topic, with optional admin and submit keys
 * @param {string} memo
 * @param {string} adminKey
 * @param {string} submitKey
 * @returns {string} topicId
 */
export async function createTopic(
  memo?: string,
  adminKey?: string,
  submitKey?: string
) {
  if (!dAppConnector) throw new Error('SDK not initialized');

  let transaction = new TopicCreateTransaction().setTopicMemo(memo);

  if (adminKey) {
    const adminWithPrivateKey = PrivateKey.fromString(adminKey);
    transaction.setAdminKey(adminWithPrivateKey.publicKey);
    transaction = await transaction.sign(adminWithPrivateKey);
  }

  if (submitKey) {
    transaction.setSubmitKey(PrivateKey.fromString(submitKey).publicKey);
  }

  const receipt = await executeTransaction(transaction);
  return receipt.topicId.toString();
}

/**
 * Create a new Token ID
 * @param name
 * @param symbol
 * @param initialSupply
 * @param decimals
 * @param treasuryAccountId
 * @param adminKey
 * @param supplyKey
 * @returns {Promise<TransactionReceipt>}
 */
export async function createToken(
  name: string,
  symbol: string,
  initialSupply: number,
  decimals: number,
  treasuryAccountId: string,
  adminKey: string,
  supplyKey: string
) {
  if (!dAppConnector) throw new Error('SDK not initialized');

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

  const receipt = await executeTransaction(transaction);
  return receipt.tokenId.toString();
}

/**
 * Mint a new serial number onto a Token Id.
 * @param {string} tokenId
 * @param {string} metadata
 * @returns {Promise<TransactionReceipt>}
 */
export async function mintNFT(
  tokenId: string,
  metadata: string,
  supplyKey: PrivateKey
): Promise<TransactionReceipt> {
  if (!dAppConnector) throw new Error('SDK not initialized');

  let transaction = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([Buffer.from(metadata, 'utf-8')])
    .sign(supplyKey);

  return await executeTransaction(transaction);
}

/**
 * Retrieves all messages for a Topic Id.
 * @param topicId
 * @param collectedMessages
 * @param lastTimestamp
 * @param disableTimestampFilter
 * @param nextUrl
 * @returns
 */
async function getMessages(
  topicId: string,
  collectedMessages: Message[],
  lastTimestamp?: number,
  disableTimestampFilter: boolean = false,
  nextUrl?: string
): Promise<FetchMessagesResult> {
  const baseUrl = 'https://mainnet-public.mirrornode.hedera.com';
  const timestampQuery =
    lastTimestamp && !disableTimestampFilter
      ? `&timestamp=gt:${lastTimestamp}`
      : '';

  const url = nextUrl
    ? `${baseUrl}${nextUrl}`
    : `${baseUrl}/api/v1/topics/${topicId}/messages?limit=200${timestampQuery}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const messages = data?.messages || [];
    const nextLink = data?.links?.next;

    for (const msg of messages) {
      try {
        const parsedMessage = JSON.parse(atob(msg.message));
        parsedMessage.payer = msg.payer_account_id;
        collectedMessages.push({
          ...parsedMessage,
          created: new Date(Number(msg.consensus_timestamp) * 1000),
          consensus_timestamp: msg.consensus_timestamp,
          sequence_number: msg.sequence_number,
        });
      } catch (jsonError) {
        console.error('Failed to process JSON:', jsonError);
        return {
          messages: collectedMessages,
          error: 'Failed to process JSON',
        };
      }
    }

    if (nextLink) {
      return await getMessages(
        topicId,
        collectedMessages,
        Number(
          collectedMessages[collectedMessages.length - 1]?.consensus_timestamp
        ),
        disableTimestampFilter,
        nextLink
      );
    }

    return {
      messages: collectedMessages.sort(
        (a, b) => a.sequence_number - b.sequence_number
      ),
      error: '',
    };
  } catch (networkError) {
    console.error('Error fetching topic data:', networkError);
    return {
      messages: collectedMessages,
      error: networkError.toString(),
    };
  }
}

/**
 * Helper function to save currently connected account id
 * @param {string} accountId
 */
function saveConnectionInfo(accountId: string) {
  if (!accountId) {
    return localStorage.removeItem('connectedAccountId');
  }
  localStorage.setItem('connectedAccountId', accountId);
}

/**
 * Helper function to get currently connected account id
 * @returns {string | null}
 */
function loadConnectionInfo() {
  return localStorage.getItem('connectedAccountId');
}

/**
 * Helper function to connect to the wallet.
 * @param {string} PROJECT_ID
 * @param {SignClientTypes.Metadata} APP_METADATA
 * @returns {Promise<{ accountId: string; balance: string; session: SessionTypes.Struct }>}
 */
async function connectWallet(
  PROJECT_ID: string,
  APP_METADATA: SignClientTypes.Metadata
): Promise<{
  accountId: string;
  balance: string;
  session: SessionTypes.Struct;
}> {
  try {
    const sdk = window?.HederaWalletConnectSDK;
    await sdk.init(PROJECT_ID, APP_METADATA);
    const session = await sdk.connect();
    console.log('Connected session:', session);
    const accountId = await sdk.getAccountInfo();
    const balance = await sdk.getAccountBalance();
    console.log('account info is', accountId, balance);

    saveConnectionInfo(accountId);
    return {
      accountId,
      balance,
      session,
    };
  } catch (error) {
    console.error('Failed to connect wallet:', error);
  }
}

/**
 * Helper function to disconnect + wipe local storage.
 * @param {boolean} clearStorage - clear storage on disconnect
 * @returns {boolean}
 */
async function disconnectWallet(
  clearStorage: boolean = true
): Promise<boolean> {
  try {
    try {
      const sdk = window?.HederaWalletConnectSDK;
      const success = await sdk.disconnect();

      if (!success) {
        return false;
      }

      if (clearStorage) {
        localStorage.clear();
      }

      saveConnectionInfo(undefined);
      return true;
    } catch (e) {}

    return true;
  } catch (error) {
    console.error('Failed to connect wallet:', error);
    return false;
  }
}

/**
 * Helper function to init the SDK from localStorage.
 * @param PROJECT_ID Hedera project id
 * @param APP_METADATA App Metadata
 */
const initAccount = async (
  PROJECT_ID: string,
  APP_METADATA: SignClientTypes.Metadata
): Promise<{ accountId: string; balance: string } | null> => {
  const savedAccountId = loadConnectionInfo();

  const sdk = window?.HederaWalletConnectSDK;
  if (savedAccountId) {
    try {
      console.log('got connectedAccountId', savedAccountId);
      await sdk.init(PROJECT_ID, APP_METADATA);
      const balance = await sdk.getAccountBalance();
      return {
        accountId: savedAccountId,
        balance,
      };
    } catch (error) {
      console.error('Failed to reconnect:', error);
      localStorage.removeItem('connectedAccountId');
      return null;
    }
  }
};

// Updated HederaWalletConnectSDK object with new functions
const HederaWalletConnectSDK: HederaWalletConnectSDK = {
  init,
  initAccount,
  disconnectWallet,
  connectWallet,
  loadConnectionInfo,
  saveConnectionInfo,
  connect,
  disconnect,
  submitMessageToTopic,
  transferHbar,
  executeSmartContract,
  getAccountBalance,
  getAccountInfo,
  createTopic,
  createToken,
  mintNFT,
  dAppConnector,
  getMessages,
  HashgraphSDK,
};

const run = (): void => {
  window.HederaWalletConnectSDK = HederaWalletConnectSDK;
};

run();

export default HederaWalletConnectSDK;
