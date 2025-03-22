import * as HashgraphSDK from "@hashgraph/sdk";
import { LedgerId, AccountId, Client, AccountBalanceQuery, AccountInfoQuery, AccountRecordsQuery, SignerSignature, PublicKey, TransactionId, Transaction, TransactionResponse, TransactionRecord, AccountBalance, AccountInfo, TransactionReceiptQuery, TransactionReceipt, TransactionRecordQuery, Query, TopicMessageSubmitTransaction, TopicId, TransferTransaction, Hbar, ContractExecuteTransaction, ContractId, TopicCreateTransaction, PrivateKey, TokenCreateTransaction, TokenType, TokenSupplyType, TokenMintTransaction, TokenId, AccountCreateTransaction, TokenAssociateTransaction, TokenDissociateTransaction, AccountUpdateTransaction, AccountAllowanceApproveTransaction, TopicUpdateTransaction } from "@hashgraph/sdk";
import { proto } from "@hashgraph/proto";
import { Core, RELAYER_DEFAULT_PROTOCOL, TRANSPORT_TYPES, EVENT_CLIENT_SESSION_TRACES, EVENT_CLIENT_SESSION_ERRORS, EVENT_CLIENT_AUTHENTICATE_TRACES, EVENT_CLIENT_AUTHENTICATE_ERRORS, EVENT_CLIENT_PAIRING_ERRORS, EVENT_CLIENT_PAIRING_TRACES, RELAYER_EVENTS, VERIFY_SERVER, EXPIRER_EVENTS, PAIRING_EVENTS, Store } from "@walletconnect/core";
import { getAppMetadata, getInternalError, calcExpiry, createDelayedPromise, engineEvent, getSdkError, getDeepLink, handleDeeplinkRedirect, isSessionCompatible, hashKey, parseChainId, createEncodedRecap, getRecapFromResources, mergeEncodedRecaps, TYPE_2, BASE64URL, getLinkModeURL, validateSignedCacao, getNamespacedDidChainId, getDidAddress, getMethodsFromRecap, getChainsFromRecap, buildNamespacesFromAuth, formatMessage, BASE64, hashMessage, isExpired, MemoryStore, isValidParams, isUndefined, isValidRelays, isValidObject, isValidRequiredNamespaces, isValidNamespaces, isConformingNamespaces, isValidString, isValidErrorReason, isValidRelay, isValidController, isValidNamespacesChainId, isValidRequest, isValidNamespacesRequest, isValidRequestExpiry, isValidResponse, isValidEvent, isValidNamespacesEvent, getSearchParamFromURL, isTestRun, isReactNative, parseExpirerTarget, isValidId, TYPE_1 } from "@walletconnect/utils";
import QRCodeModal from "@walletconnect/qrcode-modal";
import { WalletConnectModal } from "@walletconnect/modal";
import retryFetch from "fetch-retry";
var buffer = {};
var base64Js = {};
base64Js.byteLength = byteLength;
base64Js.toByteArray = toByteArray;
base64Js.fromByteArray = fromByteArray;
var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== "undefined" ? Uint8Array : Array;
var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (var i$1 = 0, len = code.length; i$1 < len; ++i$1) {
  lookup[i$1] = code[i$1];
  revLookup[code.charCodeAt(i$1)] = i$1;
}
revLookup["-".charCodeAt(0)] = 62;
revLookup["_".charCodeAt(0)] = 63;
function getLens(b64) {
  var len = b64.length;
  if (len % 4 > 0) {
    throw new Error("Invalid string. Length must be a multiple of 4");
  }
  var validLen = b64.indexOf("=");
  if (validLen === -1) validLen = len;
  var placeHoldersLen = validLen === len ? 0 : 4 - validLen % 4;
  return [validLen, placeHoldersLen];
}
function byteLength(b64) {
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}
function _byteLength(b64, validLen, placeHoldersLen) {
  return (validLen + placeHoldersLen) * 3 / 4 - placeHoldersLen;
}
function toByteArray(b64) {
  var tmp;
  var lens = getLens(b64);
  var validLen = lens[0];
  var placeHoldersLen = lens[1];
  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen));
  var curByte = 0;
  var len = placeHoldersLen > 0 ? validLen - 4 : validLen;
  var i2;
  for (i2 = 0; i2 < len; i2 += 4) {
    tmp = revLookup[b64.charCodeAt(i2)] << 18 | revLookup[b64.charCodeAt(i2 + 1)] << 12 | revLookup[b64.charCodeAt(i2 + 2)] << 6 | revLookup[b64.charCodeAt(i2 + 3)];
    arr[curByte++] = tmp >> 16 & 255;
    arr[curByte++] = tmp >> 8 & 255;
    arr[curByte++] = tmp & 255;
  }
  if (placeHoldersLen === 2) {
    tmp = revLookup[b64.charCodeAt(i2)] << 2 | revLookup[b64.charCodeAt(i2 + 1)] >> 4;
    arr[curByte++] = tmp & 255;
  }
  if (placeHoldersLen === 1) {
    tmp = revLookup[b64.charCodeAt(i2)] << 10 | revLookup[b64.charCodeAt(i2 + 1)] << 4 | revLookup[b64.charCodeAt(i2 + 2)] >> 2;
    arr[curByte++] = tmp >> 8 & 255;
    arr[curByte++] = tmp & 255;
  }
  return arr;
}
function tripletToBase64(num) {
  return lookup[num >> 18 & 63] + lookup[num >> 12 & 63] + lookup[num >> 6 & 63] + lookup[num & 63];
}
function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];
  for (var i2 = start; i2 < end; i2 += 3) {
    tmp = (uint8[i2] << 16 & 16711680) + (uint8[i2 + 1] << 8 & 65280) + (uint8[i2 + 2] & 255);
    output.push(tripletToBase64(tmp));
  }
  return output.join("");
}
function fromByteArray(uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3;
  var parts = [];
  var maxChunkLength = 16383;
  for (var i2 = 0, len2 = len - extraBytes; i2 < len2; i2 += maxChunkLength) {
    parts.push(encodeChunk(uint8, i2, i2 + maxChunkLength > len2 ? len2 : i2 + maxChunkLength));
  }
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    parts.push(
      lookup[tmp >> 2] + lookup[tmp << 4 & 63] + "=="
    );
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    parts.push(
      lookup[tmp >> 10] + lookup[tmp >> 4 & 63] + lookup[tmp << 2 & 63] + "="
    );
  }
  return parts.join("");
}
var ieee754 = {};
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
ieee754.read = function(buffer2, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i2 = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer2[offset + i2];
  i2 += d;
  e = s & (1 << -nBits) - 1;
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer2[offset + i2], i2 += d, nBits -= 8) {
  }
  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer2[offset + i2], i2 += d, nBits -= 8) {
  }
  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};
