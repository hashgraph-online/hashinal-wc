import { defineConfig } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import StringReplace from 'vite-plugin-string-replace'

export default defineConfig(({ mode }) => {
  const format = process.env.BUILD_FORMAT || 'es';
  const outputDir = format === 'umd' ? 'dist/umd' : 'dist/es';

  console.log('format is', format);
  return {
    plugins: [nodePolyfills(),StringReplace([
      {
          search: 'VITE_BUILD_FORMAT', // search this string in content
          replace: format, // replace search string with this
      }])],
    build: {
      outDir: outputDir,
      lib: {
        entry: path.resolve(__dirname, 'src/index.ts'),
        name: 'HashinalsWalletConnectSDK',
        fileName: (format) => `hashinal-wc.${format}.js`,
        formats: [format],
      },
      rollupOptions: {
        external: [],
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
      'VITE_BUILD_FORMAT': JSON.stringify(format),
    },
    resolve: {
      alias: {
        process: 'process/browser',
        stream: 'stream-browserify',
        zlib: 'browserify-zlib',
        util: 'util',
      },
    },
  };
});
