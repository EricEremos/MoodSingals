import { base64UrlToBytes, bytesToBase64Url, toArrayBuffer } from './encoding'

type RegistrationOptionsJson = {
  challenge: string
  rp: PublicKeyCredentialRpEntity
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout?: number
  attestation?: AttestationConveyancePreference
  excludeCredentials?: Array<{ id: string; type: PublicKeyCredentialType }>
  authenticatorSelection?: AuthenticatorSelectionCriteria
}

type AuthenticationOptionsJson = {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: Array<{ id: string; type: PublicKeyCredentialType }>
  userVerification?: UserVerificationRequirement
}

type RegistrationCredentialJson = {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    attestationObject: string
    transports: string[]
  }
}

type AuthenticationCredentialJson = {
  id: string
  rawId: string
  type: string
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle: string | null
  }
}

export async function createPasskey(optionsJson: RegistrationOptionsJson): Promise<RegistrationCredentialJson> {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('Passkeys are not supported on this device.')
  }
  const options: PublicKeyCredentialCreationOptions = {
    ...optionsJson,
    challenge: toArrayBuffer(base64UrlToBytes(optionsJson.challenge)),
    user: {
      ...optionsJson.user,
      id: toArrayBuffer(base64UrlToBytes(optionsJson.user.id)),
    },
    excludeCredentials: optionsJson.excludeCredentials?.map((item) => ({
      ...item,
      id: toArrayBuffer(base64UrlToBytes(item.id)),
    })),
  }

  const credential = await navigator.credentials.create({ publicKey: options })
  if (!credential) throw new Error('Passkey registration was canceled.')
  const publicKeyCredential = credential as PublicKeyCredential
  const response = publicKeyCredential.response as AuthenticatorAttestationResponse

  return {
    id: publicKeyCredential.id,
    rawId: bytesToBase64Url(new Uint8Array(publicKeyCredential.rawId)),
    type: publicKeyCredential.type,
    response: {
      clientDataJSON: bytesToBase64Url(new Uint8Array(response.clientDataJSON)),
      attestationObject: bytesToBase64Url(new Uint8Array(response.attestationObject)),
      transports: response.getTransports?.() ?? [],
    },
  }
}

export async function getPasskeyAssertion(
  optionsJson: AuthenticationOptionsJson,
): Promise<AuthenticationCredentialJson> {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('Passkeys are not supported on this device.')
  }

  const options: PublicKeyCredentialRequestOptions = {
    ...optionsJson,
    challenge: toArrayBuffer(base64UrlToBytes(optionsJson.challenge)),
    allowCredentials: optionsJson.allowCredentials?.map((item) => ({
      ...item,
      id: toArrayBuffer(base64UrlToBytes(item.id)),
    })),
  }

  const credential = await navigator.credentials.get({ publicKey: options })
  if (!credential) throw new Error('Passkey sign-in was canceled.')
  const publicKeyCredential = credential as PublicKeyCredential
  const response = publicKeyCredential.response as AuthenticatorAssertionResponse

  return {
    id: publicKeyCredential.id,
    rawId: bytesToBase64Url(new Uint8Array(publicKeyCredential.rawId)),
    type: publicKeyCredential.type,
    response: {
      clientDataJSON: bytesToBase64Url(new Uint8Array(response.clientDataJSON)),
      authenticatorData: bytesToBase64Url(new Uint8Array(response.authenticatorData)),
      signature: bytesToBase64Url(new Uint8Array(response.signature)),
      userHandle: response.userHandle
        ? bytesToBase64Url(new Uint8Array(response.userHandle))
        : null,
    },
  }
}
