import { describe, expect, it } from 'vitest';
import { changePasswordSchema, passwordChecks, signupSchema } from './validation.js';

const valid = {
  name: 'Jonathan Whitfield Barnes',
  email: 'jon@example.com',
  address: '12 Elm Street',
  password: 'Strong#Pass1',
};

const firstError = (schema, input) => schema.safeParse(input).error?.issues[0];

describe('signupSchema', () => {
  it('accepts a valid payload', () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ['name under 20', { name: 'x'.repeat(19) }, 'name'],
    ['name over 60', { name: 'x'.repeat(61) }, 'name'],
    ['address over 400', { address: 'a'.repeat(401) }, 'address'],
    ['invalid email', { email: 'nope' }, 'email'],
    ['password under 8', { password: 'Ab#1' }, 'password'],
    ['password over 16', { password: 'Abcdefgh#12345678' }, 'password'],
    ['password without uppercase', { password: 'lowercase#1' }, 'password'],
    ['password without special char', { password: 'NoSpecial123' }, 'password'],
  ])('rejects %s', (_label, patch, field) => {
    const issue = firstError(signupSchema, { ...valid, ...patch });
    expect(issue?.path[0]).toBe(field);
  });

  it('accepts the exact boundaries', () => {
    expect(signupSchema.safeParse({ ...valid, name: 'x'.repeat(20), password: 'Abcdef#1' }).success).toBe(true);
    expect(signupSchema.safeParse({ ...valid, name: 'x'.repeat(60), password: 'Abcdefgh#1234567' }).success).toBe(true);
  });
});

describe('changePasswordSchema', () => {
  const base = { currentPassword: 'Old#Pass123', newPassword: 'New#Pass123', confirm: 'New#Pass123' };

  it('accepts matching, different passwords', () => {
    expect(changePasswordSchema.safeParse(base).success).toBe(true);
  });

  it('flags a mismatched confirmation', () => {
    expect(firstError(changePasswordSchema, { ...base, confirm: 'Other#Pass1' })?.path[0]).toBe('confirm');
  });

  it('flags reuse of the current password', () => {
    const same = { currentPassword: 'Same#Pass123', newPassword: 'Same#Pass123', confirm: 'Same#Pass123' };
    expect(firstError(changePasswordSchema, same)?.path[0]).toBe('newPassword');
  });
});

describe('passwordChecks', () => {
  it('reports each rule independently', () => {
    expect(passwordChecks('abc').map((c) => c.ok)).toEqual([false, false, false]);
    expect(passwordChecks('Abcdefg#').map((c) => c.ok)).toEqual([true, true, true]);
    expect(passwordChecks('abcdefgh').map((c) => c.ok)).toEqual([true, false, false]);
  });
});