ieee754.write = function(buffer2, value, offset, isLE, mLen, nBytes) {
  var e, m, c2;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt2 = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i2 = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;
  value = Math.abs(value);
  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c2 = Math.pow(2, -e)) < 1) {
      e--;
      c2 *= 2;
    }
    if (e + eBias >= 1) {
      value += rt2 / c2;
    } else {
      value += rt2 * Math.pow(2, 1 - eBias);
    }
    if (value * c2 >= 2) {
      e++;
      c2 /= 2;
    }
    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c2 - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }
  for (; mLen >= 8; buffer2[offset + i2] = m & 255, i2 += d, m /= 256, mLen -= 8) {
  }
  e = e << mLen | m;
  eLen += mLen;
  for (; eLen > 0; buffer2[offset + i2] = e & 255, i2 += d, e /= 256, eLen -= 8) {
  }
  buffer2[offset + i2 - d] |= s * 128;
};
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
(function(exports) {
  const base64 = base64Js;
  const ieee754$1 = ieee754;
  const customInspectSymbol = typeof Symbol === "function" && typeof Symbol["for"] === "function" ? Symbol["for"]("nodejs.util.inspect.custom") : null;
  exports.Buffer = Buffer2;
  exports.SlowBuffer = SlowBuffer2;
  exports.INSPECT_MAX_BYTES = 50;
  const K_MAX_LENGTH = 2147483647;
  exports.kMaxLength = K_MAX_LENGTH;
  const { Uint8Array: GlobalUint8Array, ArrayBuffer: GlobalArrayBuffer, SharedArrayBuffer: GlobalSharedArrayBuffer } = globalThis;
  Buffer2.TYPED_ARRAY_SUPPORT = typedArraySupport();
  if (!Buffer2.TYPED_ARRAY_SUPPORT && typeof console !== "undefined" && typeof console.error === "function") {
    console.error(
      "This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."
    );
  }
  function typedArraySupport() {
    try {
      const arr = new GlobalUint8Array(1);
      const proto2 = { foo: function() {
        return 42;
      } };
      Object.setPrototypeOf(proto2, GlobalUint8Array.prototype);
      Object.setPrototypeOf(arr, proto2);
      return arr.foo() === 42;
    } catch (e) {
      return false;
    }
  }
  Object.defineProperty(Buffer2.prototype, "parent", {
    enumerable: true,
    get: function() {
      if (!Buffer2.isBuffer(this)) return void 0;
      return this.buffer;
    }
  });
  Object.defineProperty(Buffer2.prototype, "offset", {
    enumerable: true,
    get: function() {
      if (!Buffer2.isBuffer(this)) return void 0;
      return this.byteOffset;
    }
  });
  function createBuffer(length) {
    if (length > K_MAX_LENGTH) {
      throw new RangeError('The value "' + length + '" is invalid for option "size"');
    }
    const buf = new GlobalUint8Array(length);
    Object.setPrototypeOf(buf, Buffer2.prototype);
    return buf;
  }
  function Buffer2(arg, encodingOrOffset, length) {
    if (typeof arg === "number") {
      if (typeof encodingOrOffset === "string") {
        throw new TypeError(
          'The "string" argument must be of type string. Received type number'
        );
      }
      return allocUnsafe(arg);
    }
    return from(arg, encodingOrOffset, length);
  }
  Buffer2.poolSize = 8192;
  function from(value, encodingOrOffset, length) {
    if (typeof value === "string") {
      return fromString(value, encodingOrOffset);
    }
    if (GlobalArrayBuffer.isView(value)) {
      return fromArrayView(value);
    }
    if (value == null) {
      throw new TypeError(
        "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
      );
    }
    if (isInstance(value, GlobalArrayBuffer) || value && isInstance(value.buffer, GlobalArrayBuffer)) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof GlobalSharedArrayBuffer !== "undefined" && (isInstance(value, GlobalSharedArrayBuffer) || value && isInstance(value.buffer, GlobalSharedArrayBuffer))) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    if (typeof value === "number") {
      throw new TypeError(
        'The "value" argument must not be of type number. Received type number'
      );
    }
    const valueOf = value.valueOf && value.valueOf();
    if (valueOf != null && valueOf !== value) {
      return Buffer2.from(valueOf, encodingOrOffset, length);
    }
    const b2 = fromObject(value);
    if (b2) return b2;
    if (typeof Symbol !== "undefined" && Symbol.toPrimitive != null && typeof value[Symbol.toPrimitive] === "function") {
      return Buffer2.from(value[Symbol.toPrimitive]("string"), encodingOrOffset, length);
    }
    throw new TypeError(
      "The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof value
    );
  }
  Buffer2.from = function(value, encodingOrOffset, length) {
    return from(value, encodingOrOffset, length);
  };
  Object.setPrototypeOf(Buffer2.prototype, GlobalUint8Array.prototype);
  Object.setPrototypeOf(Buffer2, GlobalUint8Array);
  function assertSize(size) {
    if (typeof size !== "number") {
      throw new TypeError('"size" argument must be of type number');
    } else if (size < 0) {
      throw new RangeError('The value "' + size + '" is invalid for option "size"');
    }
  }
  function alloc(size, fill, encoding) {
    assertSize(size);
    if (size <= 0) {
      return createBuffer(size);
    }
    if (fill !== void 0) {
      return typeof encoding === "string" ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
    }
    return createBuffer(size);
  }
  Buffer2.alloc = function(size, fill, encoding) {
    return alloc(size, fill, encoding);
  };
  function allocUnsafe(size) {
    assertSize(size);
    return createBuffer(size < 0 ? 0 : checked(size) | 0);
  }
  Buffer2.allocUnsafe = function(size) {
    return allocUnsafe(size);
  };
  Buffer2.allocUnsafeSlow = function(size) {
    return allocUnsafe(size);
  };
  function fromString(string, encoding) {
    if (typeof encoding !== "string" || encoding === "") {
      encoding = "utf8";
    }
    if (!Buffer2.isEncoding(encoding)) {
      throw new TypeError("Unknown encoding: " + encoding);
    }
    const length = byteLength2(string, encoding) | 0;
    let buf = createBuffer(length);
    const actual = buf.write(string, encoding);
    if (actual !== length) {
      buf = buf.slice(0, actual);
    }
    return buf;
  }
  function fromArrayLike(array) {
    const length = array.length < 0 ? 0 : checked(array.length) | 0;
    const buf = createBuffer(length);
    for (let i2 = 0; i2 < length; i2 += 1) {
      buf[i2] = array[i2] & 255;
    }
    return buf;
  }
  function fromArrayView(arrayView) {
    if (isInstance(arrayView, GlobalUint8Array)) {
      const copy = new GlobalUint8Array(arrayView);
      return fromArrayBuffer(copy.buffer, copy.byteOffset, copy.byteLength);
    }
    return fromArrayLike(arrayView);
  }
  function fromArrayBuffer(array, byteOffset, length) {
    if (byteOffset < 0 || array.byteLength < byteOffset) {
      throw new RangeError('"offset" is outside of buffer bounds');
    }
    if (array.byteLength < byteOffset + (length || 0)) {
      throw new RangeError('"length" is outside of buffer bounds');
    }
    let buf;
    if (byteOffset === void 0 && length === void 0) {
      buf = new GlobalUint8Array(array);
    } else if (length === void 0) {
      buf = new GlobalUint8Array(array, byteOffset);
    } else {
      buf = new GlobalUint8Array(array, byteOffset, length);
    }
    Object.setPrototypeOf(buf, Buffer2.prototype);
    return buf;
  }
  function fromObject(obj) {
    if (Buffer2.isBuffer(obj)) {
      const len = checked(obj.length) | 0;
      const buf = createBuffer(len);
      if (buf.length === 0) {
        return buf;
      }
      obj.copy(buf, 0, 0, len);
      return buf;
    }
    if (obj.length !== void 0) {
      if (typeof obj.length !== "number" || numberIsNaN(obj.length)) {
        return createBuffer(0);
      }
      return fromArrayLike(obj);
    }
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data);
    }
  }
  function checked(length) {
    if (length >= K_MAX_LENGTH) {
      throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + K_MAX_LENGTH.toString(16) + " bytes");
    }
    return length | 0;
  }
  function SlowBuffer2(length) {
    if (+length != length) {
      length = 0;
    }
    return Buffer2.alloc(+length);
  }
  Buffer2.isBuffer = function isBuffer(b2) {
    return b2 != null && b2._isBuffer === true && b2 !== Buffer2.prototype;
  };
  Buffer2.compare = function compare(a, b2) {
    if (isInstance(a, GlobalUint8Array)) a = Buffer2.from(a, a.offset, a.byteLength);
    if (isInstance(b2, GlobalUint8Array)) b2 = Buffer2.from(b2, b2.offset, b2.byteLength);
    if (!Buffer2.isBuffer(a) || !Buffer2.isBuffer(b2)) {
      throw new TypeError(
        'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
      );
    }
    if (a === b2) return 0;
    let x2 = a.length;
    let y2 = b2.length;
    for (let i2 = 0, len = Math.min(x2, y2); i2 < len; ++i2) {
      if (a[i2] !== b2[i2]) {
        x2 = a[i2];
        y2 = b2[i2];
        break;
      }
    }
    if (x2 < y2) return -1;
    if (y2 < x2) return 1;
    return 0;
  };
  Buffer2.isEncoding = function isEncoding(encoding) {
    switch (String(encoding).toLowerCase()) {
      case "hex":
      case "utf8":
      case "utf-8":
      case "ascii":
      case "latin1":
      case "binary":
      case "base64":
      case "ucs2":
      case "ucs-2":
      case "utf16le":
      case "utf-16le":
        return true;
      default:
        return false;
    }
  };
  Buffer2.concat = function concat(list, length) {
    if (!Array.isArray(list)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }
    if (list.length === 0) {
      return Buffer2.alloc(0);
    }
    let i2;
    if (length === void 0) {
      length = 0;
      for (i2 = 0; i2 < list.length; ++i2) {
        length += list[i2].length;
      }
    }
    const buffer2 = Buffer2.allocUnsafe(length);
    let pos = 0;
    for (i2 = 0; i2 < list.length; ++i2) {
      let buf = list[i2];
      if (isInstance(buf, GlobalUint8Array)) {
        if (pos + buf.length > buffer2.length) {
          if (!Buffer2.isBuffer(buf)) buf = Buffer2.from(buf);
          buf.copy(buffer2, pos);
        } else {
          GlobalUint8Array.prototype.set.call(
            buffer2,
            buf,
            pos
          );
        }
      } else if (!Buffer2.isBuffer(buf)) {
        throw new TypeError('"list" argument must be an Array of Buffers');
      } else {
        buf.copy(buffer2, pos);
      }
      pos += buf.length;
    }
    return buffer2;
  };
  function byteLength2(string, encoding) {
    if (Buffer2.isBuffer(string)) {
      return string.length;
    }
    if (GlobalArrayBuffer.isView(string) || isInstance(string, GlobalArrayBuffer)) {
      return string.byteLength;
    }
    if (typeof string !== "string") {
      throw new TypeError(
        'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof string
      );
    }
    const len = string.length;
    const mustMatch = arguments.length > 2 && arguments[2] === true;
    if (!mustMatch && len === 0) return 0;
    let loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case "ascii":
        case "latin1":
        case "binary":
          return len;
        case "utf8":
        case "utf-8":
          return utf8ToBytes(string).length;
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return len * 2;
        case "hex":
          return len >>> 1;
        case "base64":
          return base64ToBytes(string).length;
        default:
          if (loweredCase) {
            return mustMatch ? -1 : utf8ToBytes(string).length;
          }
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer2.byteLength = byteLength2;
  function slowToString(encoding, start, end) {
    let loweredCase = false;
    if (start === void 0 || start < 0) {
      start = 0;
    }
    if (start > this.length) {
      return "";
    }
    if (end === void 0 || end > this.length) {
      end = this.length;
    }
    if (end <= 0) {
      return "";
    }
    end >>>= 0;
    start >>>= 0;
    if (end <= start) {
      return "";
    }
    if (!encoding) encoding = "utf8";
    while (true) {
      switch (encoding) {
        case "hex":
          return hexSlice(this, start, end);
        case "utf8":
        case "utf-8":
          return utf8Slice(this, start, end);
        case "ascii":
          return asciiSlice(this, start, end);
        case "latin1":
        case "binary":
          return latin1Slice(this, start, end);
        case "base64":
          return base64Slice(this, start, end);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return utf16leSlice(this, start, end);
        default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = (encoding + "").toLowerCase();
          loweredCase = true;
      }
    }
  }
  Buffer2.prototype._isBuffer = true;
  function swap(b2, n2, m) {
    const i2 = b2[n2];
    b2[n2] = b2[m];
    b2[m] = i2;
  }
  Buffer2.prototype.swap16 = function swap16() {
    const len = this.length;
    if (len % 2 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 16-bits");
    }
    for (let i2 = 0; i2 < len; i2 += 2) {
      swap(this, i2, i2 + 1);
    }
    return this;
  };
  Buffer2.prototype.swap32 = function swap32() {
    const len = this.length;
    if (len % 4 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 32-bits");
    }
    for (let i2 = 0; i2 < len; i2 += 4) {
      swap(this, i2, i2 + 3);
      swap(this, i2 + 1, i2 + 2);
    }
    return this;
  };
  Buffer2.prototype.swap64 = function swap64() {
    const len = this.length;
    if (len % 8 !== 0) {
      throw new RangeError("Buffer size must be a multiple of 64-bits");
    }
    for (let i2 = 0; i2 < len; i2 += 8) {
      swap(this, i2, i2 + 7);
      swap(this, i2 + 1, i2 + 6);
      swap(this, i2 + 2, i2 + 5);
      swap(this, i2 + 3, i2 + 4);
    }
    return this;
  };
  Buffer2.prototype.toString = function toString() {
    const length = this.length;
    if (length === 0) return "";
    if (arguments.length === 0) return utf8Slice(this, 0, length);
    return slowToString.apply(this, arguments);
  };
  Buffer2.prototype.toLocaleString = Buffer2.prototype.toString;
  Buffer2.prototype.equals = function equals(b2) {
    if (!Buffer2.isBuffer(b2)) throw new TypeError("Argument must be a Buffer");
    if (this === b2) return true;
    return Buffer2.compare(this, b2) === 0;
  };
  Buffer2.prototype.inspect = function inspect() {
    let str = "";
    const max = exports.INSPECT_MAX_BYTES;
    str = this.toString("hex", 0, max).replace(/(.{2})/g, "$1 ").trim();
    if (this.length > max) str += " ... ";
    return "<Buffer " + str + ">";
  };
  if (customInspectSymbol) {
    Buffer2.prototype[customInspectSymbol] = Buffer2.prototype.inspect;
  }
  Buffer2.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
    if (isInstance(target, GlobalUint8Array)) {
      target = Buffer2.from(target, target.offset, target.byteLength);
    }
    if (!Buffer2.isBuffer(target)) {
      throw new TypeError(
        'The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof target
      );
    }
    if (start === void 0) {
      start = 0;
    }
    if (end === void 0) {
      end = target ? target.length : 0;
    }
    if (thisStart === void 0) {
      thisStart = 0;
    }
    if (thisEnd === void 0) {
      thisEnd = this.length;
    }
    if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
      throw new RangeError("out of range index");
    }
    if (thisStart >= thisEnd && start >= end) {
      return 0;
    }
    if (thisStart >= thisEnd) {
      return -1;
    }
    if (start >= end) {
      return 1;
    }
    start >>>= 0;
    end >>>= 0;
    thisStart >>>= 0;
    thisEnd >>>= 0;
    if (this === target) return 0;
    let x2 = thisEnd - thisStart;
    let y2 = end - start;
    const len = Math.min(x2, y2);
    const thisCopy = this.slice(thisStart, thisEnd);
    const targetCopy = target.slice(start, end);
    for (let i2 = 0; i2 < len; ++i2) {
      if (thisCopy[i2] !== targetCopy[i2]) {
        x2 = thisCopy[i2];
        y2 = targetCopy[i2];
        break;
      }
    }
    if (x2 < y2) return -1;
    if (y2 < x2) return 1;
    return 0;
  };
  function bidirectionalIndexOf(buffer2, val, byteOffset, encoding, dir) {
    if (buffer2.length === 0) return -1;
    if (typeof byteOffset === "string") {
      encoding = byteOffset;
      byteOffset = 0;
    } else if (byteOffset > 2147483647) {
      byteOffset = 2147483647;
    } else if (byteOffset < -2147483648) {
      byteOffset = -2147483648;
    }
    byteOffset = +byteOffset;
    if (numberIsNaN(byteOffset)) {
      byteOffset = dir ? 0 : buffer2.length - 1;
    }
    if (byteOffset < 0) byteOffset = buffer2.length + byteOffset;
    if (byteOffset >= buffer2.length) {
      if (dir) return -1;
      else byteOffset = buffer2.length - 1;
    } else if (byteOffset < 0) {
      if (dir) byteOffset = 0;
      else return -1;
    }
    if (typeof val === "string") {
      val = Buffer2.from(val, encoding);
    }
    if (Buffer2.isBuffer(val)) {
      if (val.length === 0) {
        return -1;
      }
      return arrayIndexOf(buffer2, val, byteOffset, encoding, dir);
    } else if (typeof val === "number") {
      val = val & 255;
      if (typeof GlobalUint8Array.prototype.indexOf === "function") {
        if (dir) {
          return GlobalUint8Array.prototype.indexOf.call(buffer2, val, byteOffset);
        } else {
          return GlobalUint8Array.prototype.lastIndexOf.call(buffer2, val, byteOffset);
        }
      }
      return arrayIndexOf(buffer2, [val], byteOffset, encoding, dir);
    }
    throw new TypeError("val must be string, number or Buffer");
  }
  function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
    let indexSize = 1;
    let arrLength = arr.length;
    let valLength = val.length;
    if (encoding !== void 0) {
      encoding = String(encoding).toLowerCase();
      if (encoding === "ucs2" || encoding === "ucs-2" || encoding === "utf16le" || encoding === "utf-16le") {
        if (arr.length < 2 || val.length < 2) {
          return -1;
        }
        indexSize = 2;
        arrLength /= 2;
        valLength /= 2;
        byteOffset /= 2;
      }
    }
    function read(buf, i3) {
      if (indexSize === 1) {
        return buf[i3];
      } else {
        return buf.readUInt16BE(i3 * indexSize);
      }
    }
    let i2;
    if (dir) {
      let foundIndex = -1;
      for (i2 = byteOffset; i2 < arrLength; i2++) {
        if (read(arr, i2) === read(val, foundIndex === -1 ? 0 : i2 - foundIndex)) {
          if (foundIndex === -1) foundIndex = i2;
          if (i2 - foundIndex + 1 === valLength) return foundIndex * indexSize;
        } else {
          if (foundIndex !== -1) i2 -= i2 - foundIndex;
          foundIndex = -1;
        }
      }
    } else {
      if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
      for (i2 = byteOffset; i2 >= 0; i2--) {
        let found = true;
        for (let j = 0; j < valLength; j++) {
          if (read(arr, i2 + j) !== read(val, j)) {
            found = false;
            break;
          }
        }
        if (found) return i2;
      }
    }
    return -1;
  }
  Buffer2.prototype.includes = function includes(val, byteOffset, encoding) {
    return this.indexOf(val, byteOffset, encoding) !== -1;
  };
  Buffer2.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
  };
  Buffer2.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
    return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
  };
  function hexWrite(buf, string, offset, length) {
    offset = Number(offset) || 0;
    const remaining = buf.length - offset;
    if (!length) {
      length = remaining;
    } else {
      length = Number(length);
      if (length > remaining) {
        length = remaining;
      }
    }
    const strLen = string.length;
    if (length > strLen / 2) {
      length = strLen / 2;
    }
    let i2;
    for (i2 = 0; i2 < length; ++i2) {
      const parsed = parseInt(string.substr(i2 * 2, 2), 16);
      if (numberIsNaN(parsed)) return i2;
      buf[offset + i2] = parsed;
    }
    return i2;
  }
  function utf8Write(buf, string, offset, length) {
    return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
  }
  function asciiWrite(buf, string, offset, length) {
    return blitBuffer(asciiToBytes(string), buf, offset, length);
  }
  function base64Write(buf, string, offset, length) {
    return blitBuffer(base64ToBytes(string), buf, offset, length);
  }
  function ucs2Write(buf, string, offset, length) {
    return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
  }
  Buffer2.prototype.write = function write(string, offset, length, encoding) {
    if (offset === void 0) {
      encoding = "utf8";
      length = this.length;
      offset = 0;
    } else if (length === void 0 && typeof offset === "string") {
      encoding = offset;
      length = this.length;
      offset = 0;
    } else if (isFinite(offset)) {
      offset = offset >>> 0;
      if (isFinite(length)) {
        length = length >>> 0;
        if (encoding === void 0) encoding = "utf8";
      } else {
        encoding = length;
        length = void 0;
      }
    } else {
      throw new Error(
        "Buffer.write(string, encoding, offset[, length]) is no longer supported"
      );
    }
    const remaining = this.length - offset;
    if (length === void 0 || length > remaining) length = remaining;
    if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
      throw new RangeError("Attempt to write outside buffer bounds");
    }
    if (!encoding) encoding = "utf8";
    let loweredCase = false;
    for (; ; ) {
      switch (encoding) {
        case "hex":
          return hexWrite(this, string, offset, length);
        case "utf8":
        case "utf-8":
          return utf8Write(this, string, offset, length);
        case "ascii":
        case "latin1":
        case "binary":
          return asciiWrite(this, string, offset, length);
        case "base64":
          return base64Write(this, string, offset, length);
        case "ucs2":
        case "ucs-2":
        case "utf16le":
        case "utf-16le":
          return ucs2Write(this, string, offset, length);
        default:
          if (loweredCase) throw new TypeError("Unknown encoding: " + encoding);
          encoding = ("" + encoding).toLowerCase();
          loweredCase = true;
      }
    }
  };
  Buffer2.prototype.toJSON = function toJSON() {
    return {
      type: "Buffer",
      data: Array.prototype.slice.call(this._arr || this, 0)
    };
  };
  function base64Slice(buf, start, end) {
    if (start === 0 && end === buf.length) {
      return base64.fromByteArray(buf);
    } else {
      return base64.fromByteArray(buf.slice(start, end));
    }
  }
  function utf8Slice(buf, start, end) {
    end = Math.min(buf.length, end);
    const res = [];
    let i2 = start;
    while (i2 < end) {
      const firstByte = buf[i2];
      let codePoint = null;
      let bytesPerSequence = firstByte > 239 ? 4 : firstByte > 223 ? 3 : firstByte > 191 ? 2 : 1;
      if (i2 + bytesPerSequence <= end) {
        let secondByte, thirdByte, fourthByte, tempCodePoint;
        switch (bytesPerSequence) {
          case 1:
            if (firstByte < 128) {
              codePoint = firstByte;
            }
            break;
          case 2:
            secondByte = buf[i2 + 1];
            if ((secondByte & 192) === 128) {
              tempCodePoint = (firstByte & 31) << 6 | secondByte & 63;
              if (tempCodePoint > 127) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 3:
            secondByte = buf[i2 + 1];
            thirdByte = buf[i2 + 2];
            if ((secondByte & 192) === 128 && (thirdByte & 192) === 128) {
              tempCodePoint = (firstByte & 15) << 12 | (secondByte & 63) << 6 | thirdByte & 63;
              if (tempCodePoint > 2047 && (tempCodePoint < 55296 || tempCodePoint > 57343)) {
                codePoint = tempCodePoint;
              }
            }
            break;
          case 4:
            secondByte = buf[i2 + 1];
            thirdByte = buf[i2 + 2];
            fourthByte = buf[i2 + 3];
            if ((secondByte & 192) === 128 && (thirdByte & 192) === 128 && (fourthByte & 192) === 128) {
              tempCodePoint = (firstByte & 15) << 18 | (secondByte & 63) << 12 | (thirdByte & 63) << 6 | fourthByte & 63;
              if (tempCodePoint > 65535 && tempCodePoint < 1114112) {
                codePoint = tempCodePoint;
              }
            }
        }
      }
      if (codePoint === null) {
        codePoint = 65533;
        bytesPerSequence = 1;
      } else if (codePoint > 65535) {
        codePoint -= 65536;
        res.push(codePoint >>> 10 & 1023 | 55296);
        codePoint = 56320 | codePoint & 1023;
      }
      res.push(codePoint);
      i2 += bytesPerSequence;
    }
    return decodeCodePointsArray(res);
  }
  const MAX_ARGUMENTS_LENGTH = 4096;
  function decodeCodePointsArray(codePoints) {
    const len = codePoints.length;
    if (len <= MAX_ARGUMENTS_LENGTH) {
      return String.fromCharCode.apply(String, codePoints);
    }
    let res = "";
    let i2 = 0;
    while (i2 < len) {
      res += String.fromCharCode.apply(
        String,
        codePoints.slice(i2, i2 += MAX_ARGUMENTS_LENGTH)
      );
    }
    return res;
  }
  function asciiSlice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for (let i2 = start; i2 < end; ++i2) {
      ret += String.fromCharCode(buf[i2] & 127);
    }
    return ret;
  }
  function latin1Slice(buf, start, end) {
    let ret = "";
    end = Math.min(buf.length, end);
    for (let i2 = start; i2 < end; ++i2) {
      ret += String.fromCharCode(buf[i2]);
    }
    return ret;
  }
  function hexSlice(buf, start, end) {
    const len = buf.length;
    if (!start || start < 0) start = 0;
    if (!end || end < 0 || end > len) end = len;
    let out = "";
    for (let i2 = start; i2 < end; ++i2) {
      out += hexSliceLookupTable[buf[i2]];
    }
    return out;
  }
  function utf16leSlice(buf, start, end) {
    const bytes = buf.slice(start, end);
    let res = "";
    for (let i2 = 0; i2 < bytes.length - 1; i2 += 2) {
      res += String.fromCharCode(bytes[i2] + bytes[i2 + 1] * 256);
    }
    return res;
  }
  Buffer2.prototype.slice = function slice(start, end) {
    const len = this.length;
    start = ~~start;
    end = end === void 0 ? len : ~~end;
    if (start < 0) {
      start += len;
      if (start < 0) start = 0;
    } else if (start > len) {
      start = len;
    }
    if (end < 0) {
      end += len;
      if (end < 0) end = 0;
    } else if (end > len) {
      end = len;
    }
    if (end < start) end = start;
    const newBuf = this.subarray(start, end);
    Object.setPrototypeOf(newBuf, Buffer2.prototype);
    return newBuf;
  };
  function checkOffset(offset, ext, length) {
    if (offset % 1 !== 0 || offset < 0) throw new RangeError("offset is not uint");
    if (offset + ext > length) throw new RangeError("Trying to access beyond buffer length");
  }
  Buffer2.prototype.readUintLE = Buffer2.prototype.readUIntLE = function readUIntLE(offset, byteLength3, noAssert) {
    offset = offset >>> 0;
    byteLength3 = byteLength3 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength3, this.length);
    let val = this[offset];
    let mul = 1;
    let i2 = 0;
    while (++i2 < byteLength3 && (mul *= 256)) {
      val += this[offset + i2] * mul;
    }
    return val;
  };
  Buffer2.prototype.readUintBE = Buffer2.prototype.readUIntBE = function readUIntBE(offset, byteLength3, noAssert) {
    offset = offset >>> 0;
    byteLength3 = byteLength3 >>> 0;
    if (!noAssert) {
      checkOffset(offset, byteLength3, this.length);
    }
    let val = this[offset + --byteLength3];
    let mul = 1;
    while (byteLength3 > 0 && (mul *= 256)) {
      val += this[offset + --byteLength3] * mul;
    }
    return val;
  };
  Buffer2.prototype.readUint8 = Buffer2.prototype.readUInt8 = function readUInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 1, this.length);
    return this[offset];
  };
  Buffer2.prototype.readUint16LE = Buffer2.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] | this[offset + 1] << 8;
  };
  Buffer2.prototype.readUint16BE = Buffer2.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    return this[offset] << 8 | this[offset + 1];
  };
  Buffer2.prototype.readUint32LE = Buffer2.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 16777216;
  };
  Buffer2.prototype.readUint32BE = Buffer2.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] * 16777216 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
  };
  Buffer2.prototype.readBigUInt64LE = defineBigIntMethod(function readBigUInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const lo = first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24;
    const hi = this[++offset] + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + last * 2 ** 24;
    return BigInt(lo) + (BigInt(hi) << BigInt(32));
  });
  Buffer2.prototype.readBigUInt64BE = defineBigIntMethod(function readBigUInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const hi = first * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    const lo = this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last;
    return (BigInt(hi) << BigInt(32)) + BigInt(lo);
  });
  Buffer2.prototype.readIntLE = function readIntLE(offset, byteLength3, noAssert) {
    offset = offset >>> 0;
    byteLength3 = byteLength3 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength3, this.length);
    let val = this[offset];
    let mul = 1;
    let i2 = 0;
    while (++i2 < byteLength3 && (mul *= 256)) {
      val += this[offset + i2] * mul;
    }
    mul *= 128;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength3);
    return val;
  };
  Buffer2.prototype.readIntBE = function readIntBE(offset, byteLength3, noAssert) {
    offset = offset >>> 0;
    byteLength3 = byteLength3 >>> 0;
    if (!noAssert) checkOffset(offset, byteLength3, this.length);
    let i2 = byteLength3;
    let mul = 1;
    let val = this[offset + --i2];
    while (i2 > 0 && (mul *= 256)) {
      val += this[offset + --i2] * mul;
    }
    mul *= 128;
    if (val >= mul) val -= Math.pow(2, 8 * byteLength3);
    return val;
  };
  Buffer2.prototype.readInt8 = function readInt8(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 1, this.length);
    if (!(this[offset] & 128)) return this[offset];
    return (255 - this[offset] + 1) * -1;
  };
  Buffer2.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    const val = this[offset] | this[offset + 1] << 8;
    return val & 32768 ? val | 4294901760 : val;
  };
  Buffer2.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 2, this.length);
    const val = this[offset + 1] | this[offset] << 8;
    return val & 32768 ? val | 4294901760 : val;
  };
  Buffer2.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
  };
  Buffer2.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
  };
  Buffer2.prototype.readBigInt64LE = defineBigIntMethod(function readBigInt64LE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const val = this[offset + 4] + this[offset + 5] * 2 ** 8 + this[offset + 6] * 2 ** 16 + (last << 24);
    return (BigInt(val) << BigInt(32)) + BigInt(first + this[++offset] * 2 ** 8 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 24);
  });
  Buffer2.prototype.readBigInt64BE = defineBigIntMethod(function readBigInt64BE(offset) {
    offset = offset >>> 0;
    validateNumber(offset, "offset");
    const first = this[offset];
    const last = this[offset + 7];
    if (first === void 0 || last === void 0) {
      boundsError(offset, this.length - 8);
    }
    const val = (first << 24) + // Overflow
    this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + this[++offset];
    return (BigInt(val) << BigInt(32)) + BigInt(this[++offset] * 2 ** 24 + this[++offset] * 2 ** 16 + this[++offset] * 2 ** 8 + last);
  });
  Buffer2.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return ieee754$1.read(this, offset, true, 23, 4);
  };
  Buffer2.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 4, this.length);
    return ieee754$1.read(this, offset, false, 23, 4);
  };
  Buffer2.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 8, this.length);
    return ieee754$1.read(this, offset, true, 52, 8);
  };
  Buffer2.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
    offset = offset >>> 0;
    if (!noAssert) checkOffset(offset, 8, this.length);
    return ieee754$1.read(this, offset, false, 52, 8);
  };
  function checkInt(buf, value, offset, ext, max, min) {
    if (!Buffer2.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
    if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
  }
  Buffer2.prototype.writeUintLE = Buffer2.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength3, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength3 = byteLength3 >>> 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength3) - 1;
      checkInt(this, value, offset, byteLength3, maxBytes, 0);
    }
    let mul = 1;
    let i2 = 0;
    this[offset] = value & 255;
    while (++i2 < byteLength3 && (mul *= 256)) {
      this[offset + i2] = value / mul & 255;
    }
    return offset + byteLength3;
  };
  Buffer2.prototype.writeUintBE = Buffer2.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength3, noAssert) {
    value = +value;
    offset = offset >>> 0;
    byteLength3 = byteLength3 >>> 0;
    if (!noAssert) {
      const maxBytes = Math.pow(2, 8 * byteLength3) - 1;
      checkInt(this, value, offset, byteLength3, maxBytes, 0);
    }
    let i2 = byteLength3 - 1;
    let mul = 1;
    this[offset + i2] = value & 255;
    while (--i2 >= 0 && (mul *= 256)) {
      this[offset + i2] = value / mul & 255;
    }
    return offset + byteLength3;
  };
  Buffer2.prototype.writeUint8 = Buffer2.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 1, 255, 0);
    this[offset] = value & 255;
    return offset + 1;
  };
  Buffer2.prototype.writeUint16LE = Buffer2.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  };
  Buffer2.prototype.writeUint16BE = Buffer2.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 65535, 0);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
    return offset + 2;
  };
  Buffer2.prototype.writeUint32LE = Buffer2.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
    this[offset + 3] = value >>> 24;
    this[offset + 2] = value >>> 16;
    this[offset + 1] = value >>> 8;
    this[offset] = value & 255;
    return offset + 4;
  };
  Buffer2.prototype.writeUint32BE = Buffer2.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 4294967295, 0);
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
    return offset + 4;
  };
  function wrtBigUInt64LE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo = Number(value & BigInt(4294967295));
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    lo = lo >> 8;
    buf[offset++] = lo;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    hi = hi >> 8;
    buf[offset++] = hi;
    return offset;
  }
  function wrtBigUInt64BE(buf, value, offset, min, max) {
    checkIntBI(value, min, max, buf, offset, 7);
    let lo = Number(value & BigInt(4294967295));
    buf[offset + 7] = lo;
    lo = lo >> 8;
    buf[offset + 6] = lo;
    lo = lo >> 8;
    buf[offset + 5] = lo;
    lo = lo >> 8;
    buf[offset + 4] = lo;
    let hi = Number(value >> BigInt(32) & BigInt(4294967295));
    buf[offset + 3] = hi;
    hi = hi >> 8;
    buf[offset + 2] = hi;
    hi = hi >> 8;
    buf[offset + 1] = hi;
    hi = hi >> 8;
    buf[offset] = hi;
    return offset + 8;
  }
  Buffer2.prototype.writeBigUInt64LE = defineBigIntMethod(function writeBigUInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
  });
  Buffer2.prototype.writeBigUInt64BE = defineBigIntMethod(function writeBigUInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, BigInt(0), BigInt("0xffffffffffffffff"));
  });
  Buffer2.prototype.writeIntLE = function writeIntLE(value, offset, byteLength3, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength3 - 1);
      checkInt(this, value, offset, byteLength3, limit - 1, -limit);
    }
    let i2 = 0;
    let mul = 1;
    let sub = 0;
    this[offset] = value & 255;
    while (++i2 < byteLength3 && (mul *= 256)) {
      if (value < 0 && sub === 0 && this[offset + i2 - 1] !== 0) {
        sub = 1;
      }
      this[offset + i2] = (value / mul >> 0) - sub & 255;
    }
    return offset + byteLength3;
  };
  Buffer2.prototype.writeIntBE = function writeIntBE(value, offset, byteLength3, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      const limit = Math.pow(2, 8 * byteLength3 - 1);
      checkInt(this, value, offset, byteLength3, limit - 1, -limit);
    }
    let i2 = byteLength3 - 1;
    let mul = 1;
    let sub = 0;
    this[offset + i2] = value & 255;
    while (--i2 >= 0 && (mul *= 256)) {
      if (value < 0 && sub === 0 && this[offset + i2 + 1] !== 0) {
        sub = 1;
      }
      this[offset + i2] = (value / mul >> 0) - sub & 255;
    }
    return offset + byteLength3;
  };
  Buffer2.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 1, 127, -128);
    if (value < 0) value = 255 + value + 1;
    this[offset] = value & 255;
    return offset + 1;
  };
  Buffer2.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    return offset + 2;
  };
  Buffer2.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 2, 32767, -32768);
    this[offset] = value >>> 8;
    this[offset + 1] = value & 255;
    return offset + 2;
  };
  Buffer2.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
    this[offset] = value & 255;
    this[offset + 1] = value >>> 8;
    this[offset + 2] = value >>> 16;
    this[offset + 3] = value >>> 24;
    return offset + 4;
  };
  Buffer2.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) checkInt(this, value, offset, 4, 2147483647, -2147483648);
    if (value < 0) value = 4294967295 + value + 1;
    this[offset] = value >>> 24;
    this[offset + 1] = value >>> 16;
    this[offset + 2] = value >>> 8;
    this[offset + 3] = value & 255;
    return offset + 4;
  };
  Buffer2.prototype.writeBigInt64LE = defineBigIntMethod(function writeBigInt64LE(value, offset = 0) {
    return wrtBigUInt64LE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  Buffer2.prototype.writeBigInt64BE = defineBigIntMethod(function writeBigInt64BE(value, offset = 0) {
    return wrtBigUInt64BE(this, value, offset, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
  });
  function checkIEEE754(buf, value, offset, ext, max, min) {
    if (offset + ext > buf.length) throw new RangeError("Index out of range");
    if (offset < 0) throw new RangeError("Index out of range");
  }
  function writeFloat(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 4);
    }
    ieee754$1.write(buf, value, offset, littleEndian, 23, 4);
    return offset + 4;
  }
  Buffer2.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
    return writeFloat(this, value, offset, true, noAssert);
  };
  Buffer2.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
    return writeFloat(this, value, offset, false, noAssert);
  };
  function writeDouble(buf, value, offset, littleEndian, noAssert) {
    value = +value;
    offset = offset >>> 0;
    if (!noAssert) {
      checkIEEE754(buf, value, offset, 8);
    }
    ieee754$1.write(buf, value, offset, littleEndian, 52, 8);
    return offset + 8;
  }
  Buffer2.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
    return writeDouble(this, value, offset, true, noAssert);
  };
  Buffer2.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
    return writeDouble(this, value, offset, false, noAssert);
  };
  Buffer2.prototype.copy = function copy(target, targetStart, start, end) {
    if (!Buffer2.isBuffer(target)) throw new TypeError("argument should be a Buffer");
    if (!start) start = 0;
    if (!end && end !== 0) end = this.length;
    if (targetStart >= target.length) targetStart = target.length;
    if (!targetStart) targetStart = 0;
    if (end > 0 && end < start) end = start;
    if (end === start) return 0;
    if (target.length === 0 || this.length === 0) return 0;
    if (targetStart < 0) {
      throw new RangeError("targetStart out of bounds");
    }
    if (start < 0 || start >= this.length) throw new RangeError("Index out of range");
    if (end < 0) throw new RangeError("sourceEnd out of bounds");
    if (end > this.length) end = this.length;
    if (target.length - targetStart < end - start) {
      end = target.length - targetStart + start;
    }
    const len = end - start;
    if (this === target && typeof GlobalUint8Array.prototype.copyWithin === "function") {
      this.copyWithin(targetStart, start, end);
    } else {
      GlobalUint8Array.prototype.set.call(
        target,
        this.subarray(start, end),
        targetStart
      );
    }
    return len;
  };
  Buffer2.prototype.fill = function fill(val, start, end, encoding) {
    if (typeof val === "string") {
      if (typeof start === "string") {
        encoding = start;
        start = 0;
        end = this.length;
      } else if (typeof end === "string") {
        encoding = end;
        end = this.length;
      }
      if (encoding !== void 0 && typeof encoding !== "string") {
        throw new TypeError("encoding must be a string");
      }
      if (typeof encoding === "string" && !Buffer2.isEncoding(encoding)) {
        throw new TypeError("Unknown encoding: " + encoding);
      }
      if (val.length === 1) {
        const code2 = val.charCodeAt(0);
        if (encoding === "utf8" && code2 < 128 || encoding === "latin1") {
          val = code2;
        }
      }
    } else if (typeof val === "number") {
      val = val & 255;
    } else if (typeof val === "boolean") {
      val = Number(val);
    }
    if (start < 0 || this.length < start || this.length < end) {
      throw new RangeError("Out of range index");
    }
    if (end <= start) {
      return this;
    }
    start = start >>> 0;
    end = end === void 0 ? this.length : end >>> 0;
    if (!val) val = 0;
    let i2;
    if (typeof val === "number") {
      for (i2 = start; i2 < end; ++i2) {
        this[i2] = val;
      }
    } else {
      const bytes = Buffer2.isBuffer(val) ? val : Buffer2.from(val, encoding);
      const len = bytes.length;
      if (len === 0) {
        throw new TypeError('The value "' + val + '" is invalid for argument "value"');
      }
      for (i2 = 0; i2 < end - start; ++i2) {
        this[i2 + start] = bytes[i2 % len];
      }
    }
    return this;
  };
  const errors = {};
  function E2(sym, getMessage, Base) {
    errors[sym] = class NodeError extends Base {
      constructor() {
        super();
        Object.defineProperty(this, "message", {
          value: getMessage.apply(this, arguments),
          writable: true,
          configurable: true
        });
        this.name = `${this.name} [${sym}]`;
        this.stack;
        delete this.name;
      }
      get code() {
        return sym;
      }
      set code(value) {
        Object.defineProperty(this, "code", {
          configurable: true,
          enumerable: true,
          value,
          writable: true
        });
      }
      toString() {
        return `${this.name} [${sym}]: ${this.message}`;
      }
    };
  }
  E2(
    "ERR_BUFFER_OUT_OF_BOUNDS",
    function(name) {
      if (name) {
        return `${name} is outside of buffer bounds`;
      }
      return "Attempt to access memory outside buffer bounds";
    },
    RangeError
  );
  E2(
    "ERR_INVALID_ARG_TYPE",
    function(name, actual) {
      return `The "${name}" argument must be of type number. Received type ${typeof actual}`;
    },
    TypeError
  );
  E2(
    "ERR_OUT_OF_RANGE",
    function(str, range, input) {
      let msg = `The value of "${str}" is out of range.`;
      let received = input;
      if (Number.isInteger(input) && Math.abs(input) > 2 ** 32) {
        received = addNumericalSeparator(String(input));
      } else if (typeof input === "bigint") {
        received = String(input);
        if (input > BigInt(2) ** BigInt(32) || input < -(BigInt(2) ** BigInt(32))) {
          received = addNumericalSeparator(received);
        }
        received += "n";
      }
      msg += ` It must be ${range}. Received ${received}`;
      return msg;
    },
    RangeError
  );
  function addNumericalSeparator(val) {
    let res = "";
    let i2 = val.length;
    const start = val[0] === "-" ? 1 : 0;
    for (; i2 >= start + 4; i2 -= 3) {
      res = `_${val.slice(i2 - 3, i2)}${res}`;
    }
    return `${val.slice(0, i2)}${res}`;
  }
  function checkBounds(buf, offset, byteLength3) {
    validateNumber(offset, "offset");
    if (buf[offset] === void 0 || buf[offset + byteLength3] === void 0) {
      boundsError(offset, buf.length - (byteLength3 + 1));
    }
  }
  function checkIntBI(value, min, max, buf, offset, byteLength3) {
    if (value > max || value < min) {
      const n2 = typeof min === "bigint" ? "n" : "";
      let range;
      {
        if (min === 0 || min === BigInt(0)) {
          range = `>= 0${n2} and < 2${n2} ** ${(byteLength3 + 1) * 8}${n2}`;
        } else {
          range = `>= -(2${n2} ** ${(byteLength3 + 1) * 8 - 1}${n2}) and < 2 ** ${(byteLength3 + 1) * 8 - 1}${n2}`;
        }
      }
      throw new errors.ERR_OUT_OF_RANGE("value", range, value);
    }
    checkBounds(buf, offset, byteLength3);
  }
  function validateNumber(value, name) {
    if (typeof value !== "number") {
      throw new errors.ERR_INVALID_ARG_TYPE(name, "number", value);
    }
  }
  function boundsError(value, length, type) {
    if (Math.floor(value) !== value) {
      validateNumber(value, type);
      throw new errors.ERR_OUT_OF_RANGE("offset", "an integer", value);
    }
    if (length < 0) {
      throw new errors.ERR_BUFFER_OUT_OF_BOUNDS();
    }
    throw new errors.ERR_OUT_OF_RANGE(
      "offset",
      `>= ${0} and <= ${length}`,
      value
    );
  }
  const INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;
  function base64clean(str) {
    str = str.split("=")[0];
    str = str.trim().replace(INVALID_BASE64_RE, "");
    if (str.length < 2) return "";
    while (str.length % 4 !== 0) {
      str = str + "=";
    }
    return str;
  }
  function utf8ToBytes(string, units) {
    units = units || Infinity;
    let codePoint;
    const length = string.length;
    let leadSurrogate = null;
    const bytes = [];
    for (let i2 = 0; i2 < length; ++i2) {
      codePoint = string.charCodeAt(i2);
      if (codePoint > 55295 && codePoint < 57344) {
        if (!leadSurrogate) {
          if (codePoint > 56319) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            continue;
          } else if (i2 + 1 === length) {
            if ((units -= 3) > -1) bytes.push(239, 191, 189);
            continue;
          }
          leadSurrogate = codePoint;
          continue;
        }
        if (codePoint < 56320) {
          if ((units -= 3) > -1) bytes.push(239, 191, 189);
          leadSurrogate = codePoint;
          continue;
        }
        codePoint = (leadSurrogate - 55296 << 10 | codePoint - 56320) + 65536;
      } else if (leadSurrogate) {
        if ((units -= 3) > -1) bytes.push(239, 191, 189);
      }
      leadSurrogate = null;
      if (codePoint < 128) {
        if ((units -= 1) < 0) break;
        bytes.push(codePoint);
      } else if (codePoint < 2048) {
        if ((units -= 2) < 0) break;
        bytes.push(
          codePoint >> 6 | 192,
          codePoint & 63 | 128
        );
      } else if (codePoint < 65536) {
        if ((units -= 3) < 0) break;
        bytes.push(
          codePoint >> 12 | 224,
          codePoint >> 6 & 63 | 128,
          codePoint & 63 | 128
        );
      } else if (codePoint < 1114112) {
        if ((units -= 4) < 0) break;
        bytes.push(
          codePoint >> 18 | 240,
          codePoint >> 12 & 63 | 128,
          codePoint >> 6 & 63 | 128,
          codePoint & 63 | 128
        );
      } else {
        throw new Error("Invalid code point");
      }
    }
    return bytes;
  }
  function asciiToBytes(str) {
    const byteArray = [];
    for (let i2 = 0; i2 < str.length; ++i2) {
      byteArray.push(str.charCodeAt(i2) & 255);
    }
    return byteArray;
  }
  function utf16leToBytes(str, units) {
    let c2, hi, lo;
    const byteArray = [];
    for (let i2 = 0; i2 < str.length; ++i2) {
      if ((units -= 2) < 0) break;
      c2 = str.charCodeAt(i2);
      hi = c2 >> 8;
      lo = c2 % 256;
      byteArray.push(lo);
      byteArray.push(hi);
    }
    return byteArray;
  }
  function base64ToBytes(str) {
    return base64.toByteArray(base64clean(str));
  }
  function blitBuffer(src, dst, offset, length) {
    let i2;
    for (i2 = 0; i2 < length; ++i2) {
      if (i2 + offset >= dst.length || i2 >= src.length) break;
      dst[i2 + offset] = src[i2];
    }
    return i2;
  }
  function isInstance(obj, type) {
    return obj instanceof type || obj != null && obj.constructor != null && obj.constructor.name != null && obj.constructor.name === type.name;
  }
  function numberIsNaN(obj) {
    return obj !== obj;
  }
  const hexSliceLookupTable = function() {
    const alphabet = "0123456789abcdef";
    const table = new Array(256);
    for (let i2 = 0; i2 < 16; ++i2) {
      const i16 = i2 * 16;
      for (let j = 0; j < 16; ++j) {
        table[i16 + j] = alphabet[i2] + alphabet[j];
      }
    }
    return table;
  }();
  function defineBigIntMethod(fn) {
    return typeof BigInt === "undefined" ? BufferBigIntNotDefined : fn;
  }
  function BufferBigIntNotDefined() {
    throw new Error("BigInt not supported");
  }
})(buffer);
const Buffer = buffer.Buffer;
const Blob$1 = buffer.Blob;
const BlobOptions = buffer.BlobOptions;
const Buffer$1 = buffer.Buffer;
const File = buffer.File;
const FileOptions = buffer.FileOptions;
const INSPECT_MAX_BYTES = buffer.INSPECT_MAX_BYTES;
const SlowBuffer = buffer.SlowBuffer;
const TranscodeEncoding = buffer.TranscodeEncoding;
const atob$1 = buffer.atob;
const btoa = buffer.btoa;
const constants$1 = buffer.constants;
const isAscii = buffer.isAscii;
const isUtf8 = buffer.isUtf8;
const kMaxLength = buffer.kMaxLength;
const kStringMaxLength = buffer.kStringMaxLength;
const resolveObjectURL = buffer.resolveObjectURL;
const transcode = buffer.transcode;
const dist = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Blob: Blob$1,
  BlobOptions,
  Buffer: Buffer$1,
  File,
  FileOptions,
  INSPECT_MAX_BYTES,
  SlowBuffer,
  TranscodeEncoding,
  atob: atob$1,
  btoa,
  constants: constants$1,
  default: Buffer,
  isAscii,
  isUtf8,
  kMaxLength,
  kStringMaxLength,
  resolveObjectURL,
  transcode
}, Symbol.toStringTag, { value: "Module" }));
var HederaChainId;
(function(HederaChainId2) {
  HederaChainId2["Mainnet"] = "hedera:mainnet";
  HederaChainId2["Testnet"] = "hedera:testnet";
  HederaChainId2["Previewnet"] = "hedera:previewnet";
  HederaChainId2["Devnet"] = "hedera:devnet";
})(HederaChainId || (HederaChainId = {}));
var HederaSessionEvent;
(function(HederaSessionEvent2) {
  HederaSessionEvent2["AccountsChanged"] = "accountsChanged";
  HederaSessionEvent2["ChainChanged"] = "chainChanged";
})(HederaSessionEvent || (HederaSessionEvent = {}));
var HederaJsonRpcMethod;
(function(HederaJsonRpcMethod2) {
  HederaJsonRpcMethod2["GetNodeAddresses"] = "hedera_getNodeAddresses";
  HederaJsonRpcMethod2["ExecuteTransaction"] = "hedera_executeTransaction";
  HederaJsonRpcMethod2["SignMessage"] = "hedera_signMessage";
  HederaJsonRpcMethod2["SignAndExecuteQuery"] = "hedera_signAndExecuteQuery";
  HederaJsonRpcMethod2["SignAndExecuteTransaction"] = "hedera_signAndExecuteTransaction";
  HederaJsonRpcMethod2["SignTransaction"] = "hedera_signTransaction";
})(HederaJsonRpcMethod || (HederaJsonRpcMethod = {}));
function freezeTransaction(transaction) {
  if (!transaction.isFrozen())
    transaction.freeze();
}
function setDefaultNodeAccountIds(transaction) {
  const isNodeAccountIdNotSet = !transaction.nodeAccountIds || transaction.nodeAccountIds.length === 0;
  if (!transaction.isFrozen() && isNodeAccountIdNotSet)
    transaction.setNodeAccountIds([new AccountId(3), new AccountId(4), new AccountId(5)]);
}
function transactionToBase64String(transaction) {
  setDefaultNodeAccountIds(transaction);
  freezeTransaction(transaction);
  const transactionBytes = transaction.toBytes();
  return Buffer$1.from(transactionBytes).toString("base64");
}
function transactionToTransactionBody(transaction, nodeAccountId) {
  return transaction._makeTransactionBody(nodeAccountId);
}
function transactionBodyToBase64String(transactionBody) {
  return Uint8ArrayToBase64String(proto.TransactionBody.encode(transactionBody).finish());
}
function base64StringToSignatureMap(base64string) {
  const encoded = Buffer$1.from(base64string, "base64");
  return proto.SignatureMap.decode(encoded);
}
function Uint8ArrayToBase64String(binary) {
  return Buffer$1.from(binary).toString("base64");
}
function Uint8ArrayToString(binary) {
  return Buffer$1.from(binary).toString("utf-8");
}
function base64StringToUint8Array(base64string) {
  const encoded = Buffer$1.from(base64string, "base64");
  return new Uint8Array(encoded);
}
function queryToBase64String(query) {
  const queryBytes = query.toBytes();
  return Buffer$1.from(queryBytes).toString("base64");
}
function prefixMessageToSign(message) {
  return "Hedera Signed Message:\n" + message.length + message;
}
function verifyMessageSignature(message, base64SignatureMap, publicKey) {
  const signatureMap = base64StringToSignatureMap(base64SignatureMap);
  const signature = signatureMap.sigPair[0].ed25519 || signatureMap.sigPair[0].ECDSASecp256k1;
  if (!signature)
    throw new Error("Signature not found in signature map");
  return publicKey.verify(Buffer$1.from(prefixMessageToSign(message)), signature);
}
const LEDGER_ID_MAPPINGS = [
  [LedgerId.MAINNET, 295, "hedera:mainnet"],
  [LedgerId.TESTNET, 296, "hedera:testnet"],
  [LedgerId.PREVIEWNET, 297, "hedera:previewnet"],
  [LedgerId.LOCAL_NODE, 298, "hedera:devnet"]
];
const DEFAULT_LEDGER_ID = LedgerId.LOCAL_NODE;
const DEFAULT_CAIP = LEDGER_ID_MAPPINGS[3][2];
function CAIPChainIdToLedgerId(chainId) {
  for (let i2 = 0; i2 < LEDGER_ID_MAPPINGS.length; i2++) {
    const [ledgerId, _2, chainId_] = LEDGER_ID_MAPPINGS[i2];
    if (chainId === chainId_) {
      return ledgerId;
    }
  }
  return DEFAULT_LEDGER_ID;
}
function ledgerIdToCAIPChainId(ledgerId) {
  for (let i2 = 0; i2 < LEDGER_ID_MAPPINGS.length; i2++) {
    const [ledgerId_, _2, chainId] = LEDGER_ID_MAPPINGS[i2];
    if (ledgerId.toString() === ledgerId_.toString()) {
      return chainId;
    }
  }
  return DEFAULT_CAIP;
}
const networkNamespaces = (ledgerId, methods, events2) => ({
  hedera: {
    chains: [ledgerIdToCAIPChainId(ledgerId)],
    methods,
    events: events2
  }
});
const accountAndLedgerFromSession = (session) => {
  const hederaNamespace = session.namespaces.hedera;
  if (!hederaNamespace)
    throw new Error("No hedera namespace found");
  return hederaNamespace.accounts.map((account) => {
    const [chain, network, acc] = account.split(":");
    return {
      network: CAIPChainIdToLedgerId(chain + ":" + network),
      account: AccountId.fromString(acc)
    };
  });
};
var EVENTS;
(function(EVENTS2) {
  EVENTS2["extensionQuery"] = "hedera-extension-query";
  EVENTS2["extensionConnect"] = "hedera-extension-connect-";
  EVENTS2["extensionOpen"] = "hedera-extension-open-";
  EVENTS2["extensionResponse"] = "hedera-extension-response";
  EVENTS2["iframeQuery"] = "hedera-iframe-query";
  EVENTS2["iframeQueryResponse"] = "hedera-iframe-response";
  EVENTS2["iframeConnect"] = "hedera-iframe-connect";
})(EVENTS || (EVENTS = {}));
const findExtensions = (onFound) => {
  if (typeof window === "undefined")
    return;
  window.addEventListener("message", (event) => {
    var _a, _b;
    if (((_a = event === null || event === void 0 ? void 0 : event.data) === null || _a === void 0 ? void 0 : _a.type) == EVENTS.extensionResponse && event.data.metadata) {
      onFound(event.data.metadata, false);
    }
    if (((_b = event === null || event === void 0 ? void 0 : event.data) === null || _b === void 0 ? void 0 : _b.type) == EVENTS.iframeQueryResponse && event.data.metadata) {
      onFound(event.data.metadata, true);
    }
  });
  setTimeout(() => {
    extensionQuery();
  }, 200);
};
const extensionQuery = () => {
  window.postMessage({ type: EVENTS.extensionQuery }, "*");
  if (window.parent) {
    window.parent.postMessage({ type: EVENTS.iframeQuery }, "*");
  }
};
const extensionConnect = (id, isIframe, pairingString) => {
  if (isIframe) {
    window.parent.postMessage({ type: EVENTS.iframeConnect, pairingString }, "*");
    return;
  }
  window.postMessage({ type: EVENTS.extensionConnect + id, pairingString }, "*");
};
const extensionOpen = (id) => {
  window.postMessage({ type: EVENTS.extensionOpen + id }, "*");
};
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs$1(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
function getAugmentedNamespace(n2) {
  if (n2.__esModule) return n2;
  var f2 = n2.default;
  if (typeof f2 == "function") {
    var a = function a2() {
      if (this instanceof a2) {
        return Reflect.construct(f2, arguments, this.constructor);
      }
      return f2.apply(this, arguments);
    };
    a.prototype = f2.prototype;
  } else a = {};
  Object.defineProperty(a, "__esModule", { value: true });
  Object.keys(n2).forEach(function(k2) {
    var d = Object.getOwnPropertyDescriptor(n2, k2);
    Object.defineProperty(a, k2, d.get ? d : {
      enumerable: true,
      get: function() {
        return n2[k2];
      }
    });
  });
  return a;
}
function tryStringify(o) {
  try {
    return JSON.stringify(o);
  } catch (e) {
    return '"[Circular]"';
  }
}
var quickFormatUnescaped = format$1;
function format$1(f2, args, opts) {
  var ss = opts && opts.stringify || tryStringify;
  var offset = 1;
  if (typeof f2 === "object" && f2 !== null) {
    var len = args.length + offset;
    if (len === 1) return f2;
    var objects = new Array(len);
    objects[0] = ss(f2);
    for (var index = 1; index < len; index++) {
      objects[index] = ss(args[index]);
    }
    return objects.join(" ");
  }
  if (typeof f2 !== "string") {
    return f2;
  }
  var argLen = args.length;
  if (argLen === 0) return f2;
  var str = "";
  var a = 1 - offset;
  var lastPos = -1;
  var flen = f2 && f2.length || 0;
  for (var i2 = 0; i2 < flen; ) {
    if (f2.charCodeAt(i2) === 37 && i2 + 1 < flen) {
      lastPos = lastPos > -1 ? lastPos : 0;
      switch (f2.charCodeAt(i2 + 1)) {
        case 100:
        case 102:
          if (a >= argLen)
            break;
          if (args[a] == null) break;
          if (lastPos < i2)
            str += f2.slice(lastPos, i2);
          str += Number(args[a]);
          lastPos = i2 + 2;
          i2++;
          break;
        case 105:
          if (a >= argLen)
            break;
          if (args[a] == null) break;
          if (lastPos < i2)
            str += f2.slice(lastPos, i2);
          str += Math.floor(Number(args[a]));
          lastPos = i2 + 2;
          i2++;
          break;
        case 79:
        case 111:
        case 106:
          if (a >= argLen)
            break;
          if (args[a] === void 0) break;
          if (lastPos < i2)
            str += f2.slice(lastPos, i2);
          var type = typeof args[a];
          if (type === "string") {
            str += "'" + args[a] + "'";
            lastPos = i2 + 2;
            i2++;
            break;
          }
          if (type === "function") {
            str += args[a].name || "<anonymous>";
            lastPos = i2 + 2;
            i2++;
            break;
          }
          str += ss(args[a]);
          lastPos = i2 + 2;
          i2++;
          break;
        case 115:
          if (a >= argLen)
            break;
          if (lastPos < i2)
            str += f2.slice(lastPos, i2);
          str += String(args[a]);
          lastPos = i2 + 2;
          i2++;
          break;
        case 37:
          if (lastPos < i2)
            str += f2.slice(lastPos, i2);
          str += "%";
          lastPos = i2 + 2;
          i2++;
          a--;
          break;
      }
      ++a;
    }
    ++i2;
  }
  if (lastPos === -1)
    return f2;
  else if (lastPos < flen) {
    str += f2.slice(lastPos);
  }
  return str;
}
const format = quickFormatUnescaped;
var browser$1 = pino;
const _console = pfGlobalThisOrFallback().console || {};
const stdSerializers = {
  mapHttpRequest: mock,
  mapHttpResponse: mock,
  wrapRequestSerializer: passthrough,
  wrapResponseSerializer: passthrough,
  wrapErrorSerializer: passthrough,
  req: mock,
  res: mock,
  err: asErrValue
};
function shouldSerialize(serialize, serializers) {
  if (Array.isArray(serialize)) {
    const hasToFilter = serialize.filter(function(k2) {
      return k2 !== "!stdSerializers.err";
    });
    return hasToFilter;
  } else if (serialize === true) {
    return Object.keys(serializers);
  }
  return false;
}
function pino(opts) {
  opts = opts || {};
  opts.browser = opts.browser || {};
  const transmit2 = opts.browser.transmit;
  if (transmit2 && typeof transmit2.send !== "function") {
    throw Error("pino: transmit option must have a send function");
  }
  const proto2 = opts.browser.write || _console;
  if (opts.browser.write) opts.browser.asObject = true;
  const serializers = opts.serializers || {};
  const serialize = shouldSerialize(opts.browser.serialize, serializers);
  let stdErrSerialize = opts.browser.serialize;
  if (Array.isArray(opts.browser.serialize) && opts.browser.serialize.indexOf("!stdSerializers.err") > -1) stdErrSerialize = false;
  const levels = ["error", "fatal", "warn", "info", "debug", "trace"];
  if (typeof proto2 === "function") {
    proto2.error = proto2.fatal = proto2.warn = proto2.info = proto2.debug = proto2.trace = proto2;
  }
  if (opts.enabled === false) opts.level = "silent";
  const level = opts.level || "info";
  const logger = Object.create(proto2);
  if (!logger.log) logger.log = noop$1;
  Object.defineProperty(logger, "levelVal", {
    get: getLevelVal
  });
  Object.defineProperty(logger, "level", {
    get: getLevel,
    set: setLevel
  });
  const setOpts = {
    transmit: transmit2,
    serialize,
    asObject: opts.browser.asObject,
    levels,
    timestamp: getTimeFunction(opts)
  };
  logger.levels = pino.levels;
  logger.level = level;
  logger.setMaxListeners = logger.getMaxListeners = logger.emit = logger.addListener = logger.on = logger.prependListener = logger.once = logger.prependOnceListener = logger.removeListener = logger.removeAllListeners = logger.listeners = logger.listenerCount = logger.eventNames = logger.write = logger.flush = noop$1;
  logger.serializers = serializers;
  logger._serialize = serialize;
  logger._stdErrSerialize = stdErrSerialize;
  logger.child = child;
  if (transmit2) logger._logEvent = createLogEventShape();
  function getLevelVal() {
    return this.level === "silent" ? Infinity : this.levels.values[this.level];
  }
  function getLevel() {
    return this._level;
  }
  function setLevel(level2) {
    if (level2 !== "silent" && !this.levels.values[level2]) {
      throw Error("unknown level " + level2);
    }
    this._level = level2;
    set(setOpts, logger, "error", "log");
    set(setOpts, logger, "fatal", "error");
    set(setOpts, logger, "warn", "error");
    set(setOpts, logger, "info", "log");
    set(setOpts, logger, "debug", "log");
    set(setOpts, logger, "trace", "log");
  }
  function child(bindings, childOptions) {
    if (!bindings) {
      throw new Error("missing bindings for child Pino");
    }
    childOptions = childOptions || {};
    if (serialize && bindings.serializers) {
      childOptions.serializers = bindings.serializers;
    }
    const childOptionsSerializers = childOptions.serializers;
    if (serialize && childOptionsSerializers) {
      var childSerializers = Object.assign({}, serializers, childOptionsSerializers);
      var childSerialize = opts.browser.serialize === true ? Object.keys(childSerializers) : serialize;
      delete bindings.serializers;
      applySerializers([bindings], childSerialize, childSerializers, this._stdErrSerialize);
    }
    function Child(parent) {
      this._childLevel = (parent._childLevel | 0) + 1;
      this.error = bind(parent, bindings, "error");
      this.fatal = bind(parent, bindings, "fatal");
      this.warn = bind(parent, bindings, "warn");
      this.info = bind(parent, bindings, "info");
      this.debug = bind(parent, bindings, "debug");
      this.trace = bind(parent, bindings, "trace");
      if (childSerializers) {
        this.serializers = childSerializers;
        this._serialize = childSerialize;
      }
      if (transmit2) {
        this._logEvent = createLogEventShape(
          [].concat(parent._logEvent.bindings, bindings)
        );
      }
    }
    Child.prototype = this;
    return new Child(this);
  }
  return logger;
}
pino.levels = {
  values: {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10
  },
  labels: {
    10: "trace",
    20: "debug",
    30: "info",
    40: "warn",
    50: "error",
    60: "fatal"
  }
};
pino.stdSerializers = stdSerializers;
pino.stdTimeFunctions = Object.assign({}, { nullTime, epochTime, unixTime, isoTime });
function set(opts, logger, level, fallback) {
  const proto2 = Object.getPrototypeOf(logger);
  logger[level] = logger.levelVal > logger.levels.values[level] ? noop$1 : proto2[level] ? proto2[level] : _console[level] || _console[fallback] || noop$1;
  wrap(opts, logger, level);
}
function wrap(opts, logger, level) {
  if (!opts.transmit && logger[level] === noop$1) return;
  logger[level] = /* @__PURE__ */ function(write) {
    return function LOG() {
      const ts = opts.timestamp();
      const args = new Array(arguments.length);
      const proto2 = Object.getPrototypeOf && Object.getPrototypeOf(this) === _console ? _console : this;
      for (var i2 = 0; i2 < args.length; i2++) args[i2] = arguments[i2];
      if (opts.serialize && !opts.asObject) {
        applySerializers(args, this._serialize, this.serializers, this._stdErrSerialize);
      }
      if (opts.asObject) write.call(proto2, asObject(this, level, args, ts));
      else write.apply(proto2, args);
      if (opts.transmit) {
        const transmitLevel = opts.transmit.level || logger.level;
        const transmitValue = pino.levels.values[transmitLevel];
        const methodValue = pino.levels.values[level];
        if (methodValue < transmitValue) return;
        transmit(this, {
          ts,
          methodLevel: level,
          methodValue,
          transmitLevel,
          transmitValue: pino.levels.values[opts.transmit.level || logger.level],
          send: opts.transmit.send,
          val: logger.levelVal
        }, args);
      }
    };
  }(logger[level]);
}
function asObject(logger, level, args, ts) {
  if (logger._serialize) applySerializers(args, logger._serialize, logger.serializers, logger._stdErrSerialize);
  const argsCloned = args.slice();
  let msg = argsCloned[0];
  const o = {};
  if (ts) {
    o.time = ts;
  }
  o.level = pino.levels.values[level];
  let lvl = (logger._childLevel | 0) + 1;
  if (lvl < 1) lvl = 1;
  if (msg !== null && typeof msg === "object") {
    while (lvl-- && typeof argsCloned[0] === "object") {
      Object.assign(o, argsCloned.shift());
    }
    msg = argsCloned.length ? format(argsCloned.shift(), argsCloned) : void 0;
  } else if (typeof msg === "string") msg = format(argsCloned.shift(), argsCloned);
  if (msg !== void 0) o.msg = msg;
  return o;
}
function applySerializers(args, serialize, serializers, stdErrSerialize) {
  for (const i2 in args) {
    if (stdErrSerialize && args[i2] instanceof Error) {
      args[i2] = pino.stdSerializers.err(args[i2]);
    } else if (typeof args[i2] === "object" && !Array.isArray(args[i2])) {
      for (const k2 in args[i2]) {
        if (serialize && serialize.indexOf(k2) > -1 && k2 in serializers) {
          args[i2][k2] = serializers[k2](args[i2][k2]);
        }
      }
    }
  }
}
function bind(parent, bindings, level) {
  return function() {
    const args = new Array(1 + arguments.length);
    args[0] = bindings;
    for (var i2 = 1; i2 < args.length; i2++) {
      args[i2] = arguments[i2 - 1];
    }
    return parent[level].apply(this, args);
  };
}
function transmit(logger, opts, args) {
  const send = opts.send;
  const ts = opts.ts;
  const methodLevel = opts.methodLevel;
  const methodValue = opts.methodValue;
  const val = opts.val;
  const bindings = logger._logEvent.bindings;
  applySerializers(
    args,
    logger._serialize || Object.keys(logger.serializers),
    logger.serializers,
    logger._stdErrSerialize === void 0 ? true : logger._stdErrSerialize
  );
  logger._logEvent.ts = ts;
  logger._logEvent.messages = args.filter(function(arg) {
    return bindings.indexOf(arg) === -1;
  });
  logger._logEvent.level.label = methodLevel;
  logger._logEvent.level.value = methodValue;
  send(methodLevel, logger._logEvent, val);
  logger._logEvent = createLogEventShape(bindings);
}
function createLogEventShape(bindings) {
  return {
    ts: 0,
    messages: [],
    bindings: bindings || [],
    level: { label: "", value: 0 }
  };
}
function asErrValue(err) {
  const obj = {
    type: err.constructor.name,
    msg: err.message,
    stack: err.stack
  };
  for (const key in err) {
    if (obj[key] === void 0) {
      obj[key] = err[key];
    }
  }
  return obj;
}
function getTimeFunction(opts) {
  if (typeof opts.timestamp === "function") {
    return opts.timestamp;
  }
  if (opts.timestamp === false) {
    return nullTime;
  }
  return epochTime;
}
function mock() {
  return {};
}
function passthrough(a) {
  return a;
}
function noop$1() {
}
function nullTime() {
  return false;
}
function epochTime() {
  return Date.now();
}
function unixTime() {
  return Math.round(Date.now() / 1e3);
}
function isoTime() {
  return new Date(Date.now()).toISOString();
}
function pfGlobalThisOrFallback() {
  function defd(o) {
    return typeof o !== "undefined" && o;
  }
  try {
    if (typeof globalThis !== "undefined") return globalThis;
    Object.defineProperty(Object.prototype, "globalThis", {
      get: function() {
        delete Object.prototype.globalThis;
        return this.globalThis = this;
      },
      configurable: true
    });
    return globalThis;
  } catch (e) {
    return defd(self) || defd(window) || defd(this) || {};
  }
}
const qt = /* @__PURE__ */ getDefaultExportFromCjs$1(browser$1);
const c = { level: "info" }, n = "custom_context";
var x$1 = Object.defineProperty, S$1 = Object.defineProperties, _ = Object.getOwnPropertyDescriptors, p = Object.getOwnPropertySymbols, T = Object.prototype.hasOwnProperty, z$1 = Object.prototype.propertyIsEnumerable, f = (r, e, t) => e in r ? x$1(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t, i = (r, e) => {
  for (var t in e) T.call(e, t) && f(r, t, e[t]);
  if (p) for (var t of p(e)) z$1.call(e, t) && f(r, t, e[t]);
  return r;
}, g = (r, e) => S$1(r, _(e));
function k(r) {
  return g(i({}, r), { level: (r == null ? void 0 : r.level) || c.level });
}
function v$1(r, e = n) {
  return r[e] || "";
}
function b(r, e, t = n) {
  return r[t] = e, r;
}
function y(r, e = n) {
  let t = "";
  return typeof r.bindings > "u" ? t = v$1(r, e) : t = r.bindings().context || "", t;
}
function w(r, e, t = n) {
  const o = y(r, t);
  return o.trim() ? `${o}/${e}` : e;
}
function E(r, e, t = n) {
  const o = w(r, e, t), a = r.child({ context: o });
  return b(a, o, t);
}
var events = { exports: {} };
var R = typeof Reflect === "object" ? Reflect : null;
var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
  return Function.prototype.apply.call(target, receiver, args);
};
var ReflectOwnKeys;
if (R && typeof R.ownKeys === "function") {
  ReflectOwnKeys = R.ownKeys;
} else if (Object.getOwnPropertySymbols) {
  ReflectOwnKeys = function ReflectOwnKeys2(target) {
    return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
  };
} else {
  ReflectOwnKeys = function ReflectOwnKeys2(target) {
    return Object.getOwnPropertyNames(target);
  };
}
function ProcessEmitWarning(warning) {
  if (console && console.warn) console.warn(warning);
}
var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
  return value !== value;
};
function EventEmitter() {
  EventEmitter.init.call(this);
}
events.exports = EventEmitter;
events.exports.once = once2;
EventEmitter.EventEmitter = EventEmitter;
EventEmitter.prototype._events = void 0;
EventEmitter.prototype._eventsCount = 0;
EventEmitter.prototype._maxListeners = void 0;
var defaultMaxListeners = 10;
function checkListener(listener) {
  if (typeof listener !== "function") {
    throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
  }
}
Object.defineProperty(EventEmitter, "defaultMaxListeners", {
  enumerable: true,
  get: function() {
    return defaultMaxListeners;
  },
  set: function(arg) {
    if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
      throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
    }
    defaultMaxListeners = arg;
  }
});
EventEmitter.init = function() {
  if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
    this._events = /* @__PURE__ */ Object.create(null);
    this._eventsCount = 0;
  }
  this._maxListeners = this._maxListeners || void 0;
};
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n2) {
  if (typeof n2 !== "number" || n2 < 0 || NumberIsNaN(n2)) {
    throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n2 + ".");
  }
  this._maxListeners = n2;
  return this;
};
function _getMaxListeners(that) {
  if (that._maxListeners === void 0)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}
EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return _getMaxListeners(this);
};
EventEmitter.prototype.emit = function emit(type) {
  var args = [];
  for (var i2 = 1; i2 < arguments.length; i2++) args.push(arguments[i2]);
  var doError = type === "error";
  var events2 = this._events;
  if (events2 !== void 0)
    doError = doError && events2.error === void 0;
  else if (!doError)
    return false;
  if (doError) {
    var er;
    if (args.length > 0)
      er = args[0];
    if (er instanceof Error) {
      throw er;
    }
    var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
    err.context = er;
    throw err;
  }
  var handler = events2[type];
  if (handler === void 0)
    return false;
  if (typeof handler === "function") {
    ReflectApply(handler, this, args);
  } else {
    var len = handler.length;
    var listeners2 = arrayClone(handler, len);
    for (var i2 = 0; i2 < len; ++i2)
      ReflectApply(listeners2[i2], this, args);
  }
  return true;
};
function _addListener(target, type, listener, prepend) {
  var m;
  var events2;
  var existing;
  checkListener(listener);
  events2 = target._events;
  if (events2 === void 0) {
    events2 = target._events = /* @__PURE__ */ Object.create(null);
    target._eventsCount = 0;
  } else {
    if (events2.newListener !== void 0) {
      target.emit(
        "newListener",
        type,
        listener.listener ? listener.listener : listener
      );
      events2 = target._events;
    }
    existing = events2[type];
  }
  if (existing === void 0) {
    existing = events2[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === "function") {
      existing = events2[type] = prepend ? [listener, existing] : [existing, listener];
    } else if (prepend) {
      existing.unshift(listener);
    } else {
      existing.push(listener);
    }
    m = _getMaxListeners(target);
    if (m > 0 && existing.length > m && !existing.warned) {
      existing.warned = true;
      var w2 = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
      w2.name = "MaxListenersExceededWarning";
      w2.emitter = target;
      w2.type = type;
      w2.count = existing.length;
      ProcessEmitWarning(w2);
    }
  }
  return target;
}
EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};
EventEmitter.prototype.on = EventEmitter.prototype.addListener;
EventEmitter.prototype.prependListener = function prependListener(type, listener) {
  return _addListener(this, type, listener, true);
};
function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    if (arguments.length === 0)
      return this.listener.call(this.target);
    return this.listener.apply(this.target, arguments);
  }
}
function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: void 0, target, type, listener };
  var wrapped = onceWrapper.bind(state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}
EventEmitter.prototype.once = function once(type, listener) {
  checkListener(listener);
  this.on(type, _onceWrap(this, type, listener));
  return this;
};
EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
  checkListener(listener);
  this.prependListener(type, _onceWrap(this, type, listener));
  return this;
};
EventEmitter.prototype.removeListener = function removeListener(type, listener) {
  var list, events2, position, i2, originalListener;
  checkListener(listener);
  events2 = this._events;
  if (events2 === void 0)
    return this;
  list = events2[type];
  if (list === void 0)
    return this;
  if (list === listener || list.listener === listener) {
    if (--this._eventsCount === 0)
      this._events = /* @__PURE__ */ Object.create(null);
    else {
      delete events2[type];
      if (events2.removeListener)
        this.emit("removeListener", type, list.listener || listener);
    }
  } else if (typeof list !== "function") {
    position = -1;
    for (i2 = list.length - 1; i2 >= 0; i2--) {
      if (list[i2] === listener || list[i2].listener === listener) {
        originalListener = list[i2].listener;
        position = i2;
        break;
      }
    }
    if (position < 0)
      return this;
    if (position === 0)
      list.shift();
    else {
      spliceOne(list, position);
    }
    if (list.length === 1)
      events2[type] = list[0];
    if (events2.removeListener !== void 0)
      this.emit("removeListener", type, originalListener || listener);
  }
  return this;
};
EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
  var listeners2, events2, i2;
  events2 = this._events;
  if (events2 === void 0)
    return this;
  if (events2.removeListener === void 0) {
    if (arguments.length === 0) {
      this._events = /* @__PURE__ */ Object.create(null);
      this._eventsCount = 0;
    } else if (events2[type] !== void 0) {
      if (--this._eventsCount === 0)
        this._events = /* @__PURE__ */ Object.create(null);
      else
        delete events2[type];
    }
    return this;
  }
  if (arguments.length === 0) {
    var keys = Object.keys(events2);
    var key;
    for (i2 = 0; i2 < keys.length; ++i2) {
      key = keys[i2];
      if (key === "removeListener") continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners("removeListener");
    this._events = /* @__PURE__ */ Object.create(null);
    this._eventsCount = 0;
    return this;
  }
  listeners2 = events2[type];
  if (typeof listeners2 === "function") {
    this.removeListener(type, listeners2);
  } else if (listeners2 !== void 0) {
    for (i2 = listeners2.length - 1; i2 >= 0; i2--) {
      this.removeListener(type, listeners2[i2]);
    }
  }
  return this;
};
function _listeners(target, type, unwrap) {
  var events2 = target._events;
  if (events2 === void 0)
    return [];
  var evlistener = events2[type];
  if (evlistener === void 0)
    return [];
  if (typeof evlistener === "function")
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];
  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}
EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};
EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};
EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === "function") {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};
EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events2 = this._events;
  if (events2 !== void 0) {
    var evlistener = events2[type];
    if (typeof evlistener === "function") {
      return 1;
    } else if (evlistener !== void 0) {
      return evlistener.length;
    }
  }
  return 0;
}
EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
};
function arrayClone(arr, n2) {
  var copy = new Array(n2);
  for (var i2 = 0; i2 < n2; ++i2)
    copy[i2] = arr[i2];
  return copy;
}
function spliceOne(list, index) {
  for (; index + 1 < list.length; index++)
    list[index] = list[index + 1];
  list.pop();
}
function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i2 = 0; i2 < ret.length; ++i2) {
    ret[i2] = arr[i2].listener || arr[i2];
  }
  return ret;
}
function once2(emitter, name) {
  return new Promise(function(resolve, reject) {
    function errorListener(err) {
      emitter.removeListener(name, resolver);
      reject(err);
    }
    function resolver() {
      if (typeof emitter.removeListener === "function") {
        emitter.removeListener("error", errorListener);
      }
      resolve([].slice.call(arguments));
    }
    eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
    if (name !== "error") {
      addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
    }
  });
}
function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
  if (typeof emitter.on === "function") {
    eventTargetAgnosticAddListener(emitter, "error", handler, flags);
  }
}
function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
  if (typeof emitter.on === "function") {
    if (flags.once) {
      emitter.once(name, listener);
    } else {
      emitter.on(name, listener);
    }
  } else if (typeof emitter.addEventListener === "function") {
    emitter.addEventListener(name, function wrapListener(arg) {
      if (flags.once) {
        emitter.removeEventListener(name, wrapListener);
      }
      listener(arg);
    });
  } else {
    throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
  }
}
var eventsExports = events.exports;
const es = /* @__PURE__ */ getDefaultExportFromCjs$1(eventsExports);
const PARSE_ERROR = "PARSE_ERROR";
const INVALID_REQUEST = "INVALID_REQUEST";
const METHOD_NOT_FOUND = "METHOD_NOT_FOUND";
const INVALID_PARAMS = "INVALID_PARAMS";
const INTERNAL_ERROR = "INTERNAL_ERROR";
const SERVER_ERROR = "SERVER_ERROR";
const RESERVED_ERROR_CODES = [-32700, -32600, -32601, -32602, -32603];
const STANDARD_ERROR_MAP = {
  [PARSE_ERROR]: { code: -32700, message: "Parse error" },
  [INVALID_REQUEST]: { code: -32600, message: "Invalid Request" },
  [METHOD_NOT_FOUND]: { code: -32601, message: "Method not found" },
  [INVALID_PARAMS]: { code: -32602, message: "Invalid params" },
  [INTERNAL_ERROR]: { code: -32603, message: "Internal error" },
  [SERVER_ERROR]: { code: -32e3, message: "Server error" }
};
const DEFAULT_ERROR = SERVER_ERROR;
function isReservedErrorCode(code2) {
  return RESERVED_ERROR_CODES.includes(code2);
}
function getError(type) {
  if (!Object.keys(STANDARD_ERROR_MAP).includes(type)) {
    return STANDARD_ERROR_MAP[DEFAULT_ERROR];
  }
  return STANDARD_ERROR_MAP[type];
}
function getErrorByCode(code2) {
  const match = Object.values(STANDARD_ERROR_MAP).find((e) => e.code === code2);
  if (!match) {
    return STANDARD_ERROR_MAP[DEFAULT_ERROR];
  }
  return match;
}
var cjs$1 = {};
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var extendStatics = function(d, b2) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b3) {
    d2.__proto__ = b3;
  } || function(d2, b3) {
    for (var p2 in b3) if (b3.hasOwnProperty(p2)) d2[p2] = b3[p2];
  };
  return extendStatics(d, b2);
};
function __extends(d, b2) {
  extendStatics(d, b2);
  function __() {
    this.constructor = d;
  }
  d.prototype = b2 === null ? Object.create(b2) : (__.prototype = b2.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i2 = 1, n2 = arguments.length; i2 < n2; i2++) {
      s = arguments[i2];
      for (var p2 in s) if (Object.prototype.hasOwnProperty.call(s, p2)) t[p2] = s[p2];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __rest(s, e) {
  var t = {};
  for (var p2 in s) if (Object.prototype.hasOwnProperty.call(s, p2) && e.indexOf(p2) < 0)
    t[p2] = s[p2];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i2 = 0, p2 = Object.getOwnPropertySymbols(s); i2 < p2.length; i2++) {
      if (e.indexOf(p2[i2]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p2[i2]))
        t[p2[i2]] = s[p2[i2]];
    }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c2 = arguments.length, r = c2 < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i2 = decorators.length - 1; i2 >= 0; i2--) if (d = decorators[i2]) r = (c2 < 3 ? d(r) : c2 > 3 ? d(target, key, r) : d(target, key)) || r;
  return c2 > 3 && r && Object.defineProperty(target, key, r), r;
}
function __param(paramIndex, decorator) {
  return function(target, key) {
    decorator(target, key, paramIndex);
  };
}
function __metadata(metadataKey, metadataValue) {
  if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}
