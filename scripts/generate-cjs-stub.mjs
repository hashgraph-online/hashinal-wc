import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cjsStub = `/**
 * CommonJS stub for hashinal-wc
 * This allows the package to be imported in CommonJS environments
 */

// Re-export everything from the ES module build
const esmModule = require('../es/index.js');

module.exports = esmModule;
module.exports.default = esmModule.HashinalsWalletConnectSDK;
`;

const outputDir = resolve(__dirname, '../dist/cjs');
const outputPath = resolve(outputDir, 'hashinal-wc.cjs');

try {
  // Create the directory if it doesn't exist
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, cjsStub, 'utf-8');
  console.log('✓ CJS stub generated successfully');
} catch (error) {
  console.error('Failed to generate CJS stub:', error);
  process.exit(1);
}
