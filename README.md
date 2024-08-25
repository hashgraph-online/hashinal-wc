# Hashinals WalletConnect SDK

This SDK provides a simple interface for interacting with the Hedera Hashgraph using WalletConnect. It allows developers to easily integrate Hedera functionality into inscribed HTML files by injecting the SDK into the window.

This SDK can be utilized as a module through NPM, or recursively imported in an inscribed HTML file.

## Features

- Initialize and connect to WalletConnect
- Submit messages to Hedera topics
- Transfer HBAR between accounts
- Execute smart contracts
- Create topics and tokens
- Mint NFTs
- Fetch account balance and information
- Retrieve messages from a topic
- Transfer tokens between accounts
- Create accounts
- Associate tokens with accounts
- Dissociate tokens from accounts
- Update account properties
- Approve token allowances

## Installation

Skip this step if you're using the SDK in an inscribed HTML file.

```bash
npm install @hashgraphonline/hashinals-wc
```

```javascript
 import { HashinalsWalletConnectSDK } from '@hashgraphonline/hashinals-wc';
```

## Usage

The script located in the dist folder can be used directly, but it's primarily intended to be integrated with an inscribed Topic ID via the [Recursion SDK](https://github.com/hashgraph-online/hcs-recursion-sdk).

To use this script, ensure that you reference the current version's Topic ID in your HTML.

```html
<script data-src="hcs://1/0.0.6843009" data-script-id="wallet-connect"></script>
```

Later in your code, access the SDK.

```javascript
// Connect the user's wallet and store their Account Id in local storage in a single step.
    const { balance, accountId } = await sdk.connectWallet(
      PROJECT_ID,
      APP_METADATA
    );

// Use various SDK functions
await HashinalsWalletConnectSDK.submitMessageToTopic(topicId, message);
await HashinalsWalletConnectSDK.transferHbar(fromAccountId, toAccountId, amount);
// ... and more
```

## SDK Reference

### `init(projectId: string, metadata: SignClientTypes.Metadata, network?: LedgerId)`

Initializes the SDK with the given project ID, metadata, and optional network selection.

```javascript
await window.HashinalsWalletConnectSDK.init(
  "your-project-id",
  {
    name: "Your dApp",
    description: "Your dApp description",
    url: "https://yourdapp.com",
    icons: ["https://yourdapp.com/icon.png"]
  },
  LedgerId.TESTNET
);
```

### `connect()`

Opens the WalletConnect modal for users to connect their wallet.

```javascript
const session = await window.HashinalsWalletConnectSDK.connect();
```

### `disconnect()`

Disconnects from all connected wallets.

```javascript
await window.HashinalsWalletConnectSDK.disconnect();
```

### `submitMessageToTopic(topicId: string, message: string, submitKey?: PrivateKey)`

Submits a message to a specified Hedera topic.

```javascript
await window.HashinalsWalletConnectSDK.submitMessageToTopic('0.0.1234567', 'Hello, Hedera!');
```

### `transferHbar(fromAccountId: string, toAccountId: string, amount: number)`

Transfers HBAR from one account to another.

```javascript
await window.HashinalsWalletConnectSDK.transferHbar('0.0.1234567', '0.0.7890123', 10);
```

### `executeSmartContract(contractId: string, functionName: string, parameters: ContractFunctionParameters, gas: number = 100000)`

Executes a function on a smart contract.

```javascript
const parameters = [
  { type: 'string', value: 'Hello, Hedera!' }
];
await window.HashinalsWalletConnectSDK.executeSmartContract('0.0.1234567', 'hello', parameters);
```

### `getAccountBalance()`

Retrieves the HBAR balance of the connected account.

```javascript
const balance = await window.HashinalsWalletConnectSDK.getAccountBalance();
console.log(`Account balance: ${balance}`);
```

### `getAccountInfo()`

Fetches the account ID of the connected wallet.

```javascript
const accountId = await window.HashinalsWalletConnectSDK.getAccountInfo();
console.log(`Account ID: ${accountId}`);
```

### `createTopic(memo?: string, adminKey?: string, submitKey?: string)`

Creates a new topic on the Hedera network.

```javascript
await window.HashinalsWalletConnectSDK.createTopic('My new topic', '0.0.1234567', '0.0.7890123');
```

### `createToken(name: string, symbol: string, initialSupply: number, decimals: number, treasuryAccountId: string, adminKey: string, supplyKey: string)`

Creates a new token on the Hedera network.

```javascript
await window.HashinalsWalletConnectSDK.createToken('My Token', 'MYT', 1000000, 2, '0.0.1234567', '0.0.1234567', '0.0.7890123');
```

### `mintNFT(tokenId: string, metadata: string, supplyKey: PrivateKey)`

Mints a new NFT for an existing token.

```javascript
const metadata = JSON.stringify({
  name: 'My NFT',
  description: 'This is my NFT',
  image: 'https://example.com/nft.jpg'
});
await window.HashinalsWalletConnectSDK.mintNFT('0.0.1234567', metadata, '0.0.7890123');
```

### `getMessages(topicId: string, lastTimestamp?: number, disableTimestampFilter: boolean = false)`

Retrieves messages from a specific Hedera topic.

```javascript
const messages = await window.HashinalsWalletConnectSDK.getMessages('0.0.1234567');
console.log(messages);
```

### `transferToken(tokenId: string, fromAccountId: string, toAccountId: string, amount: number)`

Transfers tokens between accounts.

```javascript
await window.HashinalsWalletConnectSDK.transferToken('0.0.1234567', '0.0.1234567', '0.0.7890123', 10);
```

### `createAccount(initialBalance: number)`

Creates a new account on the Hedera network.

```javascript
await window.HashinalsWalletConnectSDK.createAccount(100);
```

### `associateTokenToAccount(accountId: string, tokenId: string)`

Associates a token with an account.

```javascript
await window.HashinalsWalletConnectSDK.associateTokenToAccount('0.0.1234567', '0.0.7890123');
```

### `dissociateTokenFromAccount(accountId: string, tokenId: string)`

Removes a token association from an account.

```javascript
await window.HashinalsWalletConnectSDK.dissociateTokenFromAccount('0.0.1234567', '0.0.7890123');
```

### `updateAccount(accountId: string, maxAutomaticTokenAssociations: number)`

Updates an account's properties.

```javascript
await window.HashinalsWalletConnectSDK.updateAccount('0.0.1234567', 10);
```

### `approveAllowance(spenderAccountId: string, tokenId: string, amount: number, ownerAccountId: string)`

Approves an allowance for token spending.

```javascript
await window.HashinalsWalletConnectSDK.approveAllowance('0.0.1234567', '0.0.7890123', 10, '0.0.1234567');
```

### `getAccountTokens(accountId: string)`

Retrieves all tokens associated with an account.

```javascript
const tokens = await window.HashinalsWalletConnectSDK.getAccountTokens('0.0.1234567');
console.log(tokens);
```

## Versions and Topic IDs
Version 1.0.4 and onward correlate with the NPM Package version.

| Version | Topic ID    | Type |
| ------- | ----------- | ----------- |
| v0.0.1  | 0.0.6790163 | UMD |
| v1.0.4  | 0.0.6843009 | UMD |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).