import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import StringReplace from 'vite-plugin-string-replace';
import dts from 'vite-plugin-dts';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig(({ mode }) => {
  const format = process.env.BUILD_FORMAT || 'es';
  const outputDir =
    format === 'umd' ? 'dist/umd' : format === 'cjs' ? 'dist/cjs' : 'dist/es';
  const isEsm = format === 'es';
  const isCjs = format === 'cjs';
  const isUmd = format === 'umd';
  const cjsBanner = isCjs
    ? `
(function ensureHashinalSsrGlobals() {
  if (typeof globalThis === 'undefined') return;
  if (typeof globalThis.window === 'undefined') {
    globalThis.window = globalThis;
  }
  if (typeof globalThis.matchMedia === 'undefined') {
    globalThis.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  }
  if (typeof globalThis.HTMLElement === 'undefined') {
    globalThis.HTMLElement = class {};
  }
  if (typeof globalThis.customElements === 'undefined') {
    const noop = () => {};
    globalThis.customElements = {
      define: noop,
      get: () => undefined,
      whenDefined: () => Promise.resolve(),
    };
  }
  if (typeof globalThis.document === 'undefined') {
    const noop = () => {};
    const createElement = () => ({
      style: {},
      appendChild: noop,
      setAttribute: noop,
      removeAttribute: noop,
      addEventListener: noop,
      removeEventListener: noop,
    });
    globalThis.document = {
      createElement,
      createComment: () => ({}),
      createTextNode: () => ({}),
      createTreeWalker: () => ({ currentNode: null, nextNode: () => null }),
      importNode: (node) => node,
      body: { appendChild: noop, removeChild: noop },
      head: { appendChild: noop, removeChild: noop },
    };
  }
})();
`.trim()
    : undefined;

  // ESM does not bundle these to add flexibility e.g. for NextJS Apps.
  const externalDependencies = [
    '@hashgraph/hedera-wallet-connect',
    '@hashgraph/proto',
    '@hashgraph/sdk',
    '@walletconnect/core',
    '@walletconnect/universal-provider',
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

  // Add commonjs plugin when we need to interop with CJS dependencies
  if (isEsm || isCjs) {
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
        fileName: (fmt) =>
          fmt === 'umd'
            ? `hashinal-wc.umd.js`
            : fmt === 'cjs'
              ? `hashinal-wc.cjs`
              : `index.js`,
        formats: [format],
      },
      rollupOptions: {
        external: isUmd
          ? []
          : (id) => {
              if (id.startsWith('.') || path.isAbsolute(id)) {
                return false;
              }
              return true;
            },
        treeshake: {
          moduleSideEffects: true,
        },
        output: {
          globals: (id) => id,
          exports: isCjs ? 'named' : undefined,
          banner: cjsBanner,
          preserveModules: isEsm,
          preserveModulesRoot: isEsm ? 'src' : undefined,
          entryFileNames: isEsm
            ? '[name].js'
            : isUmd
              ? 'hashinal-wc.umd.js'
              : isCjs
                ? 'hashinal-wc.cjs'
                : undefined,
          chunkFileNames: isEsm ? '[name].js' : undefined,
        },
      },
      commonjsOptions: {
        include: [/node_modules/],
      },
      minify: isUmd ? 'esbuild' : false,
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
