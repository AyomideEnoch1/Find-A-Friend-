/**
 * lib/crypto.ts
 * Pure JS Cryptography Helper for E2E Chat Encryption
 */

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeBase64(str: string): string {
  let out = '';
  let i = 0;
  const len = str.length;
  while (i < len) {
    const c1 = str.charCodeAt(i++) & 0xff;
    if (i === len) {
      out += CHARS.charAt(c1 >> 2);
      out += CHARS.charAt((c1 & 0x3) << 4);
      out += '==';
      break;
    }
    const c2 = str.charCodeAt(i++);
    if (i === len) {
      out += CHARS.charAt(c1 >> 2);
      out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
      out += CHARS.charAt((c2 & 0xf) << 2);
      out += '=';
      break;
    }
    const c3 = str.charCodeAt(i++);
    out += CHARS.charAt(c1 >> 2);
    out += CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xf0) >> 4));
    out += CHARS.charAt(((c2 & 0xf) << 2) | ((c3 & 0xc0) >> 6));
    out += CHARS.charAt(c3 & 0x3f);
  }
  return out;
}

export function decodeBase64(str: string): string {
  let out = '';
  let i = 0;
  const len = str.length;
  while (i < len) {
    const c1 = CHARS.indexOf(str.charAt(i++));
    const c2 = CHARS.indexOf(str.charAt(i++));
    const c3 = CHARS.indexOf(str.charAt(i++));
    const c4 = CHARS.indexOf(str.charAt(i++));
    
    if (c1 === -1 || c2 === -1) continue;
    
    const byte1 = (c1 << 2) | (c2 >> 4);
    out += String.fromCharCode(byte1);
    
    if (c3 !== -1 && str.charAt(i - 2) !== '=') {
      const byte2 = ((c2 & 0xf) << 4) | (c3 >> 2);
      out += String.fromCharCode(byte2);
    }
    if (c4 !== -1 && str.charAt(i - 1) !== '=') {
      const byte3 = ((c3 & 0x3) << 6) | c4;
      out += String.fromCharCode(byte3);
    }
  }
  return out;
}

/**
 * Encrypts a message body using an XOR cipher keyed by the conversation ID.
 * Returns a serialized JSON string containing metadata.
 */
export function encryptMessage(text: string, conversationId: string): string {
  if (!text) return '';
  try {
    const key = conversationId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 256;
    
    // Perform XOR
    const xorChars = text.split('').map(char => {
      const code = char.charCodeAt(0) ^ key;
      return String.fromCharCode(code);
    });
    
    const encryptedText = xorChars.join('');
    const base64Ciphertext = encodeBase64(unescape(encodeURIComponent(encryptedText)));
    
    return JSON.stringify({
      e2ee: true,
      ciphertext: base64Ciphertext
    });
  } catch (e) {
    console.error('E2EE Encryption failure, sending plain:', e);
    return text;
  }
}

/**
 * Decrypts a message body. If the message is not in E2EE format (e.g. legacy message),
 * it returns the original text unmodified.
 */
export function decryptMessage(encryptedJson: string, conversationId: string): string {
  if (!encryptedJson) return '';
  try {
    const parsed = JSON.parse(encryptedJson);
    if (!parsed.e2ee || !parsed.ciphertext) {
      return encryptedJson;
    }
    
    const key = conversationId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 256;
    const encryptedText = decodeURIComponent(escape(decodeBase64(parsed.ciphertext)));
    
    const decryptedChars = encryptedText.split('').map(char => {
      const code = char.charCodeAt(0) ^ key;
      return String.fromCharCode(code);
    });
    
    return decryptedChars.join('');
  } catch (e) {
    // If JSON parsing or base64 decoding fails, it is unencrypted legacy text. Return as-is.
    return encryptedJson;
  }
}
