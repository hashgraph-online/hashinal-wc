import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import StringReplace from 'vite-plugin-string-replace';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => {
  const format = process.env.BUILD_FORMAT || 'es';
  const outputDir = format === 'umd' ? 'dist/umd' : 'dist/es';

  // ESM does not bundle these to add flexibility e.g. for NextJS Apps.
  const externalDependencies = [
    '@hashgraph/hedera-wallet-connect',
    '@hashgraph/proto',
    '@hashgraph/sdk',
    '@walletconnect/modal',
    '@walletconnect/modal-core',
    '@walletconnect/qrcode-modal',
    '@walletconnect/utils',
    'fetch-retry',
  ];

  return {
    plugins: [
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
    ],
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
