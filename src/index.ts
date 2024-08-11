import { Buffer } from 'buffer';
import { SignClientTypes } from '@walletconnect/types';
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
} from '@hashgraph/sdk';
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
export async function connect() {
  if (!dAppConnector) throw new Error('SDK not initialized');

  await dAppConnector.init({ logger: 'error' });
  const session = await dAppConnector.openModal();
  console.log('Connected to wallet:', session);
  return session;
}

/**
 * Disconnects from all wallets
 */
export async function disconnect() {
  if (!dAppConnector) throw new Error('SDK not initialized');
  await dAppConnector.disconnectAll();
  console.log('Disconnected from all wallets');
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
 * @returns {Promise<TransactionReceipt>}
 */
export async function submitMessageToTopic(topicId: string, message: string) {
  if (!dAppConnector) throw new Error('SDK not initialized');

  const transaction = new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(message);

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

  const transaction = new TokenCreateTransaction()
    .setTokenName(name)
    .setTokenSymbol(symbol)
    .setDecimals(decimals)
    .setInitialSupply(initialSupply)
    .setTreasuryAccountId(AccountId.fromString(treasuryAccountId))
    .setAdminKey(PrivateKey.fromString(adminKey))
    .setSupplyKey(PrivateKey.fromString(supplyKey))
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Finite);

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
  metadata: string
): Promise<TransactionReceipt> {
  if (!dAppConnector) throw new Error('SDK not initialized');

  const transaction = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([Buffer.from(metadata, 'utf-8')]);

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

// Updated HederaWalletConnectSDK object with new functions
const HederaWalletConnectSDK: HederaWalletConnectSDK = {
  init,
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
};

const run = (): void => {
  window.HederaWalletConnectSDK = HederaWalletConnectSDK;
};

run();

export default HederaWalletConnectSDK;
