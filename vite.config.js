import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import StringReplace from 'vite-plugin-string-replace';
import dts from 'vite-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig(({ mode }) => {
  const format = process.env.BUILD_FORMAT || 'es';
  const outputDir = format === 'umd' ? 'dist/umd' : 'dist/es';
  const isEsm = format === 'es';

  // ESM does not bundle these to add flexibility e.g. for NextJS Apps.
  const externalDependencies = [
    ...(isEsm ? [] : ['@hashgraph/hedera-wallet-connect']),
    '@hashgraph/proto',
    '@hashgraph/sdk',
    '@walletconnect/modal',
    '@walletconnect/core',
    '@walletconnect/modal-core',
    '@walletconnect/qrcode-modal',
    '@walletconnect/utils',
    'fetch-retry',
  ];

  const plugins = [
    nodePolyfills(),
    StringReplace([
      {
        search: 'VITE_BUILD_FORMAT',
        replace: format,
      },
    ]),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*.ts'],
      outputDir: outputDir,
    }),
  ];

  // Only add commonjs plugin for ESM build
  if (isEsm) {
    plugins.push(
      commonjs({
        include: /node_modules\/@hashgraph\/hedera-wallet-connect/,
      })
    );
  }

  return {
    plugins,
    build: {
      outDir: outputDir,
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'HashinalsWalletConnectSDK',
        fileName: (format) => `hashinal-wc.${format}.js`,
        formats: [format],
      },
      rollupOptions: {
        external: format === 'es' ? externalDependencies : [],
        output: {
          globals: (id) => id,
        },
      },
      commonjsOptions: {
        include: [/node_modules/],
      },
      minify: 'terser',
      sourcemap: true,
    },
    define: {
      VITE_BUILD_FORMAT: JSON.stringify(format),
    },
    resolve: {
      alias: {
        process: 'process/browser',
        stream: 'stream-browserify',
        zlib: 'browserify-zlib',
        util: 'util',
      },
    },
    ssr: {
      external: externalDependencies,
    },
  };
});