function __awaiter(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
}
function __generator(thisArg, body) {
  var _2 = { label: 0, sent: function() {
    if (t[0] & 1) throw t[1];
    return t[1];
  }, trys: [], ops: [] }, f2, y2, t, g2;
  return g2 = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g2[Symbol.iterator] = function() {
    return this;
  }), g2;
  function verb(n2) {
    return function(v2) {
      return step([n2, v2]);
    };
  }
  function step(op) {
    if (f2) throw new TypeError("Generator is already executing.");
    while (_2) try {
      if (f2 = 1, y2 && (t = op[0] & 2 ? y2["return"] : op[0] ? y2["throw"] || ((t = y2["return"]) && t.call(y2), 0) : y2.next) && !(t = t.call(y2, op[1])).done) return t;
      if (y2 = 0, t) op = [op[0] & 2, t.value];
      switch (op[0]) {
        case 0:
        case 1:
          t = op;
          break;
        case 4:
          _2.label++;
          return { value: op[1], done: false };
        case 5:
          _2.label++;
          y2 = op[1];
          op = [0];
          continue;
        case 7:
          op = _2.ops.pop();
          _2.trys.pop();
          continue;
        default:
          if (!(t = _2.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
            _2 = 0;
            continue;
          }
          if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
            _2.label = op[1];
            break;
          }
          if (op[0] === 6 && _2.label < t[1]) {
            _2.label = t[1];
            t = op;
            break;
          }
          if (t && _2.label < t[2]) {
            _2.label = t[2];
            _2.ops.push(op);
            break;
          }
          if (t[2]) _2.ops.pop();
          _2.trys.pop();
          continue;
      }
      op = body.call(thisArg, _2);
    } catch (e) {
      op = [6, e];
      y2 = 0;
    } finally {
      f2 = t = 0;
    }
    if (op[0] & 5) throw op[1];
    return { value: op[0] ? op[1] : void 0, done: true };
  }
}
function __createBinding(o, m, k2, k22) {
  if (k22 === void 0) k22 = k2;
  o[k22] = m[k2];
}
function __exportStar(m, exports) {
  for (var p2 in m) if (p2 !== "default" && !exports.hasOwnProperty(p2)) exports[p2] = m[p2];
}
function __values(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i2 = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i2 >= o.length) o = void 0;
      return { value: o && o[i2++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read(o, n2) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i2 = m.call(o), r, ar = [], e;
  try {
    while ((n2 === void 0 || n2-- > 0) && !(r = i2.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i2["return"])) m.call(i2);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i2 = 0; i2 < arguments.length; i2++)
    ar = ar.concat(__read(arguments[i2]));
  return ar;
}
function __spreadArrays() {
  for (var s = 0, i2 = 0, il = arguments.length; i2 < il; i2++) s += arguments[i2].length;
  for (var r = Array(s), k2 = 0, i2 = 0; i2 < il; i2++)
    for (var a = arguments[i2], j = 0, jl = a.length; j < jl; j++, k2++)
      r[k2] = a[j];
  return r;
}
function __await(v2) {
  return this instanceof __await ? (this.v = v2, this) : new __await(v2);
}
function __asyncGenerator(thisArg, _arguments, generator) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var g2 = generator.apply(thisArg, _arguments || []), i2, q = [];
  return i2 = {}, verb("next"), verb("throw"), verb("return"), i2[Symbol.asyncIterator] = function() {
    return this;
  }, i2;
  function verb(n2) {
    if (g2[n2]) i2[n2] = function(v2) {
      return new Promise(function(a, b2) {
        q.push([n2, v2, a, b2]) > 1 || resume(n2, v2);
      });
    };
  }
  function resume(n2, v2) {
    try {
      step(g2[n2](v2));
    } catch (e) {
      settle(q[0][3], e);
    }
  }
  function step(r) {
    r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
  }
  function fulfill(value) {
    resume("next", value);
  }
  function reject(value) {
    resume("throw", value);
  }
  function settle(f2, v2) {
    if (f2(v2), q.shift(), q.length) resume(q[0][0], q[0][1]);
  }
}
function __asyncDelegator(o) {
  var i2, p2;
  return i2 = {}, verb("next"), verb("throw", function(e) {
    throw e;
  }), verb("return"), i2[Symbol.iterator] = function() {
    return this;
  }, i2;
  function verb(n2, f2) {
    i2[n2] = o[n2] ? function(v2) {
      return (p2 = !p2) ? { value: __await(o[n2](v2)), done: n2 === "return" } : f2 ? f2(v2) : v2;
    } : f2;
  }
}
function __asyncValues(o) {
  if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
  var m = o[Symbol.asyncIterator], i2;
  return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i2 = {}, verb("next"), verb("throw"), verb("return"), i2[Symbol.asyncIterator] = function() {
    return this;
  }, i2);
  function verb(n2) {
    i2[n2] = o[n2] && function(v2) {
      return new Promise(function(resolve, reject) {
        v2 = o[n2](v2), settle(resolve, reject, v2.done, v2.value);
      });
    };
  }
  function settle(resolve, reject, d, v2) {
    Promise.resolve(v2).then(function(v3) {
      resolve({ value: v3, done: d });
    }, reject);
  }
}
function __makeTemplateObject(cooked, raw) {
  if (Object.defineProperty) {
    Object.defineProperty(cooked, "raw", { value: raw });
  } else {
    cooked.raw = raw;
  }
  return cooked;
}
function __importStar(mod) {
  if (mod && mod.__esModule) return mod;
  var result = {};
  if (mod != null) {
    for (var k2 in mod) if (Object.hasOwnProperty.call(mod, k2)) result[k2] = mod[k2];
  }
  result.default = mod;
  return result;
}
function __importDefault(mod) {
  return mod && mod.__esModule ? mod : { default: mod };
}
function __classPrivateFieldGet(receiver, privateMap) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to get private field on non-instance");
  }
  return privateMap.get(receiver);
}
function __classPrivateFieldSet(receiver, privateMap, value) {
  if (!privateMap.has(receiver)) {
    throw new TypeError("attempted to set private field on non-instance");
  }
  privateMap.set(receiver, value);
  return value;
}
const tslib_es6 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get __assign() {
    return __assign;
  },
  __asyncDelegator,
  __asyncGenerator,
  __asyncValues,
  __await,
  __awaiter,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __createBinding,
  __decorate,
  __exportStar,
  __extends,
  __generator,
  __importDefault,
  __importStar,
  __makeTemplateObject,
  __metadata,
  __param,
  __read,
  __rest,
  __spread,
  __spreadArrays,
  __values
}, Symbol.toStringTag, { value: "Module" }));
const require$$0 = /* @__PURE__ */ getAugmentedNamespace(tslib_es6);
var crypto = {};
var hasRequiredCrypto;
function requireCrypto() {
  if (hasRequiredCrypto) return crypto;
  hasRequiredCrypto = 1;
  Object.defineProperty(crypto, "__esModule", { value: true });
  crypto.isBrowserCryptoAvailable = crypto.getSubtleCrypto = crypto.getBrowerCrypto = void 0;
  function getBrowerCrypto() {
    return (commonjsGlobal === null || commonjsGlobal === void 0 ? void 0 : commonjsGlobal.crypto) || (commonjsGlobal === null || commonjsGlobal === void 0 ? void 0 : commonjsGlobal.msCrypto) || {};
  }
  crypto.getBrowerCrypto = getBrowerCrypto;
  function getSubtleCrypto() {
    const browserCrypto = getBrowerCrypto();
    return browserCrypto.subtle || browserCrypto.webkitSubtle;
  }
  crypto.getSubtleCrypto = getSubtleCrypto;
  function isBrowserCryptoAvailable() {
    return !!getBrowerCrypto() && !!getSubtleCrypto();
  }
  crypto.isBrowserCryptoAvailable = isBrowserCryptoAvailable;
  return crypto;
}
function getDefaultExportFromCjs(x2) {
  return x2 && x2.__esModule && Object.prototype.hasOwnProperty.call(x2, "default") ? x2["default"] : x2;
}
var browser = { exports: {} };
var process = browser.exports = {};
var cachedSetTimeout;
var cachedClearTimeout;
function defaultSetTimout() {
  throw new Error("setTimeout has not been defined");
}
function defaultClearTimeout() {
  throw new Error("clearTimeout has not been defined");
}
(function() {
  try {
    if (typeof setTimeout === "function") {
      cachedSetTimeout = setTimeout;
    } else {
      cachedSetTimeout = defaultSetTimout;
    }
  } catch (e) {
    cachedSetTimeout = defaultSetTimout;
  }
  try {
    if (typeof clearTimeout === "function") {
      cachedClearTimeout = clearTimeout;
    } else {
      cachedClearTimeout = defaultClearTimeout;
    }
  } catch (e) {
    cachedClearTimeout = defaultClearTimeout;
  }
})();
function runTimeout(fun) {
  if (cachedSetTimeout === setTimeout) {
    return setTimeout(fun, 0);
  }
  if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
    cachedSetTimeout = setTimeout;
    return setTimeout(fun, 0);
  }
  try {
    return cachedSetTimeout(fun, 0);
  } catch (e) {
    try {
      return cachedSetTimeout.call(null, fun, 0);
    } catch (e2) {
      return cachedSetTimeout.call(this, fun, 0);
    }
  }
}
function runClearTimeout(marker) {
  if (cachedClearTimeout === clearTimeout) {
    return clearTimeout(marker);
  }
  if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
    cachedClearTimeout = clearTimeout;
    return clearTimeout(marker);
  }
  try {
    return cachedClearTimeout(marker);
  } catch (e) {
    try {
      return cachedClearTimeout.call(null, marker);
    } catch (e2) {
      return cachedClearTimeout.call(this, marker);
    }
  }
}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;
function cleanUpNextTick() {
  if (!draining || !currentQueue) {
    return;
  }
  draining = false;
  if (currentQueue.length) {
    queue = currentQueue.concat(queue);
  } else {
    queueIndex = -1;
  }
  if (queue.length) {
    drainQueue();
  }
}
function drainQueue() {
  if (draining) {
    return;
  }
  var timeout = runTimeout(cleanUpNextTick);
  draining = true;
  var len = queue.length;
  while (len) {
    currentQueue = queue;
    queue = [];
    while (++queueIndex < len) {
      if (currentQueue) {
        currentQueue[queueIndex].run();
      }
    }
    queueIndex = -1;
    len = queue.length;
  }
  currentQueue = null;
  draining = false;
  runClearTimeout(timeout);
}
process.nextTick = function(fun) {
  var args = new Array(arguments.length - 1);
  if (arguments.length > 1) {
    for (var i2 = 1; i2 < arguments.length; i2++) {
      args[i2 - 1] = arguments[i2];
    }
  }
  queue.push(new Item(fun, args));
  if (queue.length === 1 && !draining) {
    runTimeout(drainQueue);
  }
};
function Item(fun, array) {
  this.fun = fun;
  this.array = array;
}
Item.prototype.run = function() {
  this.fun.apply(null, this.array);
};
process.title = "browser";
process.browser = true;
process.env = {};
process.argv = [];
process.version = "";
process.versions = {};
function noop() {
}
process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;
process.listeners = function(name) {
  return [];
};
process.binding = function(name) {
  throw new Error("process.binding is not supported");
};
process.cwd = function() {
  return "/";
};
process.chdir = function(dir) {
  throw new Error("process.chdir is not supported");
};
process.umask = function() {
  return 0;
};
var browserExports = browser.exports;
const process$1 = /* @__PURE__ */ getDefaultExportFromCjs(browserExports);
var env = {};
var hasRequiredEnv;
function requireEnv() {
  if (hasRequiredEnv) return env;
  hasRequiredEnv = 1;
  Object.defineProperty(env, "__esModule", { value: true });
  env.isBrowser = env.isNode = env.isReactNative = void 0;
  function isReactNative2() {
    return typeof document === "undefined" && typeof navigator !== "undefined" && navigator.product === "ReactNative";
  }
  env.isReactNative = isReactNative2;
  function isNode() {
    return typeof process$1 !== "undefined" && typeof process$1.versions !== "undefined" && typeof process$1.versions.node !== "undefined";
  }
  env.isNode = isNode;
  function isBrowser() {
    return !isReactNative2() && !isNode();
  }
  env.isBrowser = isBrowser;
  return env;
}
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  const tslib_1 = require$$0;
  tslib_1.__exportStar(requireCrypto(), exports);
  tslib_1.__exportStar(requireEnv(), exports);
})(cjs$1);
function payloadId(entropy = 3) {
  const date = Date.now() * Math.pow(10, entropy);
  const extra = Math.floor(Math.random() * Math.pow(10, entropy));
  return date + extra;
}
function getBigIntRpcId(entropy = 6) {
  return BigInt(payloadId(entropy));
}
function formatJsonRpcRequest(method, params, id) {
  return {
    id: id || payloadId(),
    jsonrpc: "2.0",
    method,
    params
  };
}
function formatJsonRpcResult(id, result) {
  return {
    id,
    jsonrpc: "2.0",
    result
  };
}
function formatJsonRpcError(id, error, data) {
  return {
    id,
    jsonrpc: "2.0",
    error: formatErrorMessage(error)
  };
}
function formatErrorMessage(error, data) {
  if (typeof error === "undefined") {
    return getError(INTERNAL_ERROR);
  }
  if (typeof error === "string") {
    error = Object.assign(Object.assign({}, getError(SERVER_ERROR)), { message: error });
  }
  if (isReservedErrorCode(error.code)) {
    error = getErrorByCode(error.code);
  }
  return error;
}
function isJsonRpcPayload(payload) {
  return typeof payload === "object" && "id" in payload && "jsonrpc" in payload && payload.jsonrpc === "2.0";
}
function isJsonRpcRequest(payload) {
  return isJsonRpcPayload(payload) && "method" in payload;
}
function isJsonRpcResponse(payload) {
  return isJsonRpcPayload(payload) && (isJsonRpcResult(payload) || isJsonRpcError(payload));
}
function isJsonRpcResult(payload) {
  return "result" in payload;
}
function isJsonRpcError(payload) {
  return "error" in payload;
}
var cjs = {};
var utils = {};
var delay = {};
var hasRequiredDelay;
function requireDelay() {
  if (hasRequiredDelay) return delay;
  hasRequiredDelay = 1;
  Object.defineProperty(delay, "__esModule", { value: true });
  delay.delay = void 0;
  function delay$1(timeout) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, timeout);
    });
  }
  delay.delay = delay$1;
  return delay;
}
var convert = {};
var constants = {};
var misc = {};
var hasRequiredMisc;
function requireMisc() {
  if (hasRequiredMisc) return misc;
  hasRequiredMisc = 1;
  Object.defineProperty(misc, "__esModule", { value: true });
  misc.ONE_THOUSAND = misc.ONE_HUNDRED = void 0;
  misc.ONE_HUNDRED = 100;
  misc.ONE_THOUSAND = 1e3;
  return misc;
}
var time = {};
var hasRequiredTime;
function requireTime() {
  if (hasRequiredTime) return time;
  hasRequiredTime = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ONE_YEAR = exports.FOUR_WEEKS = exports.THREE_WEEKS = exports.TWO_WEEKS = exports.ONE_WEEK = exports.THIRTY_DAYS = exports.SEVEN_DAYS = exports.FIVE_DAYS = exports.THREE_DAYS = exports.ONE_DAY = exports.TWENTY_FOUR_HOURS = exports.TWELVE_HOURS = exports.SIX_HOURS = exports.THREE_HOURS = exports.ONE_HOUR = exports.SIXTY_MINUTES = exports.THIRTY_MINUTES = exports.TEN_MINUTES = exports.FIVE_MINUTES = exports.ONE_MINUTE = exports.SIXTY_SECONDS = exports.THIRTY_SECONDS = exports.TEN_SECONDS = exports.FIVE_SECONDS = exports.ONE_SECOND = void 0;
    exports.ONE_SECOND = 1;
    exports.FIVE_SECONDS = 5;
    exports.TEN_SECONDS = 10;
    exports.THIRTY_SECONDS = 30;
    exports.SIXTY_SECONDS = 60;
    exports.ONE_MINUTE = exports.SIXTY_SECONDS;
    exports.FIVE_MINUTES = exports.ONE_MINUTE * 5;
    exports.TEN_MINUTES = exports.ONE_MINUTE * 10;
    exports.THIRTY_MINUTES = exports.ONE_MINUTE * 30;
    exports.SIXTY_MINUTES = exports.ONE_MINUTE * 60;
    exports.ONE_HOUR = exports.SIXTY_MINUTES;
    exports.THREE_HOURS = exports.ONE_HOUR * 3;
    exports.SIX_HOURS = exports.ONE_HOUR * 6;
    exports.TWELVE_HOURS = exports.ONE_HOUR * 12;
    exports.TWENTY_FOUR_HOURS = exports.ONE_HOUR * 24;
    exports.ONE_DAY = exports.TWENTY_FOUR_HOURS;
    exports.THREE_DAYS = exports.ONE_DAY * 3;
    exports.FIVE_DAYS = exports.ONE_DAY * 5;
    exports.SEVEN_DAYS = exports.ONE_DAY * 7;
    exports.THIRTY_DAYS = exports.ONE_DAY * 30;
    exports.ONE_WEEK = exports.SEVEN_DAYS;
    exports.TWO_WEEKS = exports.ONE_WEEK * 2;
    exports.THREE_WEEKS = exports.ONE_WEEK * 3;
    exports.FOUR_WEEKS = exports.ONE_WEEK * 4;
    exports.ONE_YEAR = exports.ONE_DAY * 365;
  })(time);
  return time;
}
var hasRequiredConstants;
function requireConstants() {
  if (hasRequiredConstants) return constants;
  hasRequiredConstants = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    const tslib_1 = require$$0;
    tslib_1.__exportStar(requireMisc(), exports);
    tslib_1.__exportStar(requireTime(), exports);
  })(constants);
  return constants;
}
var hasRequiredConvert;
function requireConvert() {
  if (hasRequiredConvert) return convert;
  hasRequiredConvert = 1;
  Object.defineProperty(convert, "__esModule", { value: true });
  convert.fromMiliseconds = convert.toMiliseconds = void 0;
  const constants_1 = requireConstants();
  function toMiliseconds(seconds) {
    return seconds * constants_1.ONE_THOUSAND;
  }
  convert.toMiliseconds = toMiliseconds;
  function fromMiliseconds(miliseconds) {
    return Math.floor(miliseconds / constants_1.ONE_THOUSAND);
  }
  convert.fromMiliseconds = fromMiliseconds;
  return convert;
}
var hasRequiredUtils;
function requireUtils() {
  if (hasRequiredUtils) return utils;
  hasRequiredUtils = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    const tslib_1 = require$$0;
    tslib_1.__exportStar(requireDelay(), exports);
    tslib_1.__exportStar(requireConvert(), exports);
  })(utils);
  return utils;
}
var watch$1 = {};
var hasRequiredWatch$1;
function requireWatch$1() {
  if (hasRequiredWatch$1) return watch$1;
  hasRequiredWatch$1 = 1;
  Object.defineProperty(watch$1, "__esModule", { value: true });
  watch$1.Watch = void 0;
  class Watch {
    constructor() {
      this.timestamps = /* @__PURE__ */ new Map();
    }
    start(label) {
      if (this.timestamps.has(label)) {
        throw new Error(`Watch already started for label: ${label}`);
      }
      this.timestamps.set(label, { started: Date.now() });
    }
    stop(label) {
      const timestamp = this.get(label);
      if (typeof timestamp.elapsed !== "undefined") {
        throw new Error(`Watch already stopped for label: ${label}`);
      }
      const elapsed = Date.now() - timestamp.started;
      this.timestamps.set(label, { started: timestamp.started, elapsed });
    }
    get(label) {
      const timestamp = this.timestamps.get(label);
      if (typeof timestamp === "undefined") {
        throw new Error(`No timestamp found for label: ${label}`);
      }
      return timestamp;
    }
    elapsed(label) {
      const timestamp = this.get(label);
      const elapsed = timestamp.elapsed || Date.now() - timestamp.started;
      return elapsed;
    }
  }
  watch$1.Watch = Watch;
  watch$1.default = Watch;
  return watch$1;
}
var types = {};
var watch = {};
var hasRequiredWatch;
function requireWatch() {
  if (hasRequiredWatch) return watch;
  hasRequiredWatch = 1;
  Object.defineProperty(watch, "__esModule", { value: true });
  watch.IWatch = void 0;
  class IWatch {
  }
  watch.IWatch = IWatch;
  return watch;
}
var hasRequiredTypes;
function requireTypes() {
  if (hasRequiredTypes) return types;
  hasRequiredTypes = 1;
  (function(exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    const tslib_1 = require$$0;
    tslib_1.__exportStar(requireWatch(), exports);
  })(types);
  return types;
}
(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  const tslib_1 = require$$0;
  tslib_1.__exportStar(requireUtils(), exports);
  tslib_1.__exportStar(requireWatch$1(), exports);
  tslib_1.__exportStar(requireTypes(), exports);
  tslib_1.__exportStar(requireConstants(), exports);
})(cjs);
const global$1 = globalThis || void 0 || self;
class S {
  constructor(s) {
    this.opts = s, this.protocol = "wc", this.version = 2;
  }
}
class M {
  constructor(s) {
    this.client = s;
  }
}
const be = "wc", Ce = 2, Le = "client", ye = `${be}@${Ce}:${Le}:`, we = { name: Le, logger: "error", controller: false, relayUrl: "wss://relay.walletconnect.org" }, xe = "WALLETCONNECT_DEEPLINK_CHOICE", st = "proposal", it = "Proposal expired", rt = "session", z = cjs.SEVEN_DAYS, nt = "engine", v = { wc_sessionPropose: { req: { ttl: cjs.FIVE_MINUTES, prompt: true, tag: 1100 }, res: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1101 }, reject: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1120 }, autoReject: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1121 } }, wc_sessionSettle: { req: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1102 }, res: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1103 } }, wc_sessionUpdate: { req: { ttl: cjs.ONE_DAY, prompt: false, tag: 1104 }, res: { ttl: cjs.ONE_DAY, prompt: false, tag: 1105 } }, wc_sessionExtend: { req: { ttl: cjs.ONE_DAY, prompt: false, tag: 1106 }, res: { ttl: cjs.ONE_DAY, prompt: false, tag: 1107 } }, wc_sessionRequest: { req: { ttl: cjs.FIVE_MINUTES, prompt: true, tag: 1108 }, res: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1109 } }, wc_sessionEvent: { req: { ttl: cjs.FIVE_MINUTES, prompt: true, tag: 1110 }, res: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1111 } }, wc_sessionDelete: { req: { ttl: cjs.ONE_DAY, prompt: false, tag: 1112 }, res: { ttl: cjs.ONE_DAY, prompt: false, tag: 1113 } }, wc_sessionPing: { req: { ttl: cjs.ONE_DAY, prompt: false, tag: 1114 }, res: { ttl: cjs.ONE_DAY, prompt: false, tag: 1115 } }, wc_sessionAuthenticate: { req: { ttl: cjs.ONE_HOUR, prompt: true, tag: 1116 }, res: { ttl: cjs.ONE_HOUR, prompt: false, tag: 1117 }, reject: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1118 }, autoReject: { ttl: cjs.FIVE_MINUTES, prompt: false, tag: 1119 } } }, me = { min: cjs.FIVE_MINUTES, max: cjs.SEVEN_DAYS }, x = { idle: "IDLE", active: "ACTIVE" }, ot = "request", at = ["wc_sessionPropose", "wc_sessionRequest", "wc_authRequest", "wc_sessionAuthenticate"], ct = "wc", lt = "auth", pt = "authKeys", ht = "pairingTopics", dt = "requests", oe = `${ct}@${1.5}:${lt}:`, ae = `${oe}:PUB_KEY`;
var ys = Object.defineProperty, ws = Object.defineProperties, ms = Object.getOwnPropertyDescriptors, ut = Object.getOwnPropertySymbols, _s = Object.prototype.hasOwnProperty, Es = Object.prototype.propertyIsEnumerable, gt = (q, o, e) => o in q ? ys(q, o, { enumerable: true, configurable: true, writable: true, value: e }) : q[o] = e, I = (q, o) => {
  for (var e in o || (o = {})) _s.call(o, e) && gt(q, e, o[e]);
  if (ut) for (var e of ut(o)) Es.call(o, e) && gt(q, e, o[e]);
  return q;
}, D = (q, o) => ws(q, ms(o));
class Rs extends M {
  constructor(o) {
    super(o), this.name = nt, this.events = new es(), this.initialized = false, this.requestQueue = { state: x.idle, queue: [] }, this.sessionRequestQueue = { state: x.idle, queue: [] }, this.requestQueueDelay = cjs.ONE_SECOND, this.expectedPairingMethodMap = /* @__PURE__ */ new Map(), this.recentlyDeletedMap = /* @__PURE__ */ new Map(), this.recentlyDeletedLimit = 200, this.relayMessageCache = [], this.init = async () => {
      this.initialized || (await this.cleanup(), this.registerRelayerEvents(), this.registerExpirerEvents(), this.registerPairingEvents(), await this.registerLinkModeListeners(), this.client.core.pairing.register({ methods: Object.keys(v) }), this.initialized = true, setTimeout(() => {
        this.sessionRequestQueue.queue = this.getPendingSessionRequests(), this.processSessionRequestQueue();
      }, cjs.toMiliseconds(this.requestQueueDelay)));
    }, this.connect = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      const t = D(I({}, e), { requiredNamespaces: e.requiredNamespaces || {}, optionalNamespaces: e.optionalNamespaces || {} });
      await this.isValidConnect(t);
      const { pairingTopic: s, requiredNamespaces: i2, optionalNamespaces: r, sessionProperties: n2, relays: a } = t;
      let c2 = s, h, p2 = false;
      try {
        c2 && (p2 = this.client.core.pairing.pairings.get(c2).active);
      } catch (E2) {
        throw this.client.logger.error(`connect() -> pairing.get(${c2}) failed`), E2;
      }
      if (!c2 || !p2) {
        const { topic: E2, uri: S2 } = await this.client.core.pairing.create();
        c2 = E2, h = S2;
      }
      if (!c2) {
        const { message: E2 } = getInternalError("NO_MATCHING_KEY", `connect() pairing topic: ${c2}`);
        throw new Error(E2);
      }
      const d = await this.client.core.crypto.generateKeyPair(), l = v.wc_sessionPropose.req.ttl || cjs.FIVE_MINUTES, w2 = calcExpiry(l), m = I({ requiredNamespaces: i2, optionalNamespaces: r, relays: a ?? [{ protocol: RELAYER_DEFAULT_PROTOCOL }], proposer: { publicKey: d, metadata: this.client.metadata }, expiryTimestamp: w2, pairingTopic: c2 }, n2 && { sessionProperties: n2 }), { reject: y2, resolve: _2, done: R2 } = createDelayedPromise(l, it);
      this.events.once(engineEvent("session_connect"), async ({ error: E2, session: S2 }) => {
        if (E2) y2(E2);
        else if (S2) {
          S2.self.publicKey = d;
          const M2 = D(I({}, S2), { pairingTopic: m.pairingTopic, requiredNamespaces: m.requiredNamespaces, optionalNamespaces: m.optionalNamespaces, transportType: TRANSPORT_TYPES.relay });
          await this.client.session.set(S2.topic, M2), await this.setExpiry(S2.topic, S2.expiry), c2 && await this.client.core.pairing.updateMetadata({ topic: c2, metadata: S2.peer.metadata }), this.cleanupDuplicatePairings(M2), _2(M2);
        }
      });
      const V = await this.sendRequest({ topic: c2, method: "wc_sessionPropose", params: m, throwOnFailedPublish: true });
      return await this.setProposal(V, I({ id: V }, m)), { uri: h, approval: R2 };
    }, this.pair = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        return await this.client.core.pairing.pair(e);
      } catch (t) {
        throw this.client.logger.error("pair() failed"), t;
      }
    }, this.approve = async (e) => {
      var t, s, i2;
      const r = this.client.core.eventClient.createEvent({ properties: { topic: (t = e == null ? void 0 : e.id) == null ? void 0 : t.toString(), trace: [EVENT_CLIENT_SESSION_TRACES.session_approve_started] } });
      try {
        this.isInitialized(), await this.confirmOnlineStateOrThrow();
      } catch (N) {
        throw r.setError(EVENT_CLIENT_SESSION_ERRORS.no_internet_connection), N;
      }
      try {
        await this.isValidProposalId(e == null ? void 0 : e.id);
      } catch (N) {
        throw this.client.logger.error(`approve() -> proposal.get(${e == null ? void 0 : e.id}) failed`), r.setError(EVENT_CLIENT_SESSION_ERRORS.proposal_not_found), N;
      }
      try {
        await this.isValidApprove(e);
      } catch (N) {
        throw this.client.logger.error("approve() -> isValidApprove() failed"), r.setError(EVENT_CLIENT_SESSION_ERRORS.session_approve_namespace_validation_failure), N;
      }
      const { id: n2, relayProtocol: a, namespaces: c2, sessionProperties: h, sessionConfig: p2 } = e, d = this.client.proposal.get(n2);
      this.client.core.eventClient.deleteEvent({ eventId: r.eventId });
      const { pairingTopic: l, proposer: w2, requiredNamespaces: m, optionalNamespaces: y2 } = d;
      let _2 = (s = this.client.core.eventClient) == null ? void 0 : s.getEvent({ topic: l });
      _2 || (_2 = (i2 = this.client.core.eventClient) == null ? void 0 : i2.createEvent({ type: EVENT_CLIENT_SESSION_TRACES.session_approve_started, properties: { topic: l, trace: [EVENT_CLIENT_SESSION_TRACES.session_approve_started, EVENT_CLIENT_SESSION_TRACES.session_namespaces_validation_success] } }));
      const R2 = await this.client.core.crypto.generateKeyPair(), V = w2.publicKey, E2 = await this.client.core.crypto.generateSharedKey(R2, V), S2 = I(I({ relay: { protocol: a ?? "irn" }, namespaces: c2, controller: { publicKey: R2, metadata: this.client.metadata }, expiry: calcExpiry(z) }, h && { sessionProperties: h }), p2 && { sessionConfig: p2 }), M2 = TRANSPORT_TYPES.relay;
      _2.addTrace(EVENT_CLIENT_SESSION_TRACES.subscribing_session_topic);
      try {
        await this.client.core.relayer.subscribe(E2, { transportType: M2 });
      } catch (N) {
        throw _2.setError(EVENT_CLIENT_SESSION_ERRORS.subscribe_session_topic_failure), N;
      }
      _2.addTrace(EVENT_CLIENT_SESSION_TRACES.subscribe_session_topic_success);
      const W = D(I({}, S2), { topic: E2, requiredNamespaces: m, optionalNamespaces: y2, pairingTopic: l, acknowledged: false, self: S2.controller, peer: { publicKey: w2.publicKey, metadata: w2.metadata }, controller: R2, transportType: TRANSPORT_TYPES.relay });
      await this.client.session.set(E2, W), _2.addTrace(EVENT_CLIENT_SESSION_TRACES.store_session);
      try {
        _2.addTrace(EVENT_CLIENT_SESSION_TRACES.publishing_session_settle), await this.sendRequest({ topic: E2, method: "wc_sessionSettle", params: S2, throwOnFailedPublish: true }).catch((N) => {
          throw _2 == null ? void 0 : _2.setError(EVENT_CLIENT_SESSION_ERRORS.session_settle_publish_failure), N;
        }), _2.addTrace(EVENT_CLIENT_SESSION_TRACES.session_settle_publish_success), _2.addTrace(EVENT_CLIENT_SESSION_TRACES.publishing_session_approve), await this.sendResult({ id: n2, topic: l, result: { relay: { protocol: a ?? "irn" }, responderPublicKey: R2 }, throwOnFailedPublish: true }).catch((N) => {
          throw _2 == null ? void 0 : _2.setError(EVENT_CLIENT_SESSION_ERRORS.session_approve_publish_failure), N;
        }), _2.addTrace(EVENT_CLIENT_SESSION_TRACES.session_approve_publish_success);
      } catch (N) {
        throw this.client.logger.error(N), this.client.session.delete(E2, getSdkError("USER_DISCONNECTED")), await this.client.core.relayer.unsubscribe(E2), N;
      }
      return this.client.core.eventClient.deleteEvent({ eventId: _2.eventId }), await this.client.core.pairing.updateMetadata({ topic: l, metadata: w2.metadata }), await this.client.proposal.delete(n2, getSdkError("USER_DISCONNECTED")), await this.client.core.pairing.activate({ topic: l }), await this.setExpiry(E2, calcExpiry(z)), { topic: E2, acknowledged: () => Promise.resolve(this.client.session.get(E2)) };
    }, this.reject = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidReject(e);
      } catch (r) {
        throw this.client.logger.error("reject() -> isValidReject() failed"), r;
      }
      const { id: t, reason: s } = e;
      let i2;
      try {
        i2 = this.client.proposal.get(t).pairingTopic;
      } catch (r) {
        throw this.client.logger.error(`reject() -> proposal.get(${t}) failed`), r;
      }
      i2 && (await this.sendError({ id: t, topic: i2, error: s, rpcOpts: v.wc_sessionPropose.reject }), await this.client.proposal.delete(t, getSdkError("USER_DISCONNECTED")));
    }, this.update = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidUpdate(e);
      } catch (p2) {
        throw this.client.logger.error("update() -> isValidUpdate() failed"), p2;
      }
      const { topic: t, namespaces: s } = e, { done: i2, resolve: r, reject: n2 } = createDelayedPromise(), a = payloadId(), c2 = getBigIntRpcId().toString(), h = this.client.session.get(t).namespaces;
      return this.events.once(engineEvent("session_update", a), ({ error: p2 }) => {
        p2 ? n2(p2) : r();
      }), await this.client.session.update(t, { namespaces: s }), await this.sendRequest({ topic: t, method: "wc_sessionUpdate", params: { namespaces: s }, throwOnFailedPublish: true, clientRpcId: a, relayRpcId: c2 }).catch((p2) => {
        this.client.logger.error(p2), this.client.session.update(t, { namespaces: h }), n2(p2);
      }), { acknowledged: i2 };
    }, this.extend = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidExtend(e);
      } catch (a) {
        throw this.client.logger.error("extend() -> isValidExtend() failed"), a;
      }
      const { topic: t } = e, s = payloadId(), { done: i2, resolve: r, reject: n2 } = createDelayedPromise();
      return this.events.once(engineEvent("session_extend", s), ({ error: a }) => {
        a ? n2(a) : r();
      }), await this.setExpiry(t, calcExpiry(z)), this.sendRequest({ topic: t, method: "wc_sessionExtend", params: {}, clientRpcId: s, throwOnFailedPublish: true }).catch((a) => {
        n2(a);
      }), { acknowledged: i2 };
    }, this.request = async (e) => {
      this.isInitialized();
      try {
        await this.isValidRequest(e);
      } catch (w2) {
        throw this.client.logger.error("request() -> isValidRequest() failed"), w2;
      }
      const { chainId: t, request: s, topic: i2, expiry: r = v.wc_sessionRequest.req.ttl } = e, n2 = this.client.session.get(i2);
      (n2 == null ? void 0 : n2.transportType) === TRANSPORT_TYPES.relay && await this.confirmOnlineStateOrThrow();
      const a = payloadId(), c2 = getBigIntRpcId().toString(), { done: h, resolve: p2, reject: d } = createDelayedPromise(r, "Request expired. Please try again.");
      this.events.once(engineEvent("session_request", a), ({ error: w2, result: m }) => {
        w2 ? d(w2) : p2(m);
      });
      const l = this.getAppLinkIfEnabled(n2.peer.metadata, n2.transportType);
      return l ? (await this.sendRequest({ clientRpcId: a, relayRpcId: c2, topic: i2, method: "wc_sessionRequest", params: { request: D(I({}, s), { expiryTimestamp: calcExpiry(r) }), chainId: t }, expiry: r, throwOnFailedPublish: true, appLink: l }).catch((w2) => d(w2)), this.client.events.emit("session_request_sent", { topic: i2, request: s, chainId: t, id: a }), await h()) : await Promise.all([new Promise(async (w2) => {
        await this.sendRequest({ clientRpcId: a, relayRpcId: c2, topic: i2, method: "wc_sessionRequest", params: { request: D(I({}, s), { expiryTimestamp: calcExpiry(r) }), chainId: t }, expiry: r, throwOnFailedPublish: true }).catch((m) => d(m)), this.client.events.emit("session_request_sent", { topic: i2, request: s, chainId: t, id: a }), w2();
      }), new Promise(async (w2) => {
        var m;
        if (!((m = n2.sessionConfig) != null && m.disableDeepLink)) {
          const y2 = await getDeepLink(this.client.core.storage, xe);
          await handleDeeplinkRedirect({ id: a, topic: i2, wcDeepLink: y2 });
        }
        w2();
      }), h()]).then((w2) => w2[2]);
    }, this.respond = async (e) => {
      this.isInitialized(), await this.isValidRespond(e);
      const { topic: t, response: s } = e, { id: i2 } = s, r = this.client.session.get(t);
      r.transportType === TRANSPORT_TYPES.relay && await this.confirmOnlineStateOrThrow();
      const n2 = this.getAppLinkIfEnabled(r.peer.metadata, r.transportType);
      isJsonRpcResult(s) ? await this.sendResult({ id: i2, topic: t, result: s.result, throwOnFailedPublish: true, appLink: n2 }) : isJsonRpcError(s) && await this.sendError({ id: i2, topic: t, error: s.error, appLink: n2 }), this.cleanupAfterResponse(e);
    }, this.ping = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow();
      try {
        await this.isValidPing(e);
      } catch (s) {
        throw this.client.logger.error("ping() -> isValidPing() failed"), s;
      }
      const { topic: t } = e;
      if (this.client.session.keys.includes(t)) {
        const s = payloadId(), i2 = getBigIntRpcId().toString(), { done: r, resolve: n2, reject: a } = createDelayedPromise();
        this.events.once(engineEvent("session_ping", s), ({ error: c2 }) => {
          c2 ? a(c2) : n2();
        }), await Promise.all([this.sendRequest({ topic: t, method: "wc_sessionPing", params: {}, throwOnFailedPublish: true, clientRpcId: s, relayRpcId: i2 }), r()]);
      } else this.client.core.pairing.pairings.keys.includes(t) && await this.client.core.pairing.ping({ topic: t });
    }, this.emit = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow(), await this.isValidEmit(e);
      const { topic: t, event: s, chainId: i2 } = e, r = getBigIntRpcId().toString();
      await this.sendRequest({ topic: t, method: "wc_sessionEvent", params: { event: s, chainId: i2 }, throwOnFailedPublish: true, relayRpcId: r });
    }, this.disconnect = async (e) => {
      this.isInitialized(), await this.confirmOnlineStateOrThrow(), await this.isValidDisconnect(e);
      const { topic: t } = e;
      if (this.client.session.keys.includes(t)) await this.sendRequest({ topic: t, method: "wc_sessionDelete", params: getSdkError("USER_DISCONNECTED"), throwOnFailedPublish: true }), await this.deleteSession({ topic: t, emitEvent: false });
      else if (this.client.core.pairing.pairings.keys.includes(t)) await this.client.core.pairing.disconnect({ topic: t });
      else {
        const { message: s } = getInternalError("MISMATCHED_TOPIC", `Session or pairing topic not found: ${t}`);
        throw new Error(s);
      }
    }, this.find = (e) => (this.isInitialized(), this.client.session.getAll().filter((t) => isSessionCompatible(t, e))), this.getPendingSessionRequests = () => this.client.pendingRequest.getAll(), this.authenticate = async (e, t) => {
      var s;
      this.isInitialized(), this.isValidAuthenticate(e);
      const i2 = t && this.client.core.linkModeSupportedApps.includes(t) && ((s = this.client.metadata.redirect) == null ? void 0 : s.linkMode), r = i2 ? TRANSPORT_TYPES.link_mode : TRANSPORT_TYPES.relay;
      r === TRANSPORT_TYPES.relay && await this.confirmOnlineStateOrThrow();
      const { chains: n2, statement: a = "", uri: c2, domain: h, nonce: p2, type: d, exp: l, nbf: w2, methods: m = [], expiry: y2 } = e, _2 = [...e.resources || []], { topic: R2, uri: V } = await this.client.core.pairing.create({ methods: ["wc_sessionAuthenticate"], transportType: r });
      this.client.logger.info({ message: "Generated new pairing", pairing: { topic: R2, uri: V } });
      const E2 = await this.client.core.crypto.generateKeyPair(), S2 = hashKey(E2);
      if (await Promise.all([this.client.auth.authKeys.set(ae, { responseTopic: S2, publicKey: E2 }), this.client.auth.pairingTopics.set(S2, { topic: S2, pairingTopic: R2 })]), await this.client.core.relayer.subscribe(S2, { transportType: r }), this.client.logger.info(`sending request to new pairing topic: ${R2}`), m.length > 0) {
        const { namespace: O } = parseChainId(n2[0]);
        let T2 = createEncodedRecap(O, "request", m);
        getRecapFromResources(_2) && (T2 = mergeEncodedRecaps(T2, _2.pop())), _2.push(T2);
      }
      const M2 = y2 && y2 > v.wc_sessionAuthenticate.req.ttl ? y2 : v.wc_sessionAuthenticate.req.ttl, W = { authPayload: { type: d ?? "caip122", chains: n2, statement: a, aud: c2, domain: h, version: "1", nonce: p2, iat: (/* @__PURE__ */ new Date()).toISOString(), exp: l, nbf: w2, resources: _2 }, requester: { publicKey: E2, metadata: this.client.metadata }, expiryTimestamp: calcExpiry(M2) }, N = { eip155: { chains: n2, methods: [.../* @__PURE__ */ new Set(["personal_sign", ...m])], events: ["chainChanged", "accountsChanged"] } }, De = { requiredNamespaces: {}, optionalNamespaces: N, relays: [{ protocol: "irn" }], pairingTopic: R2, proposer: { publicKey: E2, metadata: this.client.metadata }, expiryTimestamp: calcExpiry(v.wc_sessionPropose.req.ttl) }, { done: wt, resolve: Ve, reject: Ee } = createDelayedPromise(M2, "Request expired"), ce = async ({ error: O, session: T2 }) => {
        if (this.events.off(engineEvent("session_request", G), Re), O) Ee(O);
        else if (T2) {
          T2.self.publicKey = E2, await this.client.session.set(T2.topic, T2), await this.setExpiry(T2.topic, T2.expiry), R2 && await this.client.core.pairing.updateMetadata({ topic: R2, metadata: T2.peer.metadata });
          const le = this.client.session.get(T2.topic);
          await this.deleteProposal(Z), Ve({ session: le });
        }
      }, Re = async (O) => {
        var T2, le, Me;
        if (await this.deletePendingAuthRequest(G, { message: "fulfilled", code: 0 }), O.error) {
          const te = getSdkError("WC_METHOD_UNSUPPORTED", "wc_sessionAuthenticate");
          return O.error.code === te.code ? void 0 : (this.events.off(engineEvent("session_connect"), ce), Ee(O.error.message));
        }
        await this.deleteProposal(Z), this.events.off(engineEvent("session_connect"), ce);
        const { cacaos: ke, responder: j } = O.result, Ie = [], $e = [];
        for (const te of ke) {
          await validateSignedCacao({ cacao: te, projectId: this.client.core.projectId }) || (this.client.logger.error(te, "Signature verification failed"), Ee(getSdkError("SESSION_SETTLEMENT_FAILED", "Signature verification failed")));
          const { p: fe } = te, ve = getRecapFromResources(fe.resources), Ke = [getNamespacedDidChainId(fe.iss)], mt = getDidAddress(fe.iss);
          if (ve) {
            const qe = getMethodsFromRecap(ve), _t = getChainsFromRecap(ve);
            Ie.push(...qe), Ke.push(..._t);
          }
          for (const qe of Ke) $e.push(`${qe}:${mt}`);
        }
        const ee = await this.client.core.crypto.generateSharedKey(E2, j.publicKey);
        let pe;
        Ie.length > 0 && (pe = { topic: ee, acknowledged: true, self: { publicKey: E2, metadata: this.client.metadata }, peer: j, controller: j.publicKey, expiry: calcExpiry(z), requiredNamespaces: {}, optionalNamespaces: {}, relay: { protocol: "irn" }, pairingTopic: R2, namespaces: buildNamespacesFromAuth([...new Set(Ie)], [...new Set($e)]), transportType: r }, await this.client.core.relayer.subscribe(ee, { transportType: r }), await this.client.session.set(ee, pe), R2 && await this.client.core.pairing.updateMetadata({ topic: R2, metadata: j.metadata }), pe = this.client.session.get(ee)), (T2 = this.client.metadata.redirect) != null && T2.linkMode && (le = j.metadata.redirect) != null && le.linkMode && (Me = j.metadata.redirect) != null && Me.universal && t && (this.client.core.addLinkModeSupportedApp(j.metadata.redirect.universal), this.client.session.update(ee, { transportType: TRANSPORT_TYPES.link_mode })), Ve({ auths: ke, session: pe });
      }, G = payloadId(), Z = payloadId();
      this.events.once(engineEvent("session_connect"), ce), this.events.once(engineEvent("session_request", G), Re);
      let Se;
      try {
        if (i2) {
          const O = formatJsonRpcRequest("wc_sessionAuthenticate", W, G);
          this.client.core.history.set(R2, O);
          const T2 = await this.client.core.crypto.encode("", O, { type: TYPE_2, encoding: BASE64URL });
          Se = getLinkModeURL(t, R2, T2);
        } else await Promise.all([this.sendRequest({ topic: R2, method: "wc_sessionAuthenticate", params: W, expiry: e.expiry, throwOnFailedPublish: true, clientRpcId: G }), this.sendRequest({ topic: R2, method: "wc_sessionPropose", params: De, expiry: v.wc_sessionPropose.req.ttl, throwOnFailedPublish: true, clientRpcId: Z })]);
      } catch (O) {
        throw this.events.off(engineEvent("session_connect"), ce), this.events.off(engineEvent("session_request", G), Re), O;
      }
      return await this.setProposal(Z, I({ id: Z }, De)), await this.setAuthRequest(G, { request: D(I({}, W), { verifyContext: {} }), pairingTopic: R2, transportType: r }), { uri: Se ?? V, response: wt };
    }, this.approveSessionAuthenticate = async (e) => {
      const { id: t, auths: s } = e, i2 = this.client.core.eventClient.createEvent({ properties: { topic: t.toString(), trace: [EVENT_CLIENT_AUTHENTICATE_TRACES.authenticated_session_approve_started] } });
      try {
        this.isInitialized();
      } catch (y2) {
        throw i2.setError(EVENT_CLIENT_AUTHENTICATE_ERRORS.no_internet_connection), y2;
      }
      const r = this.getPendingAuthRequest(t);
      if (!r) throw i2.setError(EVENT_CLIENT_AUTHENTICATE_ERRORS.authenticated_session_pending_request_not_found), new Error(`Could not find pending auth request with id ${t}`);
      const n2 = r.transportType || TRANSPORT_TYPES.relay;
      n2 === TRANSPORT_TYPES.relay && await this.confirmOnlineStateOrThrow();
      const a = r.requester.publicKey, c2 = await this.client.core.crypto.generateKeyPair(), h = hashKey(a), p2 = { type: TYPE_1, receiverPublicKey: a, senderPublicKey: c2 }, d = [], l = [];
      for (const y2 of s) {
        if (!await validateSignedCacao({ cacao: y2, projectId: this.client.core.projectId })) {
          i2.setError(EVENT_CLIENT_AUTHENTICATE_ERRORS.invalid_cacao);
          const S2 = getSdkError("SESSION_SETTLEMENT_FAILED", "Signature verification failed");
          throw await this.sendError({ id: t, topic: h, error: S2, encodeOpts: p2 }), new Error(S2.message);
        }
        i2.addTrace(EVENT_CLIENT_AUTHENTICATE_TRACES.cacaos_verified);
        const { p: _2 } = y2, R2 = getRecapFromResources(_2.resources), V = [getNamespacedDidChainId(_2.iss)], E2 = getDidAddress(_2.iss);
        if (R2) {
          const S2 = getMethodsFromRecap(R2), M2 = getChainsFromRecap(R2);
          d.push(...S2), V.push(...M2);
        }
        for (const S2 of V) l.push(`${S2}:${E2}`);
      }
      const w2 = await this.client.core.crypto.generateSharedKey(c2, a);
      i2.addTrace(EVENT_CLIENT_AUTHENTICATE_TRACES.create_authenticated_session_topic);
      let m;
      if ((d == null ? void 0 : d.length) > 0) {
        m = { topic: w2, acknowledged: true, self: { publicKey: c2, metadata: this.client.metadata }, peer: { publicKey: a, metadata: r.requester.metadata }, controller: a, expiry: calcExpiry(z), authentication: s, requiredNamespaces: {}, optionalNamespaces: {}, relay: { protocol: "irn" }, pairingTopic: r.pairingTopic, namespaces: buildNamespacesFromAuth([...new Set(d)], [...new Set(l)]), transportType: n2 }, i2.addTrace(EVENT_CLIENT_AUTHENTICATE_TRACES.subscribing_authenticated_session_topic);
        try {
          await this.client.core.relayer.subscribe(w2, { transportType: n2 });
        } catch (y2) {
          throw i2.setError(EVENT_CLIENT_AUTHENTICATE_ERRORS.subscribe_authenticated_session_topic_failure), y2;
        }
        i2.addTrace(EVENT_CLIENT_AUTHENTICATE_TRACES.subscribe_authenticated_session_topic_success), await this.client.session.set(w2, m), i2.addTrace(EVENT_CLIENT_AUTHENTICATE_TRACES.store_authenticated_session), await this.client.core.pairing.updateMetadata({ topic: r.pairingTopic, metadata: r.requester.metadata });
      }
      i2.addTrace(EVENT_CLIENT_AUTHENTICATE_TRACES.publishing_authenticated_session_approve);
      try {
        await this.sendResult({ topic: h, id: t, result: { cacaos: s, responder: { publicKey: c2, metadata: this.client.metadata } }, encodeOpts: p2, throwOnFailedPublish: true, appLink: this.getAppLinkIfEnabled(r.requester.metadata, n2) });
      } catch (y2) {
        throw i2.setError(EVENT_CLIENT_AUTHENTICATE_ERRORS.authenticated_session_approve_publish_failure), y2;
      }
      return await this.client.auth.requests.delete(t, { message: "fulfilled", code: 0 }), await this.client.core.pairing.activate({ topic: r.pairingTopic }), this.client.core.eventClient.deleteEvent({ eventId: i2.eventId }), { session: m };
    }, this.rejectSessionAuthenticate = async (e) => {
      this.isInitialized();
      const { id: t, reason: s } = e, i2 = this.getPendingAuthRequest(t);
      if (!i2) throw new Error(`Could not find pending auth request with id ${t}`);
      i2.transportType === TRANSPORT_TYPES.relay && await this.confirmOnlineStateOrThrow();
      const r = i2.requester.publicKey, n2 = await this.client.core.crypto.generateKeyPair(), a = hashKey(r), c2 = { type: TYPE_1, receiverPublicKey: r, senderPublicKey: n2 };
      await this.sendError({ id: t, topic: a, error: s, encodeOpts: c2, rpcOpts: v.wc_sessionAuthenticate.reject, appLink: this.getAppLinkIfEnabled(i2.requester.metadata, i2.transportType) }), await this.client.auth.requests.delete(t, { message: "rejected", code: 0 }), await this.client.proposal.delete(t, getSdkError("USER_DISCONNECTED"));
    }, this.formatAuthMessage = (e) => {
      this.isInitialized();
      const { request: t, iss: s } = e;
      return formatMessage(t, s);
    }, this.processRelayMessageCache = () => {
      setTimeout(async () => {
        if (this.relayMessageCache.length !== 0) for (; this.relayMessageCache.length > 0; ) try {
          const e = this.relayMessageCache.shift();
          e && await this.onRelayMessage(e);
        } catch (e) {
          this.client.logger.error(e);
        }
      }, 50);
    }, this.cleanupDuplicatePairings = async (e) => {
      if (e.pairingTopic) try {
        const t = this.client.core.pairing.pairings.get(e.pairingTopic), s = this.client.core.pairing.pairings.getAll().filter((i2) => {
          var r, n2;
          return ((r = i2.peerMetadata) == null ? void 0 : r.url) && ((n2 = i2.peerMetadata) == null ? void 0 : n2.url) === e.peer.metadata.url && i2.topic && i2.topic !== t.topic;
        });
        if (s.length === 0) return;
        this.client.logger.info(`Cleaning up ${s.length} duplicate pairing(s)`), await Promise.all(s.map((i2) => this.client.core.pairing.disconnect({ topic: i2.topic }))), this.client.logger.info("Duplicate pairings clean up finished");
      } catch (t) {
        this.client.logger.error(t);
      }
    }, this.deleteSession = async (e) => {
      var t;
      const { topic: s, expirerHasDeleted: i2 = false, emitEvent: r = true, id: n2 = 0 } = e, { self: a } = this.client.session.get(s);
      await this.client.core.relayer.unsubscribe(s), await this.client.session.delete(s, getSdkError("USER_DISCONNECTED")), this.addToRecentlyDeleted(s, "session"), this.client.core.crypto.keychain.has(a.publicKey) && await this.client.core.crypto.deleteKeyPair(a.publicKey), this.client.core.crypto.keychain.has(s) && await this.client.core.crypto.deleteSymKey(s), i2 || this.client.core.expirer.del(s), this.client.core.storage.removeItem(xe).catch((c2) => this.client.logger.warn(c2)), this.getPendingSessionRequests().forEach((c2) => {
        c2.topic === s && this.deletePendingSessionRequest(c2.id, getSdkError("USER_DISCONNECTED"));
      }), s === ((t = this.sessionRequestQueue.queue[0]) == null ? void 0 : t.topic) && (this.sessionRequestQueue.state = x.idle), r && this.client.events.emit("session_delete", { id: n2, topic: s });
    }, this.deleteProposal = async (e, t) => {
      if (t) try {
        const s = this.client.proposal.get(e), i2 = this.client.core.eventClient.getEvent({ topic: s.pairingTopic });
        i2 == null ? void 0 : i2.setError(EVENT_CLIENT_SESSION_ERRORS.proposal_expired);
      } catch {
      }
      await Promise.all([this.client.proposal.delete(e, getSdkError("USER_DISCONNECTED")), t ? Promise.resolve() : this.client.core.expirer.del(e)]), this.addToRecentlyDeleted(e, "proposal");
    }, this.deletePendingSessionRequest = async (e, t, s = false) => {
      await Promise.all([this.client.pendingRequest.delete(e, t), s ? Promise.resolve() : this.client.core.expirer.del(e)]), this.addToRecentlyDeleted(e, "request"), this.sessionRequestQueue.queue = this.sessionRequestQueue.queue.filter((i2) => i2.id !== e), s && (this.sessionRequestQueue.state = x.idle, this.client.events.emit("session_request_expire", { id: e }));
    }, this.deletePendingAuthRequest = async (e, t, s = false) => {
      await Promise.all([this.client.auth.requests.delete(e, t), s ? Promise.resolve() : this.client.core.expirer.del(e)]);
    }, this.setExpiry = async (e, t) => {
      this.client.session.keys.includes(e) && (this.client.core.expirer.set(e, t), await this.client.session.update(e, { expiry: t }));
    }, this.setProposal = async (e, t) => {
      this.client.core.expirer.set(e, calcExpiry(v.wc_sessionPropose.req.ttl)), await this.client.proposal.set(e, t);
    }, this.setAuthRequest = async (e, t) => {
      const { request: s, pairingTopic: i2, transportType: r = TRANSPORT_TYPES.relay } = t;
      this.client.core.expirer.set(e, s.expiryTimestamp), await this.client.auth.requests.set(e, { authPayload: s.authPayload, requester: s.requester, expiryTimestamp: s.expiryTimestamp, id: e, pairingTopic: i2, verifyContext: s.verifyContext, transportType: r });
    }, this.setPendingSessionRequest = async (e) => {
      const { id: t, topic: s, params: i2, verifyContext: r } = e, n2 = i2.request.expiryTimestamp || calcExpiry(v.wc_sessionRequest.req.ttl);
      this.client.core.expirer.set(t, n2), await this.client.pendingRequest.set(t, { id: t, topic: s, params: i2, verifyContext: r });
    }, this.sendRequest = async (e) => {
      const { topic: t, method: s, params: i2, expiry: r, relayRpcId: n2, clientRpcId: a, throwOnFailedPublish: c2, appLink: h } = e, p2 = formatJsonRpcRequest(s, i2, a);
      let d;
      const l = !!h;
      try {
        const y2 = l ? BASE64URL : BASE64;
        d = await this.client.core.crypto.encode(t, p2, { encoding: y2 });
      } catch (y2) {
        throw await this.cleanup(), this.client.logger.error(`sendRequest() -> core.crypto.encode() for topic ${t} failed`), y2;
      }
      let w2;
      if (at.includes(s)) {
        const y2 = hashMessage(JSON.stringify(p2)), _2 = hashMessage(d);
        w2 = await this.client.core.verify.register({ id: _2, decryptedId: y2 });
      }
      const m = v[s].req;
      if (m.attestation = w2, r && (m.ttl = r), n2 && (m.id = n2), this.client.core.history.set(t, p2), l) {
        const y2 = getLinkModeURL(h, t, d);
        await global$1.Linking.openURL(y2, this.client.name);
      } else {
        const y2 = v[s].req;
        r && (y2.ttl = r), n2 && (y2.id = n2), c2 ? (y2.internal = D(I({}, y2.internal), { throwOnFailedPublish: true }), await this.client.core.relayer.publish(t, d, y2)) : this.client.core.relayer.publish(t, d, y2).catch((_2) => this.client.logger.error(_2));
      }
      return p2.id;
    }, this.sendResult = async (e) => {
      const { id: t, topic: s, result: i2, throwOnFailedPublish: r, encodeOpts: n2, appLink: a } = e, c2 = formatJsonRpcResult(t, i2);
      let h;
      const p2 = a && typeof (global$1 == null ? void 0 : global$1.Linking) < "u";
      try {
        const l = p2 ? BASE64URL : BASE64;
        h = await this.client.core.crypto.encode(s, c2, D(I({}, n2 || {}), { encoding: l }));
      } catch (l) {
        throw await this.cleanup(), this.client.logger.error(`sendResult() -> core.crypto.encode() for topic ${s} failed`), l;
      }
      let d;
      try {
        d = await this.client.core.history.get(s, t);
      } catch (l) {
        throw this.client.logger.error(`sendResult() -> history.get(${s}, ${t}) failed`), l;
      }
      if (p2) {
        const l = getLinkModeURL(a, s, h);
        await global$1.Linking.openURL(l, this.client.name);
      } else {
        const l = v[d.request.method].res;
        r ? (l.internal = D(I({}, l.internal), { throwOnFailedPublish: true }), await this.client.core.relayer.publish(s, h, l)) : this.client.core.relayer.publish(s, h, l).catch((w2) => this.client.logger.error(w2));
      }
      await this.client.core.history.resolve(c2);
    }, this.sendError = async (e) => {
      const { id: t, topic: s, error: i2, encodeOpts: r, rpcOpts: n2, appLink: a } = e, c2 = formatJsonRpcError(t, i2);
      let h;
      const p2 = a && typeof (global$1 == null ? void 0 : global$1.Linking) < "u";
      try {
        const l = p2 ? BASE64URL : BASE64;
        h = await this.client.core.crypto.encode(s, c2, D(I({}, r || {}), { encoding: l }));
      } catch (l) {
        throw await this.cleanup(), this.client.logger.error(`sendError() -> core.crypto.encode() for topic ${s} failed`), l;
      }
      let d;
      try {
        d = await this.client.core.history.get(s, t);
      } catch (l) {
        throw this.client.logger.error(`sendError() -> history.get(${s}, ${t}) failed`), l;
      }
      if (p2) {
        const l = getLinkModeURL(a, s, h);
        await global$1.Linking.openURL(l, this.client.name);
      } else {
        const l = n2 || v[d.request.method].res;
        this.client.core.relayer.publish(s, h, l);
      }
      await this.client.core.history.resolve(c2);
    }, this.cleanup = async () => {
      const e = [], t = [];
      this.client.session.getAll().forEach((s) => {
        let i2 = false;
        isExpired(s.expiry) && (i2 = true), this.client.core.crypto.keychain.has(s.topic) || (i2 = true), i2 && e.push(s.topic);
      }), this.client.proposal.getAll().forEach((s) => {
        isExpired(s.expiryTimestamp) && t.push(s.id);
      }), await Promise.all([...e.map((s) => this.deleteSession({ topic: s })), ...t.map((s) => this.deleteProposal(s))]);
    }, this.onRelayEventRequest = async (e) => {
      this.requestQueue.queue.push(e), await this.processRequestsQueue();
    }, this.processRequestsQueue = async () => {
      if (this.requestQueue.state === x.active) {
        this.client.logger.info("Request queue already active, skipping...");
        return;
      }
      for (this.client.logger.info(`Request queue starting with ${this.requestQueue.queue.length} requests`); this.requestQueue.queue.length > 0; ) {
        this.requestQueue.state = x.active;
        const e = this.requestQueue.queue.shift();
        if (e) try {
          await this.processRequest(e);
        } catch (t) {
          this.client.logger.warn(t);
        }
      }
      this.requestQueue.state = x.idle;
    }, this.processRequest = async (e) => {
      const { topic: t, payload: s, attestation: i2, transportType: r, encryptedId: n2 } = e, a = s.method;
      if (!this.shouldIgnorePairingRequest({ topic: t, requestMethod: a })) switch (a) {
        case "wc_sessionPropose":
          return await this.onSessionProposeRequest({ topic: t, payload: s, attestation: i2, encryptedId: n2 });
        case "wc_sessionSettle":
          return await this.onSessionSettleRequest(t, s);
        case "wc_sessionUpdate":
          return await this.onSessionUpdateRequest(t, s);
        case "wc_sessionExtend":
          return await this.onSessionExtendRequest(t, s);
        case "wc_sessionPing":
          return await this.onSessionPingRequest(t, s);
        case "wc_sessionDelete":
          return await this.onSessionDeleteRequest(t, s);
        case "wc_sessionRequest":
          return await this.onSessionRequest({ topic: t, payload: s, attestation: i2, encryptedId: n2, transportType: r });
        case "wc_sessionEvent":
          return await this.onSessionEventRequest(t, s);
        case "wc_sessionAuthenticate":
          return await this.onSessionAuthenticateRequest({ topic: t, payload: s, attestation: i2, encryptedId: n2, transportType: r });
        default:
          return this.client.logger.info(`Unsupported request method ${a}`);
      }
    }, this.onRelayEventResponse = async (e) => {
      const { topic: t, payload: s, transportType: i2 } = e, r = (await this.client.core.history.get(t, s.id)).request.method;
      switch (r) {
        case "wc_sessionPropose":
          return this.onSessionProposeResponse(t, s, i2);
        case "wc_sessionSettle":
          return this.onSessionSettleResponse(t, s);
        case "wc_sessionUpdate":
          return this.onSessionUpdateResponse(t, s);
        case "wc_sessionExtend":
          return this.onSessionExtendResponse(t, s);
        case "wc_sessionPing":
          return this.onSessionPingResponse(t, s);
        case "wc_sessionRequest":
          return this.onSessionRequestResponse(t, s);
        case "wc_sessionAuthenticate":
          return this.onSessionAuthenticateResponse(t, s);
        default:
          return this.client.logger.info(`Unsupported response method ${r}`);
      }
    }, this.onRelayEventUnknownPayload = (e) => {
      const { topic: t } = e, { message: s } = getInternalError("MISSING_OR_INVALID", `Decoded payload on topic ${t} is not identifiable as a JSON-RPC request or a response.`);
      throw new Error(s);
    }, this.shouldIgnorePairingRequest = (e) => {
      const { topic: t, requestMethod: s } = e, i2 = this.expectedPairingMethodMap.get(t);
      return !i2 || i2.includes(s) ? false : !!(i2.includes("wc_sessionAuthenticate") && this.client.events.listenerCount("session_authenticate") > 0);
    }, this.onSessionProposeRequest = async (e) => {
      const { topic: t, payload: s, attestation: i2, encryptedId: r } = e, { params: n2, id: a } = s;
      try {
        const c2 = this.client.core.eventClient.getEvent({ topic: t });
        this.isValidConnect(I({}, s.params));
        const h = n2.expiryTimestamp || calcExpiry(v.wc_sessionPropose.req.ttl), p2 = I({ id: a, pairingTopic: t, expiryTimestamp: h }, n2);
        await this.setProposal(a, p2);
        const d = await this.getVerifyContext({ attestationId: i2, hash: hashMessage(JSON.stringify(s)), encryptedId: r, metadata: p2.proposer.metadata });
        this.client.events.listenerCount("session_proposal") === 0 && (console.warn("No listener for session_proposal event"), c2 == null ? void 0 : c2.setError(EVENT_CLIENT_PAIRING_ERRORS.proposal_listener_not_found)), c2 == null ? void 0 : c2.addTrace(EVENT_CLIENT_PAIRING_TRACES.emit_session_proposal), this.client.events.emit("session_proposal", { id: a, params: p2, verifyContext: d });
      } catch (c2) {
        await this.sendError({ id: a, topic: t, error: c2, rpcOpts: v.wc_sessionPropose.autoReject }), this.client.logger.error(c2);
      }
    }, this.onSessionProposeResponse = async (e, t, s) => {
      const { id: i2 } = t;
      if (isJsonRpcResult(t)) {
        const { result: r } = t;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", result: r });
        const n2 = this.client.proposal.get(i2);
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", proposal: n2 });
        const a = n2.proposer.publicKey;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", selfPublicKey: a });
        const c2 = r.responderPublicKey;
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", peerPublicKey: c2 });
        const h = await this.client.core.crypto.generateSharedKey(a, c2);
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", sessionTopic: h });
        const p2 = await this.client.core.relayer.subscribe(h, { transportType: s });
        this.client.logger.trace({ type: "method", method: "onSessionProposeResponse", subscriptionId: p2 }), await this.client.core.pairing.activate({ topic: e });
      } else if (isJsonRpcError(t)) {
        await this.client.proposal.delete(i2, getSdkError("USER_DISCONNECTED"));
        const r = engineEvent("session_connect");
        if (this.events.listenerCount(r) === 0) throw new Error(`emitting ${r} without any listeners, 954`);
        this.events.emit(engineEvent("session_connect"), { error: t.error });
      }
    }, this.onSessionSettleRequest = async (e, t) => {
      const { id: s, params: i2 } = t;
      try {
        this.isValidSessionSettleRequest(i2);
        const { relay: r, controller: n2, expiry: a, namespaces: c2, sessionProperties: h, sessionConfig: p2 } = t.params, d = D(I(I({ topic: e, relay: r, expiry: a, namespaces: c2, acknowledged: true, pairingTopic: "", requiredNamespaces: {}, optionalNamespaces: {}, controller: n2.publicKey, self: { publicKey: "", metadata: this.client.metadata }, peer: { publicKey: n2.publicKey, metadata: n2.metadata } }, h && { sessionProperties: h }), p2 && { sessionConfig: p2 }), { transportType: TRANSPORT_TYPES.relay }), l = engineEvent("session_connect");
        if (this.events.listenerCount(l) === 0) throw new Error(`emitting ${l} without any listeners 997`);
        this.events.emit(engineEvent("session_connect"), { session: d }), await this.sendResult({ id: t.id, topic: e, result: true, throwOnFailedPublish: true });
      } catch (r) {
        await this.sendError({ id: s, topic: e, error: r }), this.client.logger.error(r);
      }
    }, this.onSessionSettleResponse = async (e, t) => {
      const { id: s } = t;
      isJsonRpcResult(t) ? (await this.client.session.update(e, { acknowledged: true }), this.events.emit(engineEvent("session_approve", s), {})) : isJsonRpcError(t) && (await this.client.session.delete(e, getSdkError("USER_DISCONNECTED")), this.events.emit(engineEvent("session_approve", s), { error: t.error }));
    }, this.onSessionUpdateRequest = async (e, t) => {
      const { params: s, id: i2 } = t;
      try {
        const r = `${e}_session_update`, n2 = MemoryStore.get(r);
        if (n2 && this.isRequestOutOfSync(n2, i2)) {
          this.client.logger.info(`Discarding out of sync request - ${i2}`), this.sendError({ id: i2, topic: e, error: getSdkError("INVALID_UPDATE_REQUEST") });
          return;
        }
        this.isValidUpdate(I({ topic: e }, s));
        try {
          MemoryStore.set(r, i2), await this.client.session.update(e, { namespaces: s.namespaces }), await this.sendResult({ id: i2, topic: e, result: true, throwOnFailedPublish: true });
        } catch (a) {
          throw MemoryStore.delete(r), a;
        }
        this.client.events.emit("session_update", { id: i2, topic: e, params: s });
      } catch (r) {
        await this.sendError({ id: i2, topic: e, error: r }), this.client.logger.error(r);
      }
    }, this.isRequestOutOfSync = (e, t) => parseInt(t.toString().slice(0, -3)) <= parseInt(e.toString().slice(0, -3)), this.onSessionUpdateResponse = (e, t) => {
      const { id: s } = t, i2 = engineEvent("session_update", s);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      isJsonRpcResult(t) ? this.events.emit(engineEvent("session_update", s), {}) : isJsonRpcError(t) && this.events.emit(engineEvent("session_update", s), { error: t.error });
    }, this.onSessionExtendRequest = async (e, t) => {
      const { id: s } = t;
      try {
        this.isValidExtend({ topic: e }), await this.setExpiry(e, calcExpiry(z)), await this.sendResult({ id: s, topic: e, result: true, throwOnFailedPublish: true }), this.client.events.emit("session_extend", { id: s, topic: e });
      } catch (i2) {
        await this.sendError({ id: s, topic: e, error: i2 }), this.client.logger.error(i2);
      }
    }, this.onSessionExtendResponse = (e, t) => {
      const { id: s } = t, i2 = engineEvent("session_extend", s);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      isJsonRpcResult(t) ? this.events.emit(engineEvent("session_extend", s), {}) : isJsonRpcError(t) && this.events.emit(engineEvent("session_extend", s), { error: t.error });
    }, this.onSessionPingRequest = async (e, t) => {
      const { id: s } = t;
      try {
        this.isValidPing({ topic: e }), await this.sendResult({ id: s, topic: e, result: true, throwOnFailedPublish: true }), this.client.events.emit("session_ping", { id: s, topic: e });
      } catch (i2) {
        await this.sendError({ id: s, topic: e, error: i2 }), this.client.logger.error(i2);
      }
    }, this.onSessionPingResponse = (e, t) => {
      const { id: s } = t, i2 = engineEvent("session_ping", s);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      setTimeout(() => {
        isJsonRpcResult(t) ? this.events.emit(engineEvent("session_ping", s), {}) : isJsonRpcError(t) && this.events.emit(engineEvent("session_ping", s), { error: t.error });
      }, 500);
    }, this.onSessionDeleteRequest = async (e, t) => {
      const { id: s } = t;
      try {
        this.isValidDisconnect({ topic: e, reason: t.params }), Promise.all([new Promise((i2) => {
          this.client.core.relayer.once(RELAYER_EVENTS.publish, async () => {
            i2(await this.deleteSession({ topic: e, id: s }));
          });
        }), this.sendResult({ id: s, topic: e, result: true, throwOnFailedPublish: true }), this.cleanupPendingSentRequestsForTopic({ topic: e, error: getSdkError("USER_DISCONNECTED") })]).catch((i2) => this.client.logger.error(i2));
      } catch (i2) {
        this.client.logger.error(i2);
      }
    }, this.onSessionRequest = async (e) => {
      var t, s, i2;
      const { topic: r, payload: n2, attestation: a, encryptedId: c2, transportType: h } = e, { id: p2, params: d } = n2;
      try {
        await this.isValidRequest(I({ topic: r }, d));
        const l = this.client.session.get(r), w2 = await this.getVerifyContext({ attestationId: a, hash: hashMessage(JSON.stringify(formatJsonRpcRequest("wc_sessionRequest", d, p2))), encryptedId: c2, metadata: l.peer.metadata, transportType: h }), m = { id: p2, topic: r, params: d, verifyContext: w2 };
        await this.setPendingSessionRequest(m), h === TRANSPORT_TYPES.link_mode && (t = l.peer.metadata.redirect) != null && t.universal && this.client.core.addLinkModeSupportedApp((s = l.peer.metadata.redirect) == null ? void 0 : s.universal), (i2 = this.client.signConfig) != null && i2.disableRequestQueue ? this.emitSessionRequest(m) : (this.addSessionRequestToSessionRequestQueue(m), this.processSessionRequestQueue());
      } catch (l) {
        await this.sendError({ id: p2, topic: r, error: l }), this.client.logger.error(l);
      }
    }, this.onSessionRequestResponse = (e, t) => {
      const { id: s } = t, i2 = engineEvent("session_request", s);
      if (this.events.listenerCount(i2) === 0) throw new Error(`emitting ${i2} without any listeners`);
      isJsonRpcResult(t) ? this.events.emit(engineEvent("session_request", s), { result: t.result }) : isJsonRpcError(t) && this.events.emit(engineEvent("session_request", s), { error: t.error });
    }, this.onSessionEventRequest = async (e, t) => {
      const { id: s, params: i2 } = t;
      try {
        const r = `${e}_session_event_${i2.event.name}`, n2 = MemoryStore.get(r);
        if (n2 && this.isRequestOutOfSync(n2, s)) {
          this.client.logger.info(`Discarding out of sync request - ${s}`);
          return;
        }
        this.isValidEmit(I({ topic: e }, i2)), this.client.events.emit("session_event", { id: s, topic: e, params: i2 }), MemoryStore.set(r, s);
      } catch (r) {
        await this.sendError({ id: s, topic: e, error: r }), this.client.logger.error(r);
      }
    }, this.onSessionAuthenticateResponse = (e, t) => {
      const { id: s } = t;
      this.client.logger.trace({ type: "method", method: "onSessionAuthenticateResponse", topic: e, payload: t }), isJsonRpcResult(t) ? this.events.emit(engineEvent("session_request", s), { result: t.result }) : isJsonRpcError(t) && this.events.emit(engineEvent("session_request", s), { error: t.error });
    }, this.onSessionAuthenticateRequest = async (e) => {
      var t;
      const { topic: s, payload: i2, attestation: r, encryptedId: n2, transportType: a } = e;
      try {
        const { requester: c2, authPayload: h, expiryTimestamp: p2 } = i2.params, d = await this.getVerifyContext({ attestationId: r, hash: hashMessage(JSON.stringify(i2)), encryptedId: n2, metadata: c2.metadata, transportType: a }), l = { requester: c2, pairingTopic: s, id: i2.id, authPayload: h, verifyContext: d, expiryTimestamp: p2 };
        await this.setAuthRequest(i2.id, { request: l, pairingTopic: s, transportType: a }), a === TRANSPORT_TYPES.link_mode && (t = c2.metadata.redirect) != null && t.universal && this.client.core.addLinkModeSupportedApp(c2.metadata.redirect.universal), this.client.events.emit("session_authenticate", { topic: s, params: i2.params, id: i2.id, verifyContext: d });
      } catch (c2) {
        this.client.logger.error(c2);
        const h = i2.params.requester.publicKey, p2 = await this.client.core.crypto.generateKeyPair(), d = this.getAppLinkIfEnabled(i2.params.requester.metadata, a), l = { type: TYPE_1, receiverPublicKey: h, senderPublicKey: p2 };
        await this.sendError({ id: i2.id, topic: s, error: c2, encodeOpts: l, rpcOpts: v.wc_sessionAuthenticate.autoReject, appLink: d });
      }
    }, this.addSessionRequestToSessionRequestQueue = (e) => {
      this.sessionRequestQueue.queue.push(e);
    }, this.cleanupAfterResponse = (e) => {
      this.deletePendingSessionRequest(e.response.id, { message: "fulfilled", code: 0 }), setTimeout(() => {
        this.sessionRequestQueue.state = x.idle, this.processSessionRequestQueue();
      }, cjs.toMiliseconds(this.requestQueueDelay));
    }, this.cleanupPendingSentRequestsForTopic = ({ topic: e, error: t }) => {
      const s = this.client.core.history.pending;
      s.length > 0 && s.filter((i2) => i2.topic === e && i2.request.method === "wc_sessionRequest").forEach((i2) => {
        const r = i2.request.id, n2 = engineEvent("session_request", r);
        if (this.events.listenerCount(n2) === 0) throw new Error(`emitting ${n2} without any listeners`);
        this.events.emit(engineEvent("session_request", i2.request.id), { error: t });
      });
    }, this.processSessionRequestQueue = () => {
      if (this.sessionRequestQueue.state === x.active) {
        this.client.logger.info("session request queue is already active.");
        return;
      }
      const e = this.sessionRequestQueue.queue[0];
      if (!e) {
        this.client.logger.info("session request queue is empty.");
        return;
      }
      try {
        this.sessionRequestQueue.state = x.active, this.emitSessionRequest(e);
      } catch (t) {
        this.client.logger.error(t);
      }
    }, this.emitSessionRequest = (e) => {
      this.client.events.emit("session_request", e);
    }, this.onPairingCreated = (e) => {
      if (e.methods && this.expectedPairingMethodMap.set(e.topic, e.methods), e.active) return;
      const t = this.client.proposal.getAll().find((s) => s.pairingTopic === e.topic);
      t && this.onSessionProposeRequest({ topic: e.topic, payload: formatJsonRpcRequest("wc_sessionPropose", { requiredNamespaces: t.requiredNamespaces, optionalNamespaces: t.optionalNamespaces, relays: t.relays, proposer: t.proposer, sessionProperties: t.sessionProperties }, t.id) });
    }, this.isValidConnect = async (e) => {
      if (!isValidParams(e)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `connect() params: ${JSON.stringify(e)}`);
        throw new Error(a);
      }
      const { pairingTopic: t, requiredNamespaces: s, optionalNamespaces: i2, sessionProperties: r, relays: n2 } = e;
      if (isUndefined(t) || await this.isValidPairingTopic(t), !isValidRelays(n2, true)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `connect() relays: ${n2}`);
        throw new Error(a);
      }
      !isUndefined(s) && isValidObject(s) !== 0 && this.validateNamespaces(s, "requiredNamespaces"), !isUndefined(i2) && isValidObject(i2) !== 0 && this.validateNamespaces(i2, "optionalNamespaces"), isUndefined(r) || this.validateSessionProps(r, "sessionProperties");
    }, this.validateNamespaces = (e, t) => {
      const s = isValidRequiredNamespaces(e, "connect()", t);
      if (s) throw new Error(s.message);
    }, this.isValidApprove = async (e) => {
      if (!isValidParams(e)) throw new Error(getInternalError("MISSING_OR_INVALID", `approve() params: ${e}`).message);
      const { id: t, namespaces: s, relayProtocol: i2, sessionProperties: r } = e;
      this.checkRecentlyDeleted(t), await this.isValidProposalId(t);
      const n2 = this.client.proposal.get(t), a = isValidNamespaces(s, "approve()");
      if (a) throw new Error(a.message);
      const c2 = isConformingNamespaces(n2.requiredNamespaces, s, "approve()");
      if (c2) throw new Error(c2.message);
      if (!isValidString(i2, true)) {
        const { message: h } = getInternalError("MISSING_OR_INVALID", `approve() relayProtocol: ${i2}`);
        throw new Error(h);
      }
      isUndefined(r) || this.validateSessionProps(r, "sessionProperties");
    }, this.isValidReject = async (e) => {
      if (!isValidParams(e)) {
        const { message: i2 } = getInternalError("MISSING_OR_INVALID", `reject() params: ${e}`);
        throw new Error(i2);
      }
      const { id: t, reason: s } = e;
      if (this.checkRecentlyDeleted(t), await this.isValidProposalId(t), !isValidErrorReason(s)) {
        const { message: i2 } = getInternalError("MISSING_OR_INVALID", `reject() reason: ${JSON.stringify(s)}`);
        throw new Error(i2);
      }
    }, this.isValidSessionSettleRequest = (e) => {
      if (!isValidParams(e)) {
        const { message: c2 } = getInternalError("MISSING_OR_INVALID", `onSessionSettleRequest() params: ${e}`);
        throw new Error(c2);
      }
      const { relay: t, controller: s, namespaces: i2, expiry: r } = e;
      if (!isValidRelay(t)) {
        const { message: c2 } = getInternalError("MISSING_OR_INVALID", "onSessionSettleRequest() relay protocol should be a string");
        throw new Error(c2);
      }
      const n2 = isValidController(s, "onSessionSettleRequest()");
      if (n2) throw new Error(n2.message);
      const a = isValidNamespaces(i2, "onSessionSettleRequest()");
      if (a) throw new Error(a.message);
      if (isExpired(r)) {
        const { message: c2 } = getInternalError("EXPIRED", "onSessionSettleRequest()");
        throw new Error(c2);
      }
    }, this.isValidUpdate = async (e) => {
      if (!isValidParams(e)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `update() params: ${e}`);
        throw new Error(a);
      }
      const { topic: t, namespaces: s } = e;
      this.checkRecentlyDeleted(t), await this.isValidSessionTopic(t);
      const i2 = this.client.session.get(t), r = isValidNamespaces(s, "update()");
      if (r) throw new Error(r.message);
      const n2 = isConformingNamespaces(i2.requiredNamespaces, s, "update()");
      if (n2) throw new Error(n2.message);
    }, this.isValidExtend = async (e) => {
      if (!isValidParams(e)) {
        const { message: s } = getInternalError("MISSING_OR_INVALID", `extend() params: ${e}`);
        throw new Error(s);
      }
      const { topic: t } = e;
      this.checkRecentlyDeleted(t), await this.isValidSessionTopic(t);
    }, this.isValidRequest = async (e) => {
      if (!isValidParams(e)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `request() params: ${e}`);
        throw new Error(a);
      }
      const { topic: t, request: s, chainId: i2, expiry: r } = e;
      this.checkRecentlyDeleted(t), await this.isValidSessionTopic(t);
      const { namespaces: n2 } = this.client.session.get(t);
      if (!isValidNamespacesChainId(n2, i2)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `request() chainId: ${i2}`);
        throw new Error(a);
      }
      if (!isValidRequest(s)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `request() ${JSON.stringify(s)}`);
        throw new Error(a);
      }
      if (!isValidNamespacesRequest(n2, i2, s.method)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `request() method: ${s.method}`);
        throw new Error(a);
      }
      if (r && !isValidRequestExpiry(r, me)) {
        const { message: a } = getInternalError("MISSING_OR_INVALID", `request() expiry: ${r}. Expiry must be a number (in seconds) between ${me.min} and ${me.max}`);
        throw new Error(a);
      }
    }, this.isValidRespond = async (e) => {
      var t;
      if (!isValidParams(e)) {
        const { message: r } = getInternalError("MISSING_OR_INVALID", `respond() params: ${e}`);
        throw new Error(r);
      }
      const { topic: s, response: i2 } = e;
      try {
        await this.isValidSessionTopic(s);
      } catch (r) {
        throw (t = e == null ? void 0 : e.response) != null && t.id && this.cleanupAfterResponse(e), r;
      }
      if (!isValidResponse(i2)) {
        const { message: r } = getInternalError("MISSING_OR_INVALID", `respond() response: ${JSON.stringify(i2)}`);
        throw new Error(r);
      }
    }, this.isValidPing = async (e) => {
      if (!isValidParams(e)) {
        const { message: s } = getInternalError("MISSING_OR_INVALID", `ping() params: ${e}`);
        throw new Error(s);
      }
      const { topic: t } = e;
      await this.isValidSessionOrPairingTopic(t);
    }, this.isValidEmit = async (e) => {
      if (!isValidParams(e)) {
        const { message: n2 } = getInternalError("MISSING_OR_INVALID", `emit() params: ${e}`);
        throw new Error(n2);
      }
      const { topic: t, event: s, chainId: i2 } = e;
      await this.isValidSessionTopic(t);
      const { namespaces: r } = this.client.session.get(t);
      if (!isValidNamespacesChainId(r, i2)) {
        const { message: n2 } = getInternalError("MISSING_OR_INVALID", `emit() chainId: ${i2}`);
        throw new Error(n2);
      }
      if (!isValidEvent(s)) {
        const { message: n2 } = getInternalError("MISSING_OR_INVALID", `emit() event: ${JSON.stringify(s)}`);
        throw new Error(n2);
      }
      if (!isValidNamespacesEvent(r, i2, s.name)) {
        const { message: n2 } = getInternalError("MISSING_OR_INVALID", `emit() event: ${JSON.stringify(s)}`);
        throw new Error(n2);
      }
    }, this.isValidDisconnect = async (e) => {
      if (!isValidParams(e)) {
        const { message: s } = getInternalError("MISSING_OR_INVALID", `disconnect() params: ${e}`);
        throw new Error(s);
      }
      const { topic: t } = e;
      await this.isValidSessionOrPairingTopic(t);
    }, this.isValidAuthenticate = (e) => {
      const { chains: t, uri: s, domain: i2, nonce: r } = e;
      if (!Array.isArray(t) || t.length === 0) throw new Error("chains is required and must be a non-empty array");
      if (!isValidString(s, false)) throw new Error("uri is required parameter");
      if (!isValidString(i2, false)) throw new Error("domain is required parameter");
      if (!isValidString(r, false)) throw new Error("nonce is required parameter");
      if ([...new Set(t.map((a) => parseChainId(a).namespace))].length > 1) throw new Error("Multi-namespace requests are not supported. Please request single namespace only.");
      const { namespace: n2 } = parseChainId(t[0]);
      if (n2 !== "eip155") throw new Error("Only eip155 namespace is supported for authenticated sessions. Please use .connect() for non-eip155 chains.");
    }, this.getVerifyContext = async (e) => {
      const { attestationId: t, hash: s, encryptedId: i2, metadata: r, transportType: n2 } = e, a = { verified: { verifyUrl: r.verifyUrl || VERIFY_SERVER, validation: "UNKNOWN", origin: r.url || "" } };
      try {
        if (n2 === TRANSPORT_TYPES.link_mode) {
          const h = this.getAppLinkIfEnabled(r, n2);
          return a.verified.validation = h && new URL(h).origin === new URL(r.url).origin ? "VALID" : "INVALID", a;
        }
        const c2 = await this.client.core.verify.resolve({ attestationId: t, hash: s, encryptedId: i2, verifyUrl: r.verifyUrl });
        c2 && (a.verified.origin = c2.origin, a.verified.isScam = c2.isScam, a.verified.validation = c2.origin === new URL(r.url).origin ? "VALID" : "INVALID");
      } catch (c2) {
        this.client.logger.warn(c2);
      }
      return this.client.logger.debug(`Verify context: ${JSON.stringify(a)}`), a;
    }, this.validateSessionProps = (e, t) => {
      Object.values(e).forEach((s) => {
        if (!isValidString(s, false)) {
          const { message: i2 } = getInternalError("MISSING_OR_INVALID", `${t} must be in Record<string, string> format. Received: ${JSON.stringify(s)}`);
          throw new Error(i2);
        }
      });
    }, this.getPendingAuthRequest = (e) => {
      const t = this.client.auth.requests.get(e);
      return typeof t == "object" ? t : void 0;
    }, this.addToRecentlyDeleted = (e, t) => {
      if (this.recentlyDeletedMap.set(e, t), this.recentlyDeletedMap.size >= this.recentlyDeletedLimit) {
        let s = 0;
        const i2 = this.recentlyDeletedLimit / 2;
        for (const r of this.recentlyDeletedMap.keys()) {
          if (s++ >= i2) break;
          this.recentlyDeletedMap.delete(r);
        }
      }
    }, this.checkRecentlyDeleted = (e) => {
      const t = this.recentlyDeletedMap.get(e);
      if (t) {
        const { message: s } = getInternalError("MISSING_OR_INVALID", `Record was recently deleted - ${t}: ${e}`);
        throw new Error(s);
      }
    }, this.isLinkModeEnabled = (e, t) => {
      var s, i2, r, n2, a, c2, h, p2, d;
      return !e || t !== TRANSPORT_TYPES.link_mode ? false : ((i2 = (s = this.client.metadata) == null ? void 0 : s.redirect) == null ? void 0 : i2.linkMode) === true && ((n2 = (r = this.client.metadata) == null ? void 0 : r.redirect) == null ? void 0 : n2.universal) !== void 0 && ((c2 = (a = this.client.metadata) == null ? void 0 : a.redirect) == null ? void 0 : c2.universal) !== "" && ((h = e == null ? void 0 : e.redirect) == null ? void 0 : h.universal) !== void 0 && ((p2 = e == null ? void 0 : e.redirect) == null ? void 0 : p2.universal) !== "" && ((d = e == null ? void 0 : e.redirect) == null ? void 0 : d.linkMode) === true && this.client.core.linkModeSupportedApps.includes(e.redirect.universal) && typeof (global$1 == null ? void 0 : global$1.Linking) < "u";
    }, this.getAppLinkIfEnabled = (e, t) => {
      var s;
      return this.isLinkModeEnabled(e, t) ? (s = e == null ? void 0 : e.redirect) == null ? void 0 : s.universal : void 0;
    }, this.handleLinkModeMessage = ({ url: e }) => {
      if (!e || !e.includes("wc_ev") || !e.includes("topic")) return;
      const t = getSearchParamFromURL(e, "topic") || "", s = decodeURIComponent(getSearchParamFromURL(e, "wc_ev") || ""), i2 = this.client.session.keys.includes(t);
      i2 && this.client.session.update(t, { transportType: TRANSPORT_TYPES.link_mode }), this.client.core.dispatchEnvelope({ topic: t, message: s, sessionExists: i2 });
    }, this.registerLinkModeListeners = async () => {
      var e;
      if (isTestRun() || isReactNative() && (e = this.client.metadata.redirect) != null && e.linkMode) {
        const t = global$1 == null ? void 0 : global$1.Linking;
        if (typeof t < "u") {
          t.addEventListener("url", this.handleLinkModeMessage, this.client.name);
          const s = await t.getInitialURL();
          s && setTimeout(() => {
            this.handleLinkModeMessage({ url: s });
          }, 50);
        }
      }
    };
  }
  isInitialized() {
    if (!this.initialized) {
      const { message: o } = getInternalError("NOT_INITIALIZED", this.name);
      throw new Error(o);
    }
  }
  async confirmOnlineStateOrThrow() {
    await this.client.core.relayer.confirmOnlineStateOrThrow();
  }
  registerRelayerEvents() {
    this.client.core.relayer.on(RELAYER_EVENTS.message, (o) => {
      !this.initialized || this.relayMessageCache.length > 0 ? this.relayMessageCache.push(o) : this.onRelayMessage(o);
    });
  }
  async onRelayMessage(o) {
    const { topic: e, message: t, attestation: s, transportType: i2 } = o, { publicKey: r } = this.client.auth.authKeys.keys.includes(ae) ? this.client.auth.authKeys.get(ae) : { responseTopic: void 0, publicKey: void 0 }, n2 = await this.client.core.crypto.decode(e, t, { receiverPublicKey: r, encoding: i2 === TRANSPORT_TYPES.link_mode ? BASE64URL : BASE64 });
    try {
      isJsonRpcRequest(n2) ? (this.client.core.history.set(e, n2), this.onRelayEventRequest({ topic: e, payload: n2, attestation: s, transportType: i2, encryptedId: hashMessage(t) })) : isJsonRpcResponse(n2) ? (await this.client.core.history.resolve(n2), await this.onRelayEventResponse({ topic: e, payload: n2, transportType: i2 }), this.client.core.history.delete(e, n2.id)) : this.onRelayEventUnknownPayload({ topic: e, payload: n2, transportType: i2 });
    } catch (a) {
      this.client.logger.error(a);
    }
  }
  registerExpirerEvents() {
    this.client.core.expirer.on(EXPIRER_EVENTS.expired, async (o) => {
      const { topic: e, id: t } = parseExpirerTarget(o.target);
      if (t && this.client.pendingRequest.keys.includes(t)) return await this.deletePendingSessionRequest(t, getInternalError("EXPIRED"), true);
      if (t && this.client.auth.requests.keys.includes(t)) return await this.deletePendingAuthRequest(t, getInternalError("EXPIRED"), true);
      e ? this.client.session.keys.includes(e) && (await this.deleteSession({ topic: e, expirerHasDeleted: true }), this.client.events.emit("session_expire", { topic: e })) : t && (await this.deleteProposal(t, true), this.client.events.emit("proposal_expire", { id: t }));
    });
  }
  registerPairingEvents() {
    this.client.core.pairing.events.on(PAIRING_EVENTS.create, (o) => this.onPairingCreated(o)), this.client.core.pairing.events.on(PAIRING_EVENTS.delete, (o) => {
      this.addToRecentlyDeleted(o.topic, "pairing");
    });
  }
  isValidPairingTopic(o) {
    if (!isValidString(o, false)) {
      const { message: e } = getInternalError("MISSING_OR_INVALID", `pairing topic should be a string: ${o}`);
      throw new Error(e);
    }
    if (!this.client.core.pairing.pairings.keys.includes(o)) {
      const { message: e } = getInternalError("NO_MATCHING_KEY", `pairing topic doesn't exist: ${o}`);
      throw new Error(e);
    }
    if (isExpired(this.client.core.pairing.pairings.get(o).expiry)) {
      const { message: e } = getInternalError("EXPIRED", `pairing topic: ${o}`);
      throw new Error(e);
    }
  }
  async isValidSessionTopic(o) {
    if (!isValidString(o, false)) {
      const { message: e } = getInternalError("MISSING_OR_INVALID", `session topic should be a string: ${o}`);
      throw new Error(e);
    }
    if (this.checkRecentlyDeleted(o), !this.client.session.keys.includes(o)) {
      const { message: e } = getInternalError("NO_MATCHING_KEY", `session topic doesn't exist: ${o}`);
      throw new Error(e);
    }
    if (isExpired(this.client.session.get(o).expiry)) {
      await this.deleteSession({ topic: o });
      const { message: e } = getInternalError("EXPIRED", `session topic: ${o}`);
      throw new Error(e);
    }
    if (!this.client.core.crypto.keychain.has(o)) {
      const { message: e } = getInternalError("MISSING_OR_INVALID", `session topic does not exist in keychain: ${o}`);
      throw await this.deleteSession({ topic: o }), new Error(e);
    }
  }
  async isValidSessionOrPairingTopic(o) {
    if (this.checkRecentlyDeleted(o), this.client.session.keys.includes(o)) await this.isValidSessionTopic(o);
    else if (this.client.core.pairing.pairings.keys.includes(o)) this.isValidPairingTopic(o);
    else if (isValidString(o, false)) {
      const { message: e } = getInternalError("NO_MATCHING_KEY", `session or pairing topic doesn't exist: ${o}`);
      throw new Error(e);
    } else {
      const { message: e } = getInternalError("MISSING_OR_INVALID", `session or pairing topic should be a string: ${o}`);
      throw new Error(e);
    }
  }
  async isValidProposalId(o) {
    if (!isValidId(o)) {
      const { message: e } = getInternalError("MISSING_OR_INVALID", `proposal id should be a number: ${o}`);
      throw new Error(e);
    }
    if (!this.client.proposal.keys.includes(o)) {
      const { message: e } = getInternalError("NO_MATCHING_KEY", `proposal id doesn't exist: ${o}`);
      throw new Error(e);
    }
    if (isExpired(this.client.proposal.get(o).expiryTimestamp)) {
      await this.deleteProposal(o);
      const { message: e } = getInternalError("EXPIRED", `proposal id: ${o}`);
      throw new Error(e);
    }
  }
}
class Ss extends Store {
  constructor(o, e) {
    super(o, e, st, ye), this.core = o, this.logger = e;
  }
}
class yt extends Store {
  constructor(o, e) {
    super(o, e, rt, ye), this.core = o, this.logger = e;
  }
}
class Is extends Store {
  constructor(o, e) {
    super(o, e, ot, ye, (t) => t.id), this.core = o, this.logger = e;
  }
}
class fs extends Store {
  constructor(o, e) {
    super(o, e, pt, oe, () => ae), this.core = o, this.logger = e;
  }
}
class vs extends Store {
  constructor(o, e) {
    super(o, e, ht, oe), this.core = o, this.logger = e;
  }
}
class qs extends Store {
  constructor(o, e) {
    super(o, e, dt, oe, (t) => t.id), this.core = o, this.logger = e;
  }
}
class Ts {
  constructor(o, e) {
    this.core = o, this.logger = e, this.authKeys = new fs(this.core, this.logger), this.pairingTopics = new vs(this.core, this.logger), this.requests = new qs(this.core, this.logger);
  }
  async init() {
    await this.authKeys.init(), await this.pairingTopics.init(), await this.requests.init();
  }
}
class _e extends S {
  constructor(o) {
    super(o), this.protocol = be, this.version = Ce, this.name = we.name, this.events = new eventsExports.EventEmitter(), this.on = (t, s) => this.events.on(t, s), this.once = (t, s) => this.events.once(t, s), this.off = (t, s) => this.events.off(t, s), this.removeListener = (t, s) => this.events.removeListener(t, s), this.removeAllListeners = (t) => this.events.removeAllListeners(t), this.connect = async (t) => {
      try {
        return await this.engine.connect(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.pair = async (t) => {
      try {
        return await this.engine.pair(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.approve = async (t) => {
      try {
        return await this.engine.approve(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.reject = async (t) => {
      try {
        return await this.engine.reject(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.update = async (t) => {
      try {
        return await this.engine.update(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.extend = async (t) => {
      try {
        return await this.engine.extend(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.request = async (t) => {
      try {
        return await this.engine.request(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.respond = async (t) => {
      try {
        return await this.engine.respond(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.ping = async (t) => {
      try {
        return await this.engine.ping(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.emit = async (t) => {
      try {
        return await this.engine.emit(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.disconnect = async (t) => {
      try {
        return await this.engine.disconnect(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.find = (t) => {
      try {
        return this.engine.find(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.getPendingSessionRequests = () => {
      try {
        return this.engine.getPendingSessionRequests();
      } catch (t) {
        throw this.logger.error(t.message), t;
      }
    }, this.authenticate = async (t, s) => {
      try {
        return await this.engine.authenticate(t, s);
      } catch (i2) {
        throw this.logger.error(i2.message), i2;
      }
    }, this.formatAuthMessage = (t) => {
      try {
        return this.engine.formatAuthMessage(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.approveSessionAuthenticate = async (t) => {
      try {
        return await this.engine.approveSessionAuthenticate(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.rejectSessionAuthenticate = async (t) => {
      try {
        return await this.engine.rejectSessionAuthenticate(t);
      } catch (s) {
        throw this.logger.error(s.message), s;
      }
    }, this.name = (o == null ? void 0 : o.name) || we.name, this.metadata = (o == null ? void 0 : o.metadata) || getAppMetadata(), this.signConfig = o == null ? void 0 : o.signConfig;
    const e = typeof (o == null ? void 0 : o.logger) < "u" && typeof (o == null ? void 0 : o.logger) != "string" ? o.logger : qt(k({ level: (o == null ? void 0 : o.logger) || we.logger }));
    this.core = (o == null ? void 0 : o.core) || new Core(o), this.logger = E(e, this.name), this.session = new yt(this.core, this.logger), this.proposal = new Ss(this.core, this.logger), this.pendingRequest = new Is(this.core, this.logger), this.engine = new Rs(this), this.auth = new Ts(this.core, this.logger);
  }
  static async init(o) {
    const e = new _e(o);
    return await e.initialize(), e;
  }
  get context() {
    return y(this.logger);
  }
  get pairing() {
    return this.core.pairing.pairings;
  }
  async initialize() {
    this.logger.trace("Initialized");
    try {
      await this.core.start(), await this.session.init(), await this.proposal.init(), await this.pendingRequest.init(), await this.auth.init(), await this.engine.init(), this.logger.info("SignClient Initialization Success"), this.engine.processRelayMessageCache();
    } catch (o) {
      throw this.logger.info("SignClient Initialization Failure"), this.logger.error(o.message), o;
    }
  }
}
let DefaultLogger$1 = class DefaultLogger {
  constructor(logLevel = "info") {
    this.logLevel = "info";
    this.logLevel = logLevel;
  }
  setLogLevel(level) {
    this.logLevel = level;
  }
  getLogLevel() {
    return this.logLevel;
  }
  error(message, ...args) {
    if (["error", "warn", "info", "debug"].includes(this.logLevel)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
  warn(message, ...args) {
    if (["warn", "info", "debug"].includes(this.logLevel)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
  info(message, ...args) {
    if (["info", "debug"].includes(this.logLevel)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }
  debug(message, ...args) {
    if (this.logLevel === "debug") {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
};
class SessionNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "SessionNotFoundError";
  }
}
const clients = {};
class DAppSigner {
  constructor(accountId, signClient, topic, ledgerId = LedgerId.MAINNET, extensionId, logLevel = "debug") {
    this.accountId = accountId;
    this.signClient = signClient;
    this.topic = topic;
    this.ledgerId = ledgerId;
    this.extensionId = extensionId;
    this.logger = new DefaultLogger$1(logLevel);
  }
  /**
   * Sets the logging level for the DAppSigner
   * @param level - The logging level to set
   */
  setLogLevel(level) {
    if (this.logger instanceof DefaultLogger$1) {
      this.logger.setLogLevel(level);
    }
  }
  _getHederaClient() {
    const ledgerIdString = this.ledgerId.toString();
    if (!clients[ledgerIdString]) {
      clients[ledgerIdString] = Client.forName(ledgerIdString);
    }
    return clients[ledgerIdString];
  }
  get _signerAccountId() {
    return `${ledgerIdToCAIPChainId(this.ledgerId)}:${this.accountId.toString()}`;
  }
  _getRandomNodes(numberOfNodes) {
    const allNodes = Object.values(this._getHederaClient().network).map((o) => typeof o === "string" ? AccountId.fromString(o) : o);
    for (let i2 = allNodes.length - 1; i2 > 0; i2--) {
      const j = Math.floor(Math.random() * (i2 + 1));
      [allNodes[i2], allNodes[j]] = [allNodes[j], allNodes[i2]];
    }
    return allNodes.slice(0, numberOfNodes);
  }
  request(request) {
    var _a, _b;
    if (!((_b = (_a = this === null || this === void 0 ? void 0 : this.signClient) === null || _a === void 0 ? void 0 : _a.session) === null || _b === void 0 ? void 0 : _b.get(this.topic))) {
      this.logger.error("Session no longer exists, signer will be removed. Please reconnect to the wallet.");
      this.signClient.emit({
        topic: this.topic,
        event: {
          name: "session_delete",
          data: { topic: this.topic }
        },
        chainId: ledgerIdToCAIPChainId(this.ledgerId)
      });
      throw new SessionNotFoundError("Session no longer exists. Please reconnect to the wallet.");
    }
    if (this.extensionId)
      extensionOpen(this.extensionId);
    return this.signClient.request({
      topic: this.topic,
      request,
      chainId: ledgerIdToCAIPChainId(this.ledgerId)
    });
  }
  getAccountId() {
    return this.accountId;
  }
  getAccountKey() {
    throw new Error("Method not implemented.");
  }
  getLedgerId() {
    return this.ledgerId;
  }
  getNetwork() {
    return this._getHederaClient().network;
  }
  getMirrorNetwork() {
    return this._getHederaClient().mirrorNetwork;
  }
  getAccountBalance() {
    return this.call(new AccountBalanceQuery().setAccountId(this.accountId));
  }
  getAccountInfo() {
    return this.call(new AccountInfoQuery().setAccountId(this.accountId));
  }
  getAccountRecords() {
    return this.call(new AccountRecordsQuery().setAccountId(this.accountId));
  }
  getMetadata() {
    return this.signClient.metadata;
  }
  async sign(data, signOptions = {
    encoding: "utf-8"
  }) {
    try {
      const messageToSign = signOptions.encoding === "base64" ? Uint8ArrayToBase64String(data[0]) : Uint8ArrayToString(data[0]);
      const { signatureMap } = await this.request({
        method: HederaJsonRpcMethod.SignMessage,
        params: {
          signerAccountId: this._signerAccountId,
          message: messageToSign
        }
      });
      const sigmap = base64StringToSignatureMap(signatureMap);
      const signerSignature = new SignerSignature({
        accountId: this.getAccountId(),
        publicKey: PublicKey.fromBytes(sigmap.sigPair[0].pubKeyPrefix),
        signature: sigmap.sigPair[0].ed25519 || sigmap.sigPair[0].ECDSASecp256k1
      });
      this.logger.debug("Data signed successfully");
      return [signerSignature];
    } catch (error) {
      this.logger.error("Error signing data:", error);
      throw error;
    }
  }
  async checkTransaction(transaction) {
    throw new Error("Method not implemented.");
  }
  async populateTransaction(transaction) {
    return transaction.setNodeAccountIds(this._getRandomNodes(10)).setTransactionId(TransactionId.generate(this.getAccountId()));
  }
  /**
   * Prepares a transaction object for signing using a single node account id.
   * If the transaction object does not already have a node account id,
   * generate a random node account id using the Hedera SDK client
   *
   * @param transaction - Any instance of a class that extends `Transaction`
   * @returns transaction - `Transaction` object with signature
   */
  async signTransaction(transaction) {
    let nodeAccountId;
    if (!transaction.nodeAccountIds || transaction.nodeAccountIds.length === 0)
      nodeAccountId = this._getRandomNodes(1)[0];
    else
      nodeAccountId = transaction.nodeAccountIds[0];
    const transactionBody = transactionToTransactionBody(transaction, nodeAccountId);
    if (!transactionBody)
      throw new Error("Failed to serialize transaction body");
    const transactionBodyBase64 = transactionBodyToBase64String(transactionBody);
    const { signatureMap } = await this.request({
      method: HederaJsonRpcMethod.SignTransaction,
      params: {
        signerAccountId: this._signerAccountId,
        transactionBody: transactionBodyBase64
      }
    });
    const sigMap = base64StringToSignatureMap(signatureMap);
    const bodyBytes = base64StringToUint8Array(transactionBodyBase64);
    const bytes = proto.Transaction.encode({ bodyBytes, sigMap }).finish();
    return Transaction.fromBytes(bytes);
  }
  async _tryExecuteTransactionRequest(request) {
    try {
      const requestToBytes = request.toBytes();
      this.logger.debug("Creating transaction from bytes", requestToBytes, request);
      const transaction = Transaction.fromBytes(requestToBytes);
      this.logger.debug("Executing transaction request", transaction);
      const result = await this.request({
        method: HederaJsonRpcMethod.SignAndExecuteTransaction,
        params: {
          signerAccountId: this._signerAccountId,
          transactionList: transactionToBase64String(transaction)
        }
      });
      this.logger.debug("Transaction request completed successfully");
      return { result: TransactionResponse.fromJSON(result) };
    } catch (error) {
      this.logger.error("Error executing transaction request:", error);
      return { error };
    }
  }
  async _parseQueryResponse(query, base64EncodedQueryResponse) {
    if (query instanceof AccountRecordsQuery) {
      const base64EncodedQueryResponseSplit = base64EncodedQueryResponse.split(",");
      const data2 = base64EncodedQueryResponseSplit.map((o) => base64StringToUint8Array(o));
      return data2.map((o) => TransactionRecord.fromBytes(o));
    }
    const data = base64StringToUint8Array(base64EncodedQueryResponse);
    if (query instanceof AccountBalanceQuery) {
      return AccountBalance.fromBytes(data);
    } else if (query instanceof AccountInfoQuery) {
      return AccountInfo.fromBytes(data);
    } else if (query instanceof TransactionReceiptQuery) {
      return TransactionReceipt.fromBytes(data);
    } else if (query instanceof TransactionRecordQuery) {
      return TransactionRecord.fromBytes(data);
    } else {
      throw new Error("Unsupported query type");
    }
  }
  /**
   * Executes a free receipt query without signing a transaction.
   * Enables the DApp to fetch the receipt of a transaction without making a new request
   * to the wallet.
   * @param request - The query to execute
   * @returns The result of the query
   */
  async executeReceiptQueryFromRequest(request) {
    try {
      const isMainnet = this.ledgerId === LedgerId.MAINNET;
      const client = isMainnet ? Client.forMainnet() : Client.forTestnet();
      const receipt = TransactionReceiptQuery.fromBytes(request.toBytes());
      const result = await receipt.execute(client);
      return { result };
    } catch (error) {
      return { error };
    }
  }
  async _tryExecuteQueryRequest(request) {
    try {
      const isReceiptQuery = request instanceof TransactionReceiptQuery;
      if (isReceiptQuery) {
        this.logger.debug("Attempting to execute free receipt query", request);
        const result2 = await this.executeReceiptQueryFromRequest(request);
        if (!(result2 === null || result2 === void 0 ? void 0 : result2.error)) {
          return { result: result2.result };
        }
        this.logger.error("Error executing free receipt query. Sending to wallet.", result2.error);
      }
      const query = isReceiptQuery ? TransactionReceiptQuery.fromBytes(request.toBytes()) : Query.fromBytes(request.toBytes());
      this.logger.debug("Executing query request", query, queryToBase64String(query), isReceiptQuery);
      const result = await this.request({
        method: HederaJsonRpcMethod.SignAndExecuteQuery,
        params: {
          signerAccountId: this._signerAccountId,
          query: queryToBase64String(query)
        }
      });
      this.logger.debug("Query request completed successfully", result);
      return { result: this._parseQueryResponse(query, result.response) };
    } catch (error) {
      this.logger.error("Error executing query request:", error);
      return { error };
    }
  }
  async call(request) {
    var _a, _b, _c, _d, _e2, _f, _g, _h, _j;
    const isReceiptQuery = request instanceof TransactionReceiptQuery;
    let txResult = void 0;
    if (!isReceiptQuery) {
      txResult = await this._tryExecuteTransactionRequest(request);
      if (txResult.result) {
        return txResult.result;
      }
    }
    const queryResult = await this._tryExecuteQueryRequest(request);
    if (queryResult.result) {
      return queryResult.result;
    }
    if (isReceiptQuery) {
      throw new Error("Error executing receipt query: \n" + JSON.stringify({
        queryError: {
          name: (_a = queryResult.error) === null || _a === void 0 ? void 0 : _a.name,
          message: (_b = queryResult.error) === null || _b === void 0 ? void 0 : _b.message,
          stack: (_c = queryResult.error) === null || _c === void 0 ? void 0 : _c.stack
        }
      }));
    }
    throw new Error("Error executing transaction or query: \n" + JSON.stringify({
      txError: {
        name: (_d = txResult === null || txResult === void 0 ? void 0 : txResult.error) === null || _d === void 0 ? void 0 : _d.name,
        message: (_e2 = txResult === null || txResult === void 0 ? void 0 : txResult.error) === null || _e2 === void 0 ? void 0 : _e2.message,
        stack: (_f = txResult === null || txResult === void 0 ? void 0 : txResult.error) === null || _f === void 0 ? void 0 : _f.stack
      },
      queryError: {
        name: (_g = queryResult.error) === null || _g === void 0 ? void 0 : _g.name,
        message: (_h = queryResult.error) === null || _h === void 0 ? void 0 : _h.message,
        stack: (_j = queryResult.error) === null || _j === void 0 ? void 0 : _j.stack
      }
    }, null, 2));
  }
}
class DAppConnector {
  /**
   * Initializes the DAppConnector instance.
   * @param metadata - SignClientTypes.Metadata object for the DApp metadata.
   * @param network - LedgerId representing the network (default: LedgerId.TESTNET).
   * @param projectId - Project ID for the WalletConnect client.
   * @param methods - Array of supported methods for the DApp (optional).
   * @param events - Array of supported events for the DApp (optional).
   * @param chains - Array of supported chains for the DApp (optional).
   * @param logLevel - Logging level for the DAppConnector (optional).
   */
  constructor(metadata, network, projectId, methods, events2, chains, logLevel = "debug") {
    this.network = LedgerId.TESTNET;
    this.supportedMethods = [];
    this.supportedEvents = [];
    this.supportedChains = [];
    this.extensions = [];
    this.onSessionIframeCreated = null;
    this.signers = [];
    this.isInitializing = false;
    this.abortableConnect = async (callback) => {
      return new Promise(async (resolve, reject) => {
        const pairTimeoutMs = 48e4;
        const timeout = setTimeout(() => {
          QRCodeModal.close();
          reject(new Error(`Connect timed out after ${pairTimeoutMs}(ms)`));
        }, pairTimeoutMs);
        try {
          return resolve(await callback());
        } catch (error) {
          reject(error);
        } finally {
          clearTimeout(timeout);
        }
      });
    };
    this.logger = new DefaultLogger$1(logLevel);
    this.dAppMetadata = metadata;
    this.network = network;
    this.projectId = projectId;
    this.supportedMethods = methods !== null && methods !== void 0 ? methods : Object.values(HederaJsonRpcMethod);
    this.supportedEvents = events2 !== null && events2 !== void 0 ? events2 : [];
    this.supportedChains = chains !== null && chains !== void 0 ? chains : [];
    this.extensions = [];
    this.walletConnectModal = new WalletConnectModal({
      projectId,
      chains
    });
    findExtensions((metadata2, isIframe) => {
      this.extensions.push(Object.assign(Object.assign({}, metadata2), { available: true, availableInIframe: isIframe }));
    });
  }
  /**
   * Sets the logging level for the DAppConnector
   * @param level - The logging level to set
   */
  setLogLevel(level) {
    if (this.logger instanceof DefaultLogger$1) {
      this.logger.setLogLevel(level);
    }
  }
  /**
   * Initializes the DAppConnector instance.
   * @param logger - `BaseLogger` for logging purposes (optional).
   */
  async init({ logger } = {}) {
    try {
      this.isInitializing = true;
      if (!this.projectId) {
        throw new Error("Project ID is not defined");
      }
      this.walletConnectClient = await _e.init({
        logger,
        relayUrl: "wss://relay.walletconnect.com",
        projectId: this.projectId,
        metadata: this.dAppMetadata
      });
      const existingSessions = this.walletConnectClient.session.getAll();
      if (existingSessions.length > 0)
        this.signers = existingSessions.flatMap((session) => this.createSigners(session));
      else
        this.checkIframeConnect();
      this.walletConnectClient.on("session_event", this.handleSessionEvent.bind(this));
      this.walletConnectClient.on("session_update", this.handleSessionUpdate.bind(this));
      this.walletConnectClient.on("session_delete", this.handleSessionDelete.bind(this));
      this.walletConnectClient.core.events.on("session_delete", this.handleSessionDelete.bind(this));
      this.walletConnectClient.core.pairing.events.on("pairing_delete", this.handlePairingDelete.bind(this));
    } catch (e) {
      this.logger.error("Error initializing DAppConnector:", e);
    } finally {
      this.isInitializing = false;
    }
  }
  /**
   * Retrieves a DAppSigner for the specified Hedera Account ID.
   *
   * @param {AccountId} accountId - The Hedera Account ID to find the associated signer.
   * @returns {DAppSigner} - The signer object of type {@link DAppSigner} corresponding to the provided account ID.
   * @throws {Error} - If no signer is found for the provided account ID.
   */
  getSigner(accountId) {
    if (this.isInitializing) {
      throw new Error("DAppConnector is not initialized yet. Try again later.");
    }
    const signer = this.signers.find((signer2) => signer2.getAccountId().equals(accountId));
    if (!signer)
      throw new Error("Signer is not found for this accountId");
    return signer;
  }
  /**
   * Initiates the WalletConnect connection flow using a QR code.
   * @deprecated Use `openModal` instead.
   * @param pairingTopic - The pairing topic for the connection (optional).
   * @returns A Promise that resolves when the connection process is complete.
   */
  async connectQR(pairingTopic) {
    return this.abortableConnect(async () => {
      try {
        const { uri, approval } = await this.connectURI(pairingTopic);
        if (!uri)
          throw new Error("URI is not defined");
        QRCodeModal.open(uri, () => {
          throw new Error("User rejected pairing");
        });
        await this.onSessionConnected(await approval());
      } finally {
        QRCodeModal.close();
      }
    });
  }
  /**
   * Initiates the WalletConnect connection flow using a QR code.
   * @param pairingTopic - The pairing topic for the connection (optional).
   * @returns {Promise<SessionTypes.Struct>} - A Promise that resolves when the connection process is complete.
   */
  async openModal(pairingTopic) {
    try {
      const { uri, approval } = await this.connectURI(pairingTopic);
      this.walletConnectModal.openModal({ uri });
      const session = await approval();
      await this.onSessionConnected(session);
      return session;
    } finally {
      this.walletConnectModal.closeModal();
    }
  }
  /**
   * Initiates the WallecConnect connection flow using URI.
   * @param pairingTopic - The pairing topic for the connection (optional).
   * @param extensionId - The id for the extension used to connect (optional).
   * @returns A Promise that resolves when the connection process is complete.
   */
  async connect(launchCallback, pairingTopic, extensionId) {
    return this.abortableConnect(async () => {
      var _a;
      const { uri, approval } = await this.connectURI(pairingTopic);
      if (!uri)
        throw new Error("URI is not defined");
      launchCallback(uri);
      const session = await approval();
      if (extensionId) {
        const sessionProperties = Object.assign(Object.assign({}, session.sessionProperties), { extensionId });
        session.sessionProperties = sessionProperties;
        await ((_a = this.walletConnectClient) === null || _a === void 0 ? void 0 : _a.session.update(session.topic, {
          sessionProperties
        }));
      }
      await this.onSessionConnected(session);
      return session;
    });
  }
  /**
   * Initiates the WallecConnect connection flow sending a message to the extension.
   * @param extensionId - The id for the extension used to connect.
   * @param pairingTopic - The pairing topic for the connection (optional).
   * @returns A Promise that resolves when the connection process is complete.
   */
  async connectExtension(extensionId, pairingTopic) {
    const extension = this.extensions.find((ext) => ext.id === extensionId);
    if (!extension || !extension.available)
      throw new Error("Extension is not available");
    return this.connect((uri) => {
      extensionConnect(extension.id, extension.availableInIframe, uri);
    }, pairingTopic, extension.availableInIframe ? void 0 : extensionId);
  }
  /**
   * Validates the session by checking if the session exists and is valid.
   * Also ensures the signer exists for the session.
   * @param topic - The topic of the session to validate.
   * @returns {boolean} - True if the session exists and has a valid signer, false otherwise.
   */
  validateSession(topic) {
    try {
      if (!this.walletConnectClient) {
        return false;
      }
      const session = this.walletConnectClient.session.get(topic);
      const hasSigner = this.signers.some((signer) => signer.topic === topic);
      if (!session) {
        if (hasSigner) {
          this.logger.warn(`Signer exists but no session found for topic: ${topic}`);
          this.handleSessionDelete({ topic });
        }
        return false;
      }
      if (!hasSigner) {
        this.logger.warn(`Session exists but no signer found for topic: ${topic}`);
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error("Error validating session:", e);
      return false;
    }
  }
  /**
   * Validates the session and refreshes the signers by removing the invalid ones.
   */
  validateAndRefreshSigners() {
    this.signers = this.signers.filter((signer) => this.validateSession(signer.topic));
  }
  /**
   *  Initiates the WallecConnect connection if the wallet in iframe mode is detected.
   */
  async checkIframeConnect() {
    const extension = this.extensions.find((ext) => ext.availableInIframe);
    if (extension) {
      const session = await this.connectExtension(extension.id);
      if (this.onSessionIframeCreated)
        this.onSessionIframeCreated(session);
    }
  }
  /**
   * Disconnects the current session associated with the specified topic.
   * @param topic - The topic of the session to disconnect.
   * @returns A Promise that resolves when the session is disconnected.
   */
  async disconnect(topic) {
    try {
      if (!this.walletConnectClient) {
        throw new Error("WalletConnect is not initialized");
      }
      await this.walletConnectClient.disconnect({
        topic,
        reason: getSdkError("USER_DISCONNECTED")
      });
      return true;
    } catch (e) {
      this.logger.error("Either the session was already disconnected or the topic is invalid", e);
      return false;
    }
  }
  /**
   * Disconnects all active sessions and pairings.
   *
   * Throws error when WalletConnect is not initialized or there are no active sessions/pairings.
   * @returns A Promise that resolves when all active sessions and pairings are disconnected.
   */
  async disconnectAll() {
    if (!this.walletConnectClient) {
      throw new Error("WalletConnect is not initialized");
    }
    const sessions = this.walletConnectClient.session.getAll();
    const pairings = this.walletConnectClient.core.pairing.getPairings();
    if (!(sessions === null || sessions === void 0 ? void 0 : sessions.length) && !(pairings === null || pairings === void 0 ? void 0 : pairings.length)) {
      throw new Error("There is no active session/pairing. Connect to the wallet at first.");
    }
    const disconnectionPromises = [];
    for (const session of this.walletConnectClient.session.getAll()) {
      this.logger.info(`Disconnecting from session: ${session}`);
      const promise = this.disconnect(session.topic);
      disconnectionPromises.push(promise);
    }
    for (const pairing of pairings) {
      const promise = this.disconnect(pairing.topic);
      disconnectionPromises.push(promise);
    }
    await Promise.all(disconnectionPromises);
    this.signers = [];
  }
  createSigners(session) {
    const allNamespaceAccounts = accountAndLedgerFromSession(session);
    return allNamespaceAccounts.map(({ account, network }) => {
      var _a;
      return new DAppSigner(account, this.walletConnectClient, session.topic, network, (_a = session.sessionProperties) === null || _a === void 0 ? void 0 : _a.extensionId, this.logger instanceof DefaultLogger$1 ? this.logger.getLogLevel() : "debug");
    });
  }
  async onSessionConnected(session) {
    const newSigners = this.createSigners(session);
    for (const newSigner of newSigners) {
      const existingSigners = this.signers.filter((currentSigner) => {
        var _a, _b;
        const matchingAccountId = ((_a = currentSigner === null || currentSigner === void 0 ? void 0 : currentSigner.getAccountId()) === null || _a === void 0 ? void 0 : _a.toString()) === ((_b = newSigner === null || newSigner === void 0 ? void 0 : newSigner.getAccountId()) === null || _b === void 0 ? void 0 : _b.toString());
        const matchingExtensionId = newSigner.extensionId === currentSigner.extensionId;
        const newSignerMetadata = newSigner.getMetadata();
        const existingSignerMetadata = currentSigner.getMetadata();
        const metadataNameMatch = (newSignerMetadata === null || newSignerMetadata === void 0 ? void 0 : newSignerMetadata.name) === (existingSignerMetadata === null || existingSignerMetadata === void 0 ? void 0 : existingSignerMetadata.name);
        if (currentSigner.topic === newSigner.topic) {
          this.logger.error("The topic was already connected. This is a weird error. Please report it.", newSigner.getAccountId().toString());
        }
        return matchingAccountId && matchingExtensionId && metadataNameMatch;
      });
      for (const existingSigner of existingSigners) {
        this.logger.debug(`Disconnecting duplicate signer for account ${existingSigner.getAccountId().toString()}`);
        await this.disconnect(existingSigner.topic);
        this.signers = this.signers.filter((s) => s.topic !== existingSigner.topic);
      }
    }
    this.signers.push(...newSigners);
    this.logger.debug(`Current signers after connection: ${this.signers.map((s) => `${s.getAccountId().toString()}:${s.topic}`).join(", ")}`);
  }
  async connectURI(pairingTopic) {
    if (!this.walletConnectClient) {
      throw new Error("WalletConnect is not initialized");
    }
    return this.walletConnectClient.connect({
      pairingTopic,
      requiredNamespaces: networkNamespaces(this.network, this.supportedMethods, this.supportedEvents)
    });
  }
  async request({ method, params }) {
    var _a, _b, _c;
    let signer;
    this.logger.debug(`Requesting method: ${method} with params: ${JSON.stringify(params)}`);
    if (params === null || params === void 0 ? void 0 : params.signerAccountId) {
      const actualAccountId = (_b = (_a = params === null || params === void 0 ? void 0 : params.signerAccountId) === null || _a === void 0 ? void 0 : _a.split(":")) === null || _b === void 0 ? void 0 : _b.pop();
      signer = this.signers.find((s) => {
        var _a2;
        return ((_a2 = s === null || s === void 0 ? void 0 : s.getAccountId()) === null || _a2 === void 0 ? void 0 : _a2.toString()) === actualAccountId;
      });
      this.logger.debug(`Found signer: ${(_c = signer === null || signer === void 0 ? void 0 : signer.getAccountId()) === null || _c === void 0 ? void 0 : _c.toString()}`);
      if (!signer) {
        throw new Error(`Signer not found for account ID: ${params === null || params === void 0 ? void 0 : params.signerAccountId}. Did you use the correct format? e.g hedera:<network>:<address> `);
      }
    } else {
      signer = this.signers[this.signers.length - 1];
    }
    if (!signer) {
      throw new Error("There is no active session. Connect to the wallet at first.");
    }
    this.logger.debug(`Using signer: ${signer.getAccountId().toString()}: ${signer.topic} - about to request.`);
    return await signer.request({
      method,
      params
    });
  }
  /**
   * Retrieves the node addresses associated with the current Hedera network.
   *
   * When there is no active session or an error occurs during the request.
   * @returns Promise\<{@link GetNodeAddressesResult}\>
   */
  async getNodeAddresses() {
    return await this.request({
      method: HederaJsonRpcMethod.GetNodeAddresses,
      params: void 0
    });
  }
  /**
   * Executes a transaction on the Hedera network.
   *
   * @param {ExecuteTransactionParams} params - The parameters of type {@link ExecuteTransactionParams | `ExecuteTransactionParams`} required for the transaction execution.
   * @param {string[]} params.signedTransaction - Array of Base64-encoded `Transaction`'s
   * @returns Promise\<{@link ExecuteTransactionResult}\>
   * @example
   * Use helper `transactionToBase64String` to encode `Transaction` to Base64 string
   * ```ts
   * const params = {
   *  signedTransaction: [transactionToBase64String(transaction)]
   * }
   *
   * const result = await dAppConnector.executeTransaction(params)
   * ```
   */
  async executeTransaction(params) {
    return await this.request({
      method: HederaJsonRpcMethod.ExecuteTransaction,
      params
    });
  }
  /**
   * Signs a provided `message` with provided `signerAccountId`.
   *
   * @param {SignMessageParams} params - The parameters of type {@link SignMessageParams | `SignMessageParams`} required for signing message.
   * @param {string} params.signerAccountId - a signer Hedera Account identifier in {@link https://hips.hedera.com/hip/hip-30 | HIP-30} (`<nework>:<shard>.<realm>.<num>`) form.
   * @param {string} params.message - a plain UTF-8 string
   * @returns Promise\<{@link SignMessageResult}\>
   * @example
   * ```ts
   * const params = {
   *  signerAccountId: 'hedera:testnet:0.0.12345',
   *  message: 'Hello World!'
   * }
   *
   * const result = await dAppConnector.signMessage(params)
   * ```
   */
  async signMessage(params) {
    return await this.request({
      method: HederaJsonRpcMethod.SignMessage,
      params
    });
  }
  /**
   * Signs and send `Query` on the Hedera network.
   *
   * @param {SignAndExecuteQueryParams} params - The parameters of type {@link SignAndExecuteQueryParams | `SignAndExecuteQueryParams`} required for the Query execution.
   * @param {string} params.signerAccountId - a signer Hedera Account identifier in {@link https://hips.hedera.com/hip/hip-30 | HIP-30} (`<nework>:<shard>.<realm>.<num>`) form.
   * @param {string} params.query - `Query` object represented as Base64 string
   * @returns Promise\<{@link SignAndExecuteQueryResult}\>
   * @example
   * Use helper `queryToBase64String` to encode `Query` to Base64 string
   * ```ts
   * const params = {
   *  signerAccountId: '0.0.12345',
   *  query: queryToBase64String(query),
   * }
   *
   * const result = await dAppConnector.signAndExecuteQuery(params)
   * ```
   */
  async signAndExecuteQuery(params) {
    return await this.request({
      method: HederaJsonRpcMethod.SignAndExecuteQuery,
      params
    });
  }
  /**
   * Signs and executes Transactions on the Hedera network.
   *
   * @param {SignAndExecuteTransactionParams} params - The parameters of type {@link SignAndExecuteTransactionParams | `SignAndExecuteTransactionParams`} required for `Transaction` signing and execution.
   * @param {string} params.signerAccountId - a signer Hedera Account identifier in {@link https://hips.hedera.com/hip/hip-30 | HIP-30} (`<nework>:<shard>.<realm>.<num>`) form.
   * @param {string[]} params.transaction - Array of Base64-encoded `Transaction`'s
   * @returns Promise\<{@link SignAndExecuteTransactionResult}\>
   * @example
   * Use helper `transactionToBase64String` to encode `Transaction` to Base64 string
   * ```ts
   * const params = {
   *  signerAccountId: '0.0.12345'
   *  transaction: [transactionToBase64String(transaction)]
   * }
   *
   * const result = await dAppConnector.signAndExecuteTransaction(params)
   * ```
   */
  async signAndExecuteTransaction(params) {
    return await this.request({
      method: HederaJsonRpcMethod.SignAndExecuteTransaction,
      params
    });
  }
  /**
   * Signs and executes Transactions on the Hedera network.
   *
   * @param {SignTransactionParams} params - The parameters of type {@link SignTransactionParams | `SignTransactionParams`} required for `Transaction` signing.
   * @param {string} params.signerAccountId - a signer Hedera Account identifier in {@link https://hips.hedera.com/hip/hip-30 | HIP-30} (`<nework>:<shard>.<realm>.<num>`) form.
   * @param {Transaction | string} params.transactionBody - a built Transaction object, or a base64 string of a transaction body (deprecated).
   * @deprecated Using string for params.transactionBody is deprecated and will be removed in a future version. Please migrate to using Transaction objects directly.
   * @returns Promise\<{@link SignTransactionResult}\>
   * @example
   * ```ts
   *
   * const params = {
   *  signerAccountId: '0.0.12345',
   *  transactionBody
   * }
   *
   * const result = await dAppConnector.signTransaction(params)
   * ```
   */
  async signTransaction(params) {
    var _a, _b;
    if (typeof (params === null || params === void 0 ? void 0 : params.transactionBody) === "string") {
      this.logger.warn("Transaction body is a string. This is not recommended, please migrate to passing a transaction object directly.");
      return await this.request({
        method: HederaJsonRpcMethod.SignTransaction,
        params
      });
    }
    if ((params === null || params === void 0 ? void 0 : params.transactionBody) instanceof Transaction) {
      const signerAccountId = (_b = (_a = params === null || params === void 0 ? void 0 : params.signerAccountId) === null || _a === void 0 ? void 0 : _a.split(":")) === null || _b === void 0 ? void 0 : _b.pop();
      const accountSigner = this.signers.find((signer) => {
        var _a2;
        return ((_a2 = signer === null || signer === void 0 ? void 0 : signer.getAccountId()) === null || _a2 === void 0 ? void 0 : _a2.toString()) === signerAccountId;
      });
      if (!accountSigner) {
        throw new Error(`No signer found for account ${signerAccountId}`);
      }
      if (!(params === null || params === void 0 ? void 0 : params.transactionBody)) {
        throw new Error("No transaction provided");
      }
      return await accountSigner.signTransaction(params.transactionBody);
    }
    throw new Error("Transaction sent in incorrect format. Ensure transaction body is either a base64 transaction body or Transaction object.");
  }
  handleSessionEvent(args) {
    this.logger.debug("Session event received:", args);
    this.validateAndRefreshSigners();
  }
  handleSessionUpdate({ topic, params }) {
    const { namespaces } = params;
    const _session = this.walletConnectClient.session.get(topic);
    const updatedSession = Object.assign(Object.assign({}, _session), { namespaces });
    this.logger.info("Session updated:", updatedSession);
    this.signers = this.signers.filter((signer) => signer.topic !== topic);
    this.signers.push(...this.createSigners(updatedSession));
  }
  handleSessionDelete(event) {
    this.logger.info("Session deleted:", event);
    let deletedSigner = false;
    this.signers = this.signers.filter((signer) => {
      if (signer.topic !== event.topic) {
        return true;
      }
      deletedSigner = true;
      return false;
    });
    if (deletedSigner) {
      try {
        this.disconnect(event.topic);
      } catch (e) {
        this.logger.error("Error disconnecting session:", e);
      }
      this.logger.info("Session deleted and signer removed");
    }
  }
  handlePairingDelete(event) {
    this.logger.info("Pairing deleted:", event);
    this.signers = this.signers.filter((signer) => signer.topic !== event.topic);
    try {
      this.disconnect(event.topic);
    } catch (e) {
      this.logger.error("Error disconnecting pairing:", e);
    }
    this.logger.info("Pairing deleted by wallet");
  }
}
class DefaultLogger2 {
  constructor() {
    this.logLevel = "info";
  }
  setLogLevel(level) {
    this.logLevel = level;
  }
  error(message, ...args) {
    if (["error", "warn", "info", "debug"].includes(this.logLevel)) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
  warn(message, ...args) {
    if (["warn", "info", "debug"].includes(this.logLevel)) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
  info(message, ...args) {
    if (["info", "debug"].includes(this.logLevel)) {
      console.info(`[INFO] ${message}`, ...args);
    }
  }
  debug(message, ...args) {
    if (this.logLevel === "debug") {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}
const fetchWithRetry = () => retryFetch(fetch, {
  retries: 3
});
var Name = /* @__PURE__ */ ((Name2) => {
  Name2["Contractcall"] = "CONTRACTCALL";
  Name2["Cryptotransfer"] = "CRYPTOTRANSFER";
  return Name2;
})(Name || {});
var Result = /* @__PURE__ */ ((Result2) => {
  Result2["Success"] = "SUCCESS";
  return Result2;
})(Result || {});
class HashinalsWalletConnectSDK {
  constructor(logger, network) {
    this.extensionCheckInterval = null;
    this.hasCalledExtensionCallback = false;
    this.logger = logger || new DefaultLogger2();
    this.network = network || LedgerId.MAINNET;
  }
  get dAppConnector() {
    return HashinalsWalletConnectSDK.dAppConnectorInstance;
  }
  static getInstance(logger, network) {
    let instance = HashinalsWalletConnectSDK == null ? void 0 : HashinalsWalletConnectSDK.instance;
    if (!instance) {
      HashinalsWalletConnectSDK.instance = new HashinalsWalletConnectSDK(
        logger,
        network
      );
      instance = HashinalsWalletConnectSDK.instance;
    }
    if (network) {
      instance.setNetwork(network);
    }
    return instance;
  }
  setLogger(logger) {
    this.logger = logger;
  }
  setNetwork(network) {
    this.network = network;
  }
  getNetwork() {
    return this.network;
  }
  setLogLevel(level) {
    if (this.logger instanceof DefaultLogger2) {
      this.logger.setLogLevel(level);
    } else {
      this.logger.warn("setLogLevel is only available for the default logger");
    }
  }
  async init(projectId, metadata, network, onSessionIframeCreated) {
    const chosenNetwork = network || this.network;
    const isMainnet = chosenNetwork.toString() === "mainnet";
    if (HashinalsWalletConnectSDK.dAppConnectorInstance) {
      return HashinalsWalletConnectSDK.dAppConnectorInstance;
    }
    HashinalsWalletConnectSDK.dAppConnectorInstance = new DAppConnector(
      metadata,
      chosenNetwork,
      projectId,
      Object.values(HederaJsonRpcMethod),
      [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
      [isMainnet ? HederaChainId.Mainnet : HederaChainId.Testnet],
      "debug"
    );
    await HashinalsWalletConnectSDK.dAppConnectorInstance.init({
      logger: "error"
    });
    HashinalsWalletConnectSDK.dAppConnectorInstance.onSessionIframeCreated = (session) => {
      this.logger.info("new session from from iframe", session);
      this.handleNewSession(session);
      if (onSessionIframeCreated) {
        onSessionIframeCreated(session);
      }
    };
    this.logger.info(
      `Hedera Wallet Connect SDK initialized on ${chosenNetwork}`
    );
    return HashinalsWalletConnectSDK.dAppConnectorInstance;
  }
  async connect() {
    this.ensureInitialized();
    const session = await this.dAppConnector.openModal();
    this.handleNewSession(session);
    return session;
  }
  async disconnect() {
    var _a, _b;
    try {
      this.ensureInitialized();
      const accountInfo = this.getAccountInfo();
      const accountId = accountInfo == null ? void 0 : accountInfo.accountId;
      const network = accountInfo == null ? void 0 : accountInfo.network;
      const signer = (_a = this == null ? void 0 : this.dAppConnector) == null ? void 0 : _a.signers.find(
        (signer_) => signer_.getAccountId().toString() === accountId
      );
      await ((_b = this.dAppConnector) == null ? void 0 : _b.disconnect(signer == null ? void 0 : signer.topic));
      this.logger.info(`Disconnected from ${accountId} on ${network}`);
      return true;
    } catch (e) {
      this.logger.error("Failed to disconnect", e);
      return false;
    }
  }
  async disconnectAll() {
    var _a;
    try {
      this.ensureInitialized();
      await ((_a = this.dAppConnector) == null ? void 0 : _a.disconnectAll());
      this.logger.info(`Disconnected from all wallets`);
      return true;
    } catch (e) {
      this.logger.error("Failed to disconnect", e);
      return false;
    }
  }
  async executeTransaction(tx, disableSigner = false) {
    this.ensureInitialized();
    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo == null ? void 0 : accountInfo.accountId;
    const signer = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === accountId
    );
    if (!disableSigner) {
      const signedTx = await tx.freezeWithSigner(signer);
      const executedTx = await signedTx.executeWithSigner(signer);
      return await executedTx.getReceiptWithSigner(signer);
    } else {
      const executedTx = await tx.executeWithSigner(signer);
      return await executedTx.getReceiptWithSigner(signer);
    }
  }
  async executeTransactionWithErrorHandling(tx, disableSigner) {
    var _a;
    try {
      const result = await this.executeTransaction(tx, disableSigner);
      return {
        result,
        error: void 0
      };
    } catch (e) {
      const error = e;
      const message = (_a = error.message) == null ? void 0 : _a.toLowerCase();
      this.logger.error("Failed to execute transaction", e);
      this.logger.error("Failure reason for transaction is", message);
      if (message.includes("insufficient payer balance")) {
        return {
          result: void 0,
          error: "Insufficient balance to complete the transaction."
        };
      } else if (message.includes("reject")) {
        return {
          result: void 0,
          error: "You rejected the transaction"
        };
      } else if (message.includes("invalid signature")) {
        return {
          result: void 0,
          error: "Invalid signature. Please check your account and try again."
        };
      } else if (message.includes("transaction expired")) {
        return {
          result: void 0,
          error: "Transaction expired. Please try again."
        };
      } else if (message.includes("account not found")) {
        return {
          result: void 0,
          error: "Account not found. Please check the account ID and try again."
        };
      } else if (message.includes("unauthorized")) {
        return {
          result: void 0,
          error: "Unauthorized. You may not have the necessary permissions for this action."
        };
      } else if (message.includes("busy")) {
        return {
          result: void 0,
          error: "The network is busy. Please try again later."
        };
      } else if (message.includes("invalid transaction")) {
        return {
          result: void 0,
          error: "Invalid transaction. Please check your inputs and try again."
        };
      }
    }
  }
  async submitMessageToTopic(topicId, message, submitKey) {
    this.ensureInitialized();
    let transaction = new TopicMessageSubmitTransaction().setTopicId(TopicId.fromString(topicId)).setMessage(message);
    if (submitKey) {
      transaction = await transaction.sign(submitKey);
    }
    return this.executeTransaction(transaction);
  }
  async transferHbar(fromAccountId, toAccountId, amount) {
    this.ensureInitialized();
    const transaction = new TransferTransaction().setTransactionId(TransactionId.generate(fromAccountId)).addHbarTransfer(AccountId.fromString(fromAccountId), new Hbar(-amount)).addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amount));
    return this.executeTransaction(transaction);
  }
  async executeSmartContract(contractId, functionName, parameters, gas = 1e5) {
    this.ensureInitialized();
    const transaction = new ContractExecuteTransaction().setContractId(ContractId.fromString(contractId)).setGas(gas).setFunction(functionName, parameters);
    return this.executeTransaction(transaction);
  }
  handleNewSession(session) {
    var _a, _b, _c;
    const sessionAccount = (_c = (_b = (_a = session.namespaces) == null ? void 0 : _a.hedera) == null ? void 0 : _b.accounts) == null ? void 0 : _c[0];
    const sessionParts = sessionAccount == null ? void 0 : sessionAccount.split(":");
    const accountId = sessionParts.pop();
    const network = sessionParts.pop();
    this.logger.info("sessionAccount is", accountId, network);
    if (!accountId) {
      this.logger.error("No account id found in the session");
      return;
    } else {
      this.saveConnectionInfo(accountId, network);
    }
  }
  getNetworkPrefix() {
    const accountInfo = this.getAccountInfo();
    const network = accountInfo == null ? void 0 : accountInfo.network;
    if (!network) {
      this.logger.warn("Network is not set on SDK, defaulting.");
      const cachedNetwork = localStorage.getItem("connectedNetwork");
      if (cachedNetwork) {
        return cachedNetwork;
      }
      return "mainnet-public";
    }
    if (network !== this.network) {
      this.logger.warn(
        "Detected network mismatch, reverting to signer network",
        network
      );
      this.network = network;
    }
    return network.isMainnet() ? "mainnet-public" : "testnet";
  }
  async requestAccount(account) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/accounts/${account}`;
      const response = await fetchWithRetry()(url);
      if (!response.ok) {
        throw new Error(
          `Failed to make request to mirror node for account: ${response.status}`
        );
      }
      return await response.json();
    } catch (e) {
      this.logger.error("Failed to fetch account", e);
      throw e;
    }
  }
  async getAccountBalance() {
    this.ensureInitialized();
    const accountInfo = this.getAccountInfo();
    const account = accountInfo == null ? void 0 : accountInfo.accountId;
    if (!account) {
      return null;
    }
    const accountResponse = await this.requestAccount(account);
    if (!accountResponse) {
      throw new Error(
        "Failed to fetch account. Try again or check if the Account ID is valid."
      );
    }
    const balance = accountResponse.balance.balance / 10 ** 8;
    return Number(balance).toLocaleString("en-US");
  }
  getAccountInfo() {
    var _a, _b;
    const { accountId: cachedAccountId } = this.loadConnectionInfo();
    if (!cachedAccountId) {
      return null;
    }
    const signers = (_a = this == null ? void 0 : this.dAppConnector) == null ? void 0 : _a.signers;
    if (!(signers == null ? void 0 : signers.length)) {
      return null;
    }
    const cachedSigner = this.dAppConnector.signers.find(
      (signer_) => signer_.getAccountId().toString() === cachedAccountId
    );
    if (!cachedSigner) {
      return null;
    }
    const accountId = (_b = cachedSigner == null ? void 0 : cachedSigner.getAccountId()) == null ? void 0 : _b.toString();
    if (!accountId) {
      return null;
    }
    const network = cachedSigner.getLedgerId();
    return {
      accountId,
      network
    };
  }

  async createTopic(memo, adminKey, submitKey) {
    this.ensureInitialized();
    let transaction = new TopicCreateTransaction().setTopicMemo(memo || "");

    if (adminKey) {
      const adminWithPrivateKey = PrivateKey.fromString(adminKey);
      transaction.setAdminKey(adminWithPrivateKey.publicKey);
      transaction.freezeWith(client); // Freeze after setting the admin key
      transaction = await transaction.sign(adminWithPrivateKey); // Then sign
    }

    if (submitKey) {
      transaction.setSubmitKey(PrivateKey.fromString(submitKey).publicKey);
    }

    const receipt = await this.executeTransaction(transaction, false); // Disable signing in executeTransaction
    return receipt.topicId.toString();
  }

  async generatePrivateAndPublicKey() {
    const privateKey = await PrivateKey.generateED25519Async();
    const publicKey = privateKey.publicKey;
    return {
      privateKey: privateKey.toString(),
      publicKey: publicKey.toString()
    };
  }

  async updateTopic(topicId, memo, adminKey) {
    this.ensureInitialized();
    let transaction = new TopicUpdateTransaction()
      .setTopicId(TopicId.fromString(topicId))
      .setTopicMemo(memo || "")
      .freezeWith(client);
      
    // Convert the adminKey string back to a PrivateKey object
    const privateKey = PrivateKey.fromString(adminKey);
    const signedTx = await transaction.sign(privateKey);
    
    const receipt = await this.executeTransaction(signedTx);
    return receipt.topicId.toString();
  }

  async createToken(name, symbol, initialSupply, decimals, treasuryAccountId, adminKey, supplyKey) {
    this.ensureInitialized();
    let transaction = new TokenCreateTransaction().setTokenName(name).setTokenSymbol(symbol).setDecimals(decimals).setInitialSupply(initialSupply).setTreasuryAccountId(AccountId.fromString(treasuryAccountId)).setTokenType(TokenType.NonFungibleUnique).setSupplyType(TokenSupplyType.Finite);
    if (supplyKey) {
      transaction = transaction.setSupplyKey(PrivateKey.fromString(supplyKey));
    }
    if (adminKey) {
      transaction = transaction.setAdminKey(PrivateKey.fromString(adminKey));
      transaction = await transaction.sign(PrivateKey.fromString(adminKey));
    }
    const receipt = await this.executeTransaction(transaction);
    return receipt.tokenId.toString();
  }
  async mintNFT(tokenId, metadata, supplyKey) {
    this.ensureInitialized();
    let transaction = await new TokenMintTransaction().setTokenId(tokenId).setMetadata([Buffer$1.from(metadata, "utf-8")]).sign(supplyKey);
    return this.executeTransaction(transaction);
  }
  async getMessages(topicId, lastTimestamp, disableTimestampFilter = false, network) {
    var _a, _b;
    const networkPrefix = network || this.getNetworkPrefix();
    const baseUrl = `https://${networkPrefix}.mirrornode.hedera.com`;
    const timestampQuery = Number(lastTimestamp) > 0 && !disableTimestampFilter ? `&timestamp=gt:${lastTimestamp}` : "";
    const url = `${baseUrl}/api/v1/topics/${topicId}/messages?limit=200${timestampQuery}`;
    try {
      const response = await fetchWithRetry()(url);
      if (!response.ok) {
        throw new Error(
          `Failed to make request to mirror node: ${response.status}`
        );
      }
      const data = await response.json();
      const messages = (data == null ? void 0 : data.messages) || [];
      const nextLink = (_a = data == null ? void 0 : data.links) == null ? void 0 : _a.next;
      const collectedMessages = messages.map((msg) => {
        const parsedMessage = JSON.parse(atob(msg.message));
        return {
          ...parsedMessage,
          payer: msg.payer_account_id,
          created: new Date(Number(msg.consensus_timestamp) * 1e3),
          consensus_timestamp: msg.consensus_timestamp,
          sequence_number: msg.sequence_number
        };
      });
      if (nextLink) {
        const nextResult = await this.getMessages(
          topicId,
          Number(
            (_b = collectedMessages[collectedMessages.length - 1]) == null ? void 0 : _b.consensus_timestamp
          ),
          disableTimestampFilter
        );
        collectedMessages.push(...nextResult.messages);
      }
      return {
        messages: collectedMessages.sort(
          (a, b2) => a.sequence_number - b2.sequence_number
        ),
        error: ""
      };
    } catch (error) {
      this.logger.error("Error fetching topic data:", error);
      return {
        messages: [],
        error: error.toString()
      };
    }
  }
  async signMessage(message) {
    const dAppConnector = this.dAppConnector;
    if (!dAppConnector) {
      throw new Error("No active connection or signer");
    }
    const accountInfo = this.getAccountInfo();
    const accountId = accountInfo == null ? void 0 : accountInfo.accountId;
    const params = {
      signerAccountId: `hedera:${this.network}:${accountId}`,
      message
    };
    const result = await dAppConnector.signMessage(
      params
    );
    return { userSignature: result.signatureMap };
  }
  saveConnectionInfo(accountId, connectedNetwork) {
    if (!accountId) {
      localStorage.removeItem("connectedAccountId");
      localStorage.removeItem("connectedNetwork");
    } else {
      const cleanNetwork = connectedNetwork == null ? void 0 : connectedNetwork.replace(/['"]+/g, "");
      localStorage.setItem("connectedNetwork", cleanNetwork);
      localStorage.setItem("connectedAccountId", accountId);
    }
  }
  loadConnectionInfo() {
    return {
      accountId: localStorage.getItem("connectedAccountId"),
      network: localStorage.getItem("connectedNetwork")
    };
  }
  async connectWallet(PROJECT_ID, APP_METADATA, network) {
    try {
      await this.init(PROJECT_ID, APP_METADATA, network);
      const session = await this.connect();
      const accountInfo = this.getAccountInfo();
      const accountId = accountInfo == null ? void 0 : accountInfo.accountId;
      const balance = await this.getAccountBalance();
      const networkPrefix = this.getNetworkPrefix();
      this.saveConnectionInfo(accountId, networkPrefix);
      return {
        accountId,
        balance,
        session
      };
    } catch (error) {
      this.logger.error("Failed to connect wallet:", error);
      throw error;
    }
  }
  async disconnectWallet(clearStorage = true) {
    try {
      const success = await this.disconnect();
      if (success && clearStorage) {
        localStorage.clear();
      }
      this.saveConnectionInfo(void 0);
      return success;
    } catch (error) {
      this.logger.error("Failed to disconnect wallet:", error);
      return false;
    }
  }
  async initAccount(PROJECT_ID, APP_METADATA, networkOverride, onSessionIframeCreated = () => {
  }) {
    const { accountId: savedAccountId, network: savedNetwork } = this.loadConnectionInfo();
    if (savedAccountId && savedNetwork) {
      try {
        const defaultNetwork = savedNetwork === "mainnet" ? LedgerId.MAINNET : LedgerId.TESTNET;
        const network = networkOverride || defaultNetwork;
        await this.init(
          PROJECT_ID,
          APP_METADATA,
          network,
          onSessionIframeCreated
        );
        const balance = await this.getAccountBalance();
        return {
          accountId: savedAccountId,
          balance
        };
      } catch (error) {
        this.logger.error("Failed to reconnect:", error);
        this.saveConnectionInfo(void 0, void 0);
        return null;
      }
    } else if (networkOverride) {
      try {
        this.logger.info(
          "initializing normally through override.",
          networkOverride
        );
        await this.init(
          PROJECT_ID,
          APP_METADATA,
          networkOverride,
          onSessionIframeCreated
        );
        this.logger.info("initialized", networkOverride);
        await this.connectViaDappBrowser();
        this.logger.info("connected via dapp browser");
      } catch (error) {
        this.logger.error("Failed to fallback connect:", error);
        this.saveConnectionInfo(void 0, void 0);
        return null;
      }
    }
    return null;
  }
  subscribeToExtensions(callback) {
    if (this.extensionCheckInterval) {
      clearInterval(this.extensionCheckInterval);
    }
    this.hasCalledExtensionCallback = false;
    this.extensionCheckInterval = setInterval(() => {
      var _a;
      const extensions = ((_a = this.dAppConnector) == null ? void 0 : _a.extensions) || [];
      const availableExtension = extensions.find(
        (ext) => ext.availableInIframe
      );
      if (availableExtension && !this.hasCalledExtensionCallback) {
        this.hasCalledExtensionCallback = true;
        callback(availableExtension);
        if (this.extensionCheckInterval) {
          clearInterval(this.extensionCheckInterval);
          this.extensionCheckInterval = null;
        }
      }
    }, 1e3);
    return () => {
      if (this.extensionCheckInterval) {
        clearInterval(this.extensionCheckInterval);
        this.extensionCheckInterval = null;
      }
      this.hasCalledExtensionCallback = false;
    };
  }
  async connectViaDappBrowser() {
    const extensions = this.dAppConnector.extensions || [];
    const extension = extensions.find((ext) => {
      this.logger.info("Checking extension", ext);
      return ext.availableInIframe;
    });
    this.logger.info("extensions are", extensions, extension);
    if (extension) {
      await this.connectToExtension(extension);
    } else {
      this.subscribeToExtensions(async (newExtension) => {
        await this.connectToExtension(newExtension);
      });
    }
  }
  async connectToExtension(extension) {
    this.logger.info("found extension, connecting to iframe.", extension);
    const session = await this.dAppConnector.connectExtension(extension.id);
    const onSessionIframeCreated = this.dAppConnector.onSessionIframeCreated;
    if (onSessionIframeCreated) {
      onSessionIframeCreated(session);
    }
  }
  ensureInitialized() {
    if (!this.dAppConnector) {
      throw new Error("SDK not initialized. Call init() first.");
    }
  }
  static run() {
    try {
      if (typeof window !== "undefined") {
        window.HashinalsWalletConnectSDK = HashinalsWalletConnectSDK.getInstance();
        window.HashgraphSDK = HashgraphSDK;
      }
    } catch (e) {
      console.error("[ERROR]: failed setting sdk on window");
    }
  }
  async transferToken(tokenId, fromAccountId, toAccountId, amount) {
    this.ensureInitialized();
    const transaction = new TransferTransaction().setTransactionId(TransactionId.generate(fromAccountId)).addTokenTransfer(
      TokenId.fromString(tokenId),
      AccountId.fromString(fromAccountId),
      -amount
    ).addTokenTransfer(
      TokenId.fromString(tokenId),
      AccountId.fromString(toAccountId),
      amount
    );
    return this.executeTransaction(transaction);
  }
  async createAccount(initialBalance) {
    this.ensureInitialized();
    const transaction = new AccountCreateTransaction().setInitialBalance(
      new Hbar(initialBalance)
    );
    return this.executeTransaction(transaction);
  }
  async associateTokenToAccount(accountId, tokenId) {
    this.ensureInitialized();
    const transaction = new TokenAssociateTransaction().setAccountId(AccountId.fromString(accountId)).setTokenIds([TokenId.fromString(tokenId)]);
    return this.executeTransaction(transaction);
  }
  async dissociateTokenFromAccount(accountId, tokenId) {
    this.ensureInitialized();
    const transaction = new TokenDissociateTransaction().setAccountId(AccountId.fromString(accountId)).setTokenIds([TokenId.fromString(tokenId)]);
    return this.executeTransaction(transaction);
  }
  async updateAccount(accountId, maxAutomaticTokenAssociations) {
    this.ensureInitialized();
    const transaction = new AccountUpdateTransaction().setAccountId(AccountId.fromString(accountId)).setMaxAutomaticTokenAssociations(maxAutomaticTokenAssociations);
    return this.executeTransaction(transaction);
  }
  async approveAllowance(spenderAccountId, tokenId, amount, ownerAccountId) {
    this.ensureInitialized();
    const transaction = new AccountAllowanceApproveTransaction().approveTokenAllowance(
      TokenId.fromString(tokenId),
      AccountId.fromString(ownerAccountId),
      AccountId.fromString(spenderAccountId),
      amount
    );
    return this.executeTransaction(transaction);
  }
  async getAccountTokens(accountId) {
    var _a, _b;
    this.ensureInitialized();
    const networkPrefix = this.getNetworkPrefix();
    const baseUrl = `https://${networkPrefix}.mirrornode.hedera.com`;
    const url = `${baseUrl}/api/v1/accounts/${accountId}/tokens?limit=200`;
    try {
      const response = await fetchWithRetry()(url);
      if (!response.ok) {
        throw new Error(
          `Failed to make request to mirror node for account tokens: ${response.status}`
        );
      }
      const data = await response.json();
      const tokens = [];
      for (const token of data.tokens) {
        if (token.token_id) {
          tokens.push({
            tokenId: token.token_id,
            balance: token.balance,
            decimals: token.decimals,
            formatted_balance: (token.balance / 10 ** token.decimals).toLocaleString("en-US"),
            created_timestamp: new Date(Number(token.created_timestamp) * 1e3)
          });
        }
      }
      let nextLink = (_a = data.links) == null ? void 0 : _a.next;
      while (nextLink) {
        const nextUrl = `${baseUrl}${nextLink}`;
        const nextResponse = await fetchWithRetry()(nextUrl);
        if (!nextResponse.ok) {
          throw new Error(
            `Failed to make request to mirror node for account tokens: ${nextResponse.status}, page: ${nextUrl}`
          );
        }
        const nextData = await nextResponse.json();
        for (const token of nextData.tokens) {
          if (token.token_id) {
            tokens.push({
              tokenId: token.token_id,
              balance: token.balance,
              decimals: token.decimals,
              formatted_balance: (token.balance / 10 ** token.decimals).toLocaleString("en-US"),
              created_timestamp: new Date(
                Number(token.created_timestamp) * 1e3
              )
            });
          }
        }
        nextLink = (_b = nextData.links) == null ? void 0 : _b.next;
      }
      return { tokens };
    } catch (error) {
      this.logger.error("Error fetching account tokens:", error);
      throw error;
    }
  }
  async getTransaction(transactionId) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/transactions/${transactionId}`;
      this.logger.debug("Fetching transaction", url);
      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(`Failed to fetch transaction: ${request.status}`);
      }
      return await request.json();
    } catch (e) {
      this.logger.error("Failed to get transaction", e);
      return null;
    }
  }
  async getTransactionByTimestamp(timestamp) {
    var _a;
    try {
      const networkPrefix = this.getNetworkPrefix();
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/transactions?timestamp=${timestamp}`;
      this.logger.debug("Fetching transaction by timestamp", url);
      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(
          `Failed to fetch transaction by timestamp: ${request.status}`
        );
      }
      const response = await request.json();
      const transaction = (_a = response == null ? void 0 : response.transactions) == null ? void 0 : _a[0];
      if (transaction) {
        return await this.getTransaction(transaction.transaction_id);
      }
      return null;
    } catch (e) {
      this.logger.error("Failed to get transaction by timestamp", e);
      return null;
    }
  }
  async getAccountNFTs(accountId, tokenId) {
    var _a, _b, _c;
    try {
      const networkPrefix = this.getNetworkPrefix();
      const tokenQuery = tokenId ? `&token.id=${tokenId}` : "";
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/accounts/${accountId}/nfts?limit=200${tokenQuery}`;
      const request = await fetchWithRetry()(url);
      if (!request.ok) {
        throw new Error(`Failed to fetch NFTs for account: ${request.status}`);
      }
      const response = await request.json();
      let nextLink = ((_a = response == null ? void 0 : response.links) == null ? void 0 : _a.next) || null;
      let nfts = response.nfts;
      while (nextLink) {
        try {
          const nextRequest = await fetchWithRetry()(
            `https://${networkPrefix}.mirrornode.hedera.com${nextLink}`
          );
          if (!nextRequest.ok) {
            throw new Error(
              `Failed to fetch next page of NFTs: ${nextRequest.status}`
            );
          }
          const nextResponse = await nextRequest.json();
          nfts = [...nfts, ...(nextResponse == null ? void 0 : nextResponse.nfts) || []];
          nextLink = ((_b = nextResponse == null ? void 0 : nextResponse.links) == null ? void 0 : _b.next) && nextLink !== ((_c = nextResponse == null ? void 0 : nextResponse.links) == null ? void 0 : _c.next) ? nextResponse.links.next : null;
        } catch (e) {
          this.logger.error("Failed to fetch next page of NFTs", e);
          break;
        }
      }
      return nfts.map((nft) => {
        try {
          nft.token_uri = Buffer$1.from(nft.metadata, "base64").toString("ascii");
        } catch (e) {
          this.logger.error("Failed to decode NFT metadata", e);
        }
        return nft;
      });
    } catch (e) {
      this.logger.error("Failed to get account NFTs", e);
      return [];
    }
  }
  async validateNFTOwnership(serialNumber, accountId, tokenId) {
    const userNFTs = await this.getAccountNFTs(accountId, tokenId);
    return userNFTs.find(
      (nft) => nft.token_id === tokenId && nft.serial_number.toString() === serialNumber
    ) || null;
  }
  async readSmartContract(data, fromAccount, contractId, estimate = true, value = 0) {
    try {
      const networkPrefix = this.getNetworkPrefix();
      const body = {
        block: "latest",
        data,
        estimate,
        from: fromAccount.toSolidityAddress(),
        to: contractId.toSolidityAddress(),
        value
      };
      if (!estimate) {
        body.gas = 3e5;
        body.gasPrice = 1e8;
      }
      const url = `https://${networkPrefix}.mirrornode.hedera.com/api/v1/contracts/call`;
      const response = await fetchWithRetry()(url, {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to make contract call: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      this.logger.error("Failed to make contract call", e);
      return null;
    }
  }
}
export {
  HashgraphSDK,
  HashinalsWalletConnectSDK,
  Name,
  Result,
  base64StringToSignatureMap,
  prefixMessageToSign,
  verifyMessageSignature
};
//# sourceMappingURL=hashinal-wc.es.js.map
