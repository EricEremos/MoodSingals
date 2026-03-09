import { base64ToBytes, bytesToBase64, toArrayBuffer } from './encoding'

const KEY_ITERATIONS = 250_000

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

type CipherEnvelope = {
  iv: string
  data: string
}

export type EncryptedPayload = {
  ciphertext: string
  salt: string
}

async function deriveAesKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toArrayBuffer(salt),
      iterations: KEY_ITERATIONS,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJsonValue(
  value: unknown,
  passphrase: string,
  existingSalt?: string,
): Promise<EncryptedPayload> {
  const salt = existingSalt ? base64ToBytes(existingSalt) : crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveAesKey(passphrase, salt)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = textEncoder.encode(JSON.stringify(value))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    encoded,
  )
  const envelope: CipherEnvelope = {
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  }
  return {
    ciphertext: bytesToBase64(textEncoder.encode(JSON.stringify(envelope))),
    salt: bytesToBase64(salt),
  }
}

export async function decryptJsonValue<T>(
  ciphertext: string,
  passphrase: string,
  salt: string,
): Promise<T> {
  const envelopeJson = textDecoder.decode(base64ToBytes(ciphertext))
  const envelope = JSON.parse(envelopeJson) as CipherEnvelope
  const key = await deriveAesKey(passphrase, base64ToBytes(salt))
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(envelope.iv)) },
    key,
    toArrayBuffer(base64ToBytes(envelope.data)),
  )
  return JSON.parse(textDecoder.decode(new Uint8Array(decrypted))) as T
}
