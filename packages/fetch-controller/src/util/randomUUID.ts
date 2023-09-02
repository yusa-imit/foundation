/* eslint-disable */

function getCryptoModule(): Crypto {
  return window ? window.crypto : (require('node:crypto').webcrypto as Crypto);
}

export const randomUUID = getCryptoModule().randomUUID;
