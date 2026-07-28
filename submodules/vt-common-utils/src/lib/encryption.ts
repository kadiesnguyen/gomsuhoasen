import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const DEFAULT_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_DERIVED_KEY_BYTES = 32;
const ENCRYPTION_IV_RANDOM_BYTES = 16;
const ENCRYPTION_MASK_VISIBLE_PREFIX_LENGTH = 3;
const ENCRYPTION_MASK_VISIBLE_SUFFIX_LENGTH = 4;
const ENCRYPTION_MASK_MINIMUM_PLAIN_LENGTH = 8;
const ENCRYPTION_MASK_SHORT_SECRET = '****';
const ENCRYPTION_MASK_SEPARATOR = '...';

/**
 * Shared encryption utilities for secret management.
 *
 * AES-256-CBC with scrypt key derivation.
 * Format: `<iv_hex>:<ciphertext_hex>`
 *
 * Extracted from zalominiapp core — refactored to accept masterKey as
 * a required constructor parameter (no app-specific env key coupling).
 *
 * @example
 * ```ts
 * const enc = new EncryptionUtil(process.env['SECRET_KEY']!);
 * const cipher = enc.encrypt('sk-abc123');
 * const plain  = enc.decrypt(cipher);
 * const masked = enc.mask(cipher); // "sk-...c123"
 * ```
 */
export class EncryptionUtil {
  private readonly derivedKey: Buffer;

  constructor(
    masterKey: string,
    private readonly algorithm: string = DEFAULT_ALGORITHM,
  ) {
    if (!masterKey || typeof masterKey !== 'string' || masterKey.trim().length === 0) {
      throw new Error('EncryptionUtil requires a non-empty master key');
    }

    this.derivedKey = scryptSync(masterKey.trim(), 'salt', ENCRYPTION_DERIVED_KEY_BYTES);
  }

  /** Encrypt plaintext → `iv_hex:ciphertext_hex` */
  encrypt(plaintext: string): string {
    const iv = randomBytes(ENCRYPTION_IV_RANDOM_BYTES);
    const cipher = createCipheriv(this.algorithm, this.derivedKey, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /** Decrypt `iv_hex:ciphertext_hex` → plaintext */
  decrypt(ciphertext: string): string {
    const [ivHex, encrypted] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(this.algorithm, this.derivedKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /** Decrypt then mask: show first 3 + last 4 chars */
  mask(ciphertext: string): string {
    try {
      const plain = this.decrypt(ciphertext);
      if (plain.length <= ENCRYPTION_MASK_MINIMUM_PLAIN_LENGTH) return ENCRYPTION_MASK_SHORT_SECRET;
      return plain.slice(0, ENCRYPTION_MASK_VISIBLE_PREFIX_LENGTH) + ENCRYPTION_MASK_SEPARATOR + plain.slice(-ENCRYPTION_MASK_VISIBLE_SUFFIX_LENGTH);
    } catch {
      return ENCRYPTION_MASK_SHORT_SECRET;
    }
  }
}
