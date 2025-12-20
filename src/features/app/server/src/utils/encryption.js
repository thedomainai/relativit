const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} text - The plaintext to encrypt
 * @param {string} secretKey - 32-byte secret key (or will be derived from it)
 * @returns {{ encrypted: string, iv: string }} - The encrypted data and IV
 */
function encrypt(text, secretKey) {
  // Ensure key is 32 bytes
  const key = crypto.createHash('sha256').update(secretKey).digest();
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Encrypt
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get auth tag
  const authTag = cipher.getAuthTag();
  
  // Combine encrypted data and auth tag
  const combined = encrypted + authTag.toString('hex');
  
  return {
    encrypted: combined,
    iv: iv.toString('hex')
  };
}

/**
 * Decrypt a string using AES-256-GCM
 * @param {string} encryptedData - The encrypted data (with auth tag appended)
 * @param {string} ivHex - The IV as hex string
 * @param {string} secretKey - The same secret key used for encryption
 * @returns {string} - The decrypted plaintext
 */
function decrypt(encryptedData, ivHex, secretKey) {
  // Ensure key is 32 bytes
  const key = crypto.createHash('sha256').update(secretKey).digest();
  
  // Convert IV from hex
  const iv = Buffer.from(ivHex, 'hex');
  
  // Separate encrypted data and auth tag
  const authTagHex = encryptedData.slice(-AUTH_TAG_LENGTH * 2);
  const encrypted = encryptedData.slice(0, -AUTH_TAG_LENGTH * 2);
  const authTag = Buffer.from(authTagHex, 'hex');
  
  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a secure random token
 * @param {number} length - Length in bytes
 * @returns {string} - Random token as hex string
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a 6-digit verification code
 * Demo mode: always use fixed code for easier testing.
 * NOTE: For real production use, replace this with a random generator.
 */
function generateVerificationCode() {
  // Demo mode: fixed code
  if (process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'development') {
    return '677485';
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash a password using bcrypt
 */
function hashPassword(password, saltRounds = 10) {
  const bcrypt = require('bcryptjs');
  return bcrypt.hashSync(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
function verifyPassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compareSync(password, hash);
}

module.exports = {
  encrypt,
  decrypt,
  generateSecureToken,
  generateVerificationCode,
  hashPassword,
  verifyPassword
};
