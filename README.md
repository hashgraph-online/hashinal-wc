# Hedera Wallet Connect SDK

This SDK provides a simple interface for interacting with the Hedera Hashgraph using WalletConnect. It allows developers to easily integrate Hedera functionality into inscribed HTML files by injecting the SDK into the window. It is not meant for usage in a traditional non-inscribed dApp.

## Features

- Initialize and connect to WalletConnect
- Submit messages to Hedera topics
- Transfer HBAR between accounts
- Execute smart contracts
- Create topics and tokens
- Mint NFTs
- Fetch account balance and information
- Retrieve messages from a topic

## Usage

The script located in the dist folder can be used directly, but it's primarily intended to be integrated with an inscribed Topic ID via the [Recursion SDK](https://github.com/hashgraph-online/hcs-recursion-sdk).

To use this script, ensure that you reference the current version's Topic ID in your HTML.

```html
<script data-src="hcs://1/0.0.6790163" data-script-id="wallet-connect"></script>
```

Later in your code, access the SDK.

```javascript
// Initialize the SDK
await window.HederaWalletConnectSDK.init(projectId, metadata);

// Connect to a wallet
const session = await HederaWalletConnectSDK.connect();

// Use various SDK functions
await HederaWalletConnectSDK.submitMessageToTopic(topicId, message);
await HederaWalletConnectSDK.transferHbar(fromAccountId, toAccountId, amount);
// ... and more
```

## SDK Reference

### `init(projectId: string, metadata: SignClientTypes.Metadata)`

Initializes the SDK with the given project ID and metadata. Ensure you've registered your project using the official WalletConnect website.

### `connect()`

Opens the WalletConnect modal and establishes a connection.

### `disconnect()`

Disconnects from all connected wallets.

### `submitMessageToTopic(topicId: string, message: string)`

Submits a message to the specified Hedera topic.

### `transferHbar(fromAccountId: string, toAccountId: string, amount: number)`

Transfers HBAR between accounts.

### `executeSmartContract(contractId: string, functionName: string, parameters: ContractFunctionParameters, gas: number = 100000)`

Executes a function on a smart contract.

### `getAccountBalance()`

Retrieves the balance of the connected account.

### `getAccountInfo()`

Retrieves information about the connected account.

### `createTopic(memo?: string, adminKey?: string, submitKey?: string)`

Creates a new topic on the Hedera network.

### `createToken(name: string, symbol: string, initialSupply: number, decimals: number, treasuryAccountId: string, adminKey: string, supplyKey: string)`

Creates a new token on the Hedera network.

### `mintNFT(tokenId: string, metadata: string)`

Mints a new NFT for the specified token.

### `getMessages(topicId: string, collectedMessages: Message[], lastTimestamp?: number, disableTimestampFilter: boolean = false, nextUrl?: string)`

Retrieves messages from a specified topic.

### `connectWallet(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata)`

Helper function to connect to the wallet.

### `disconnectWallet(clearStorage: boolean = true)`

Helper function to disconnect and optionally wipe local storage.

### `initAccount(PROJECT_ID: string, APP_METADATA: SignClientTypes.Metadata)`

Helper function to initialize the SDK from localStorage.

## Versions and Topic IDs

| Version | Topic ID    |
| ------- | ----------- |
| v0.0.1  | 0.0.6790163 |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).