/**
 * Crypto utilities for E2EE using WebCrypto API and IndexedDB
 */

const DB_NAME = "collabnote-crypto";
const DB_VERSION = 1;
const STORE_NAME = "keys";
const KEYPAIR_KEY = "x25519-keypair";
const KEYPAIR_JWK_KEY = "x25519-keypair-jwk";

/**
 * Configuration for key storage strategy
 */
interface KeypairConfig {
    /** If true, store as non-extractable CryptoKey (most secure). If false, store as extractable JWK */
    useNonExtractable: boolean;
}

const DEFAULT_CONFIG: KeypairConfig = {
    useNonExtractable: true, // Default to most secure option
};

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

/**
 * Store a value in IndexedDB
 */
async function storeValue(key: string, value: any): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}

/**
 * Retrieve a value from IndexedDB
 */
async function getValue<T>(key: string): Promise<T | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

/**
 * Check if X25519 is supported in the current browser
 */
async function isX25519Supported(): Promise<boolean> {
    try {
        await crypto.subtle.generateKey(
            { name: "X25519" } as any,
            true,
            ["deriveKey", "deriveBits"]
        );
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure that an X25519 keypair exists in IndexedDB.
 * If not, generate a new one and store it.
 * Returns the public key in ArrayBuffer format, ready to be sent to the API.
 * 
 * @param config - Configuration for key storage strategy
 */
export async function ensureKeypair(
    config: KeypairConfig = DEFAULT_CONFIG
): Promise<ArrayBuffer> {
    // Try to load existing keypair
    let keypair: CryptoKeyPair | null = null;

    if (config.useNonExtractable) {
        // Try to load non-extractable CryptoKey from IndexedDB
        keypair = await getValue<CryptoKeyPair>(KEYPAIR_KEY);
    } else {
        // Try to load extractable JWK from IndexedDB and import it
        const jwkPair = await getValue<{ privateKey: JsonWebKey; publicKey: JsonWebKey }>(
            KEYPAIR_JWK_KEY
        );

        if (jwkPair) {
            // Import the JWK back into CryptoKey format
            const algorithm = jwkPair.privateKey.crv === "X25519"
                ? { name: "X25519" } as any
                : { name: "ECDH", namedCurve: "P-256" };

            const privateKey = await crypto.subtle.importKey(
                "jwk",
                jwkPair.privateKey,
                algorithm,
                true,
                ["deriveKey", "deriveBits"]
            );

            const publicKey = await crypto.subtle.importKey(
                "jwk",
                jwkPair.publicKey,
                algorithm,
                true,
                []
            );

            keypair = { privateKey, publicKey };
        }
    }

    // If no keypair exists, generate a new one
    if (!keypair) {
        console.log("No existing keypair found, generating new X25519 keypair...");

        // Check if X25519 is supported
        const x25519Supported = await isX25519Supported();

        if (x25519Supported) {
            console.log("X25519 is supported, generating X25519 keypair");
            keypair = await crypto.subtle.generateKey(
                { name: "X25519" } as any,
                config.useNonExtractable ? false : true, // extractable based on config
                ["deriveKey", "deriveBits"]
            );
        } else {
            // Fallback to ECDH with P-256 if X25519 is not supported
            console.warn("X25519 not supported, falling back to ECDH P-256");
            keypair = await crypto.subtle.generateKey(
                {
                    name: "ECDH",
                    namedCurve: "P-256",
                },
                config.useNonExtractable ? false : true, // extractable based on config
                ["deriveKey", "deriveBits"]
            );
        }

        // Store the keypair based on configuration
        if (config.useNonExtractable) {
            // Store CryptoKey directly (non-extractable)
            // IndexedDB can store CryptoKey objects natively
            await storeValue(KEYPAIR_KEY, keypair);
            console.log("Stored non-extractable keypair in IndexedDB");
        } else {
            // Export to JWK and store (extractable)
            const privateKeyJwk = await crypto.subtle.exportKey("jwk", keypair.privateKey);
            const publicKeyJwk = await crypto.subtle.exportKey("jwk", keypair.publicKey);

            await storeValue(KEYPAIR_JWK_KEY, {
                privateKey: privateKeyJwk,
                publicKey: publicKeyJwk,
            });
            console.log("Stored extractable keypair as JWK in IndexedDB");
        }
    }

    // Export the public key as raw bytes (ArrayBuffer)
    const publicKeyBuffer = await crypto.subtle.exportKey("raw", keypair.publicKey);

    return publicKeyBuffer;
}

/**
 * Get the stored keypair from IndexedDB (non-extractable version)
 */
export async function getStoredKeypair(): Promise<CryptoKeyPair | null> {
    return await getValue<CryptoKeyPair>(KEYPAIR_KEY);
}

/**
 * Get the stored keypair as JWK from IndexedDB (extractable version)
 */
export async function getStoredKeypairJWK(): Promise<{
    privateKey: JsonWebKey;
    publicKey: JsonWebKey;
} | null> {
    return await getValue<{ privateKey: JsonWebKey; publicKey: JsonWebKey }>(
        KEYPAIR_JWK_KEY
    );
}

/**
 * Export the public key as a hex string (for API transmission)
 */
export async function exportPublicKeyAsHex(): Promise<string> {
    const publicKeyBuffer = await ensureKeypair();
    const publicKeyArray = new Uint8Array(publicKeyBuffer);
    return Array.from(publicKeyArray)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Encrypt a note's plaintext content using AES-GCM.
 * Generates a random 256-bit Data Key (DK) and a random 96-bit nonce.
 * 
 * @param plaintext - The note content to encrypt
 * @returns Object containing ciphertext, nonce, DK, and content_hash
 */
export async function encryptNote(plaintext: string): Promise<{
    ciphertext: ArrayBuffer;
    nonce: ArrayBuffer;
    DK: CryptoKey;
    content_hash: string;
}> {
    // Generate a random 256-bit AES-GCM Data Key (DK)
    const DK = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256, // 256-bit key
        },
        true, // extractable (needed for key wrapping later)
        ["encrypt", "decrypt"]
    );

    // Generate a random 96-bit nonce (12 bytes)
    const nonce = crypto.getRandomValues(new Uint8Array(12));

    // Encode the plaintext to bytes
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);

    // Compute SHA-256 hash of plaintext for integrity verification
    const hashBuffer = await crypto.subtle.digest("SHA-256", plaintextBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const content_hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Encrypt the plaintext using AES-GCM
    const ciphertext = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: nonce, // initialization vector (nonce)
            tagLength: 128, // authentication tag length in bits
        },
        DK,
        plaintextBytes
    );

    return {
        ciphertext,
        nonce: nonce.buffer,
        DK,
        content_hash,
    };
}

/**
 * Decrypt a note's ciphertext using AES-GCM.
 * 
 * @param ciphertext - The encrypted note content
 * @param nonce - The nonce used during encryption
 * @param DK - The Data Key used for encryption
 * @returns The decrypted plaintext string
 */
export async function decryptNote(
    ciphertext: ArrayBuffer,
    nonce: ArrayBuffer,
    DK: CryptoKey
): Promise<string> {
    // Decrypt the ciphertext using AES-GCM
    const plaintextBytes = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(nonce),
            tagLength: 128,
        },
        DK,
        ciphertext
    );

    // Decode the bytes back to a string
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(plaintextBytes);

    return plaintext;
}

/**
 * Wrap a Data Key (DK) for a collaborator using ECDH + HKDF + AES-GCM.
 * This allows secure sharing of the DK with another user.
 * 
 * @param DK - The Data Key to wrap
 * @param collaboratorPubKey - The collaborator's public key (raw format)
 * @param privateKey - The current user's private key
 * @param noteId - The note ID (used as salt for HKDF)
 * @returns The wrapped DK as ArrayBuffer
 */
export async function wrapDK(
    DK: CryptoKey,
    collaboratorPubKey: ArrayBuffer,
    privateKey: CryptoKey,
    noteId: string
): Promise<ArrayBuffer> {
    // 1. Import the collaborator's public key
    // Determine the algorithm based on the private key
    const algorithm = privateKey.algorithm.name === "X25519"
        ? { name: "X25519" } as any
        : { name: "ECDH", namedCurve: "P-256" };

    const collaboratorPublicKey = await crypto.subtle.importKey(
        "raw",
        collaboratorPubKey,
        algorithm,
        false,
        []
    );

    // 2. Derive shared secret using ECDH
    const sharedSecret = await crypto.subtle.deriveBits(
        {
            name: privateKey.algorithm.name,
            public: collaboratorPublicKey,
        },
        privateKey,
        256 // 256 bits
    );

    // 3. Import shared secret as key material for HKDF
    const sharedSecretKey = await crypto.subtle.importKey(
        "raw",
        sharedSecret,
        { name: "HKDF" },
        false,
        ["deriveKey"]
    );

    // 4. Derive a wrapping key using HKDF-SHA256
    // Use noteId as salt for key derivation
    const encoder = new TextEncoder();
    const salt = encoder.encode(noteId);

    const wrappingKey = await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: salt,
            info: encoder.encode("CollabNote-DK-Wrapping"), // Additional context
        },
        sharedSecretKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false, // not extractable
        ["wrapKey", "unwrapKey"]
    );

    // 5. Wrap the DK using AES-GCM
    // Generate a random IV for the wrapping operation
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const wrappedDK = await crypto.subtle.wrapKey(
        "raw",
        DK,
        wrappingKey,
        {
            name: "AES-GCM",
            iv: iv,
        }
    );

    // 6. Prepend the IV to the wrapped key (needed for unwrapping)
    const result = new Uint8Array(iv.length + wrappedDK.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(wrappedDK), iv.length);

    return result.buffer;
}

/**
 * Unwrap a Data Key (DK) using ECDH + HKDF + AES-GCM.
 * This allows decrypting a note shared by another user.
 * 
 * @param wrapped_dk - The wrapped Data Key (with IV prepended)
 * @param authorPubKey - The note author's public key (raw format)
 * @param privateKey - The current user's private key
 * @param noteId - The note ID (used as salt for HKDF)
 * @returns The unwrapped Data Key
 */
export async function unwrapDK(
    wrapped_dk: ArrayBuffer,
    authorPubKey: ArrayBuffer,
    privateKey: CryptoKey,
    noteId: string
): Promise<CryptoKey> {
    // 1. Extract the IV from the wrapped key
    const wrappedArray = new Uint8Array(wrapped_dk);
    const iv = wrappedArray.slice(0, 12);
    const actualWrappedDK = wrappedArray.slice(12);

    // 2. Import the author's public key
    const algorithm = privateKey.algorithm.name === "X25519"
        ? { name: "X25519" } as any
        : { name: "ECDH", namedCurve: "P-256" };

    const authorPublicKey = await crypto.subtle.importKey(
        "raw",
        authorPubKey,
        algorithm,
        false,
        []
    );

    // 3. Derive shared secret using ECDH
    const sharedSecret = await crypto.subtle.deriveBits(
        {
            name: privateKey.algorithm.name,
            public: authorPublicKey,
        },
        privateKey,
        256 // 256 bits
    );

    // 4. Import shared secret as key material for HKDF
    const sharedSecretKey = await crypto.subtle.importKey(
        "raw",
        sharedSecret,
        { name: "HKDF" },
        false,
        ["deriveKey"]
    );

    // 5. Derive the wrapping key using HKDF-SHA256
    const encoder = new TextEncoder();
    const salt = encoder.encode(noteId);

    const wrappingKey = await crypto.subtle.deriveKey(
        {
            name: "HKDF",
            hash: "SHA-256",
            salt: salt,
            info: encoder.encode("CollabNote-DK-Wrapping"),
        },
        sharedSecretKey,
        {
            name: "AES-GCM",
            length: 256,
        },
        false,
        ["wrapKey", "unwrapKey"]
    );

    // 6. Unwrap the DK using AES-GCM
    const DK = await crypto.subtle.unwrapKey(
        "raw",
        actualWrappedDK,
        wrappingKey,
        {
            name: "AES-GCM",
            iv: iv,
        },
        {
            name: "AES-GCM",
            length: 256,
        },
        true, // extractable (needed for re-wrapping when sharing)
        ["encrypt", "decrypt"]
    );

    return DK;
}

/**
 * Clear all stored keys (for testing or logout)
 */
export async function clearStoredKeys(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
}
