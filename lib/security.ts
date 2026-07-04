/**
 * lib/security.ts
 * Core security helper routines for inputs, passwords, and local lockout checks
 */

/**
 * Validates the complexity of a password.
 * Rules: min 8 characters, at least one uppercase, one lowercase, one number, and one special character.
 * Returns null if the password is strong, or an error message if it fails checks.
 */
export function validatePasswordStrength(password: string): string | null {
  if (!password) {
    return 'Password cannot be empty.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number.';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !@#$%).';
  }
  return null;
}

/**
 * Sanitizes user inputs to prevent Cross-Site Scripting (XSS) by stripping HTML/script tags.
 */
export function sanitizeInput(text: string): string {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '') // Strip standard HTML tags
    .replace(/javascript:/gi, '') // Prevent javascript: links
    .trim();
}

// ── Local Brute-Force Rate Limiting (Lockout) ──

let failedLoginAttempts = 0;
let lockoutTimestamp = 0;

export function recordFailedLogin(): number {
  failedLoginAttempts++;
  if (failedLoginAttempts >= 5) {
    lockoutTimestamp = Date.now() + 30000; // 30 second lockout duration
  }
  return failedLoginAttempts;
}

export function resetFailedLogins() {
  failedLoginAttempts = 0;
  lockoutTimestamp = 0;
}

export function getLockoutRemaining(): number {
  if (lockoutTimestamp === 0) return 0;
  const remaining = Math.max(0, Math.ceil((lockoutTimestamp - Date.now()) / 1000));
  if (remaining === 0) {
    resetFailedLogins();
  }
  return remaining;
}
