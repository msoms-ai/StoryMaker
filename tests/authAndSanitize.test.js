import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';

// Replicate user sanitization logic from server.js
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, otpCode, otpExpiresAt, pendingEmailOtp, pendingOtpExpiresAt, resetOtp, resetOtpExpiresAt, ...safe } = user;
  return safe;
}

test('Authentication & Data Protection: User Sanitization', async (t) => {
  await t.test('strips passwordHash, OTP codes, and reset tokens from user response', () => {
    const rawDbUser = {
      id: 'usr_123',
      email: 'child@qisas.com',
      firstName: 'Ahmad',
      lastName: 'Ali',
      role: 'Student',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      otpCode: '894215',
      otpExpiresAt: Date.now() + 600000,
      resetOtp: '112233',
      resetOtpExpiresAt: Date.now() + 300000,
      avatarUrl: '/USERS/usr_123/avatar.png'
    };

    const sanitized = sanitizeUser(rawDbUser);

    assert.strictEqual(sanitized.id, 'usr_123');
    assert.strictEqual(sanitized.email, 'child@qisas.com');
    assert.strictEqual(sanitized.firstName, 'Ahmad');
    assert.strictEqual(sanitized.avatarUrl, '/USERS/usr_123/avatar.png');

    // Crucial security guarantees: sensitive secrets MUST be omitted
    assert.strictEqual(sanitized.passwordHash, undefined, 'passwordHash must never be exposed');
    assert.strictEqual(sanitized.otpCode, undefined, 'otpCode must never be exposed');
    assert.strictEqual(sanitized.resetOtp, undefined, 'resetOtp must never be exposed');
    assert.strictEqual(sanitized.otpExpiresAt, undefined);
    assert.strictEqual(sanitized.resetOtpExpiresAt, undefined);
  });

  await t.test('verifies bcrypt salt and hashing strength', async () => {
    const plaintext = 'SecretP@ssw0rd!2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plaintext, salt);

    assert.ok(hash.startsWith('$2'), 'Bcrypt hash should have valid format prefix');
    const isMatch = await bcrypt.compare(plaintext, hash);
    assert.ok(isMatch, 'Bcrypt compare should confirm match');

    const isWrongMatch = await bcrypt.compare('WrongPassword', hash);
    assert.strictEqual(isWrongMatch, false, 'Wrong password should fail');
  });
});
