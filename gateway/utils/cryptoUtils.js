/**
 * ==========================================
 * ROYAL CASINO - CRYPTO UTILITIES
 * ==========================================
 * This file handles AES-256-CBC, BCrypt hashing,
 * and RSA-2048 encryption/decryption.
 */

const crypto = require('crypto');
// Use bcryptjs to avoid native build issues (node-gyp) on some environments.
// bcryptjs is compatible with existing bcrypt hashes.
const bcrypt = require('bcryptjs');

// NOTE: read keys from env inside functions so scripts that load dotenv later still work.

/**
 * RSA Decryption (Server-side)
 * Uses the Private Key to decrypt data sent from the Frontend.
 * @param {string} encryptedData - Base64 encoded encrypted string.
 * @returns {string|null} - Decrypted cleartext or null if failed.
 */
const decryptRSA = (encryptedData) => {
    try {
        const privateKeyB64 = process.env.RSA_PRIVATE_KEY_BASE64;
        if (!privateKeyB64) return null;
        const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf-8');
        const buffer = Buffer.from(encryptedData, 'base64');
        const decrypted = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            buffer
        );
        return decrypted.toString('utf-8');
    } catch (error) {
        console.error('RSA Decryption Error:', error.message);
        return null;
    }
};

/**
 * RSA Encryption (Simulating Frontend/Client-side)
 * Uses the Public Key to encrypt sensitive data.
 * @param {string} data - Plain text to encrypt.
 * @returns {string|null} - Base64 encoded encrypted string.
 */
const encryptRSA = (data) => {
    try {
        const publicKeyB64 = process.env.RSA_PUBLIC_KEY_BASE64;
        if (!publicKeyB64) return null;
        const publicKey = Buffer.from(publicKeyB64, 'base64').toString('utf-8');
        const buffer = Buffer.from(data, 'utf-8');
        const encrypted = crypto.publicEncrypt(
            {
                key: publicKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256",
            },
            buffer
        );
        return encrypted.toString('base64');
    } catch (error) {
        console.error('RSA Encryption Error:', error.message);
        return null;
    }
};

/**
 * Password Hashing (BCrypt)
 * @param {string} password - Raw password.
 * @returns {Promise<string>} - Hashed password with pepper.
 */
const hashPassword = async (password) => {
    const pepper = process.env.PASSWORD_PEPPER || '';
    const saltRounds = parseInt(process.env.HASH_SALT_ROUNDS) || 12;
    return await bcrypt.hash(password + pepper, saltRounds);
};

// Export all functions
module.exports = {
    decryptRSA,
    encryptRSA,
    hashPassword
};
