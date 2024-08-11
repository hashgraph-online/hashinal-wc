import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [nodePolyfills()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'HederaWalletConnectSDK',
      fileName: () => `hedera-wallet-connect-sdk.js`,
      formats: ['umd'],
    },
    rollupOptions: {
      external: [], // No externals, include everything
    },
    commonjsOptions: {
      include: [/node_modules/],
    },
    minify: 'terser',
    sourcemap: false,
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      process: 'process/browser',
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util',
    },
  },
});
