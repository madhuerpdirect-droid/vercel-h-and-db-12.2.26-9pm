
/**
 * Simple obfuscation service for Secure Magic Links
 * Uses Base64 + XOR with a secret key from environment variables
 */
import { db } from '../db';

const SECRET_KEY = process.env.API_KEY || 'bhadrakali-default-salt';

export interface AuthToken {
  u: string; // memberId
  p: string; // password (last 4 digits)
  e: number; // expiry timestamp
}

/**
 * Encrypts auth data into an obfuscated string
 */
export function encryptToken(data: AuthToken): string {
  const json = JSON.stringify(data);
  let result = '';
  for (let i = 0; i < json.length; i++) {
    result += String.fromCharCode(json.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
  }
  return btoa(result).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // URL-safe base64
}

/**
 * Decrypts an obfuscated string back to auth data
 */
export function decryptToken(token: string): AuthToken | null {
  try {
    // Revert URL-safe base64
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    
    const xored = atob(base64);
    let result = '';
    for (let i = 0; i < xored.length; i++) {
      result += String.fromCharCode(xored.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
    }
    return JSON.parse(result) as AuthToken;
  } catch (e) {
    console.error("Token decryption failed", e);
    return null;
  }
}

/**
 * Generates a magic link for a specific member
 */
export function generateMagicLink(memberId: string, mobile: string): string {
  const last4 = mobile.replace(/\D/g, '').slice(-4);
  const expiry = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days validity
  
  const token = encryptToken({ u: memberId, p: last4, e: expiry });
  
  // Prioritize recorded Hosted App URL from Masters
  const baseUrl = db.getSettings().appUrl || window.location.origin;
  
  return `${baseUrl}/?loginToken=${token}`;
}
