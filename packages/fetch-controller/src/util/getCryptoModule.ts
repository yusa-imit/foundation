/* eslint-disable */

export function getCryptoModule(): Crypto {
  try {
    return window.crypto;
  } catch {
    return require('node:crypto').webcrypto as Crypto;
  }
}
