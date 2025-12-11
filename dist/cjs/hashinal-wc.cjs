/**
 * CommonJS stub for hashinal-wc
 * This allows the package to be imported in CommonJS environments
 */

// Re-export everything from the ES module build
const esmModule = require('../es/index.js');

module.exports = esmModule;
module.exports.default = esmModule.HashinalsWalletConnectSDK;
