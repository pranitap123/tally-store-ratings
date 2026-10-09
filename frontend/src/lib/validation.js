import { z } from 'zod';

// Mirrors backend/src/validation/fields.js — the API remains the source of truth.
export const nameField = z
  .string()
  .trim()
  .min(20, 'Name must be at least 20 characters')
  .max(60, 'Name must be at most 60 characters');

export const emailField = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');

export const addressField = z
  .string()
  .trim()
  .min(1, 'Address is required')
  .max(400, 'Address must be at most 400 characters');

export const passwordField = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(16, 'Password must be at most 16 characters')
  .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs at least one special character');

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z.object({
  name: nameField,
  email: emailField,
  address: addressField,
  password: passwordField,
});

export const createUserSchema = signupSchema.extend({
  role: z.enum(['USER', 'ADMIN', 'STORE_OWNER']),
});

export const createStoreSchema = z.object({
  name: nameField,
  email: emailField,
  address: addressField,
  ownerId: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordField,
    confirm: z.string().min(1, 'Please confirm the new password'),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current one',
  });

/** Checklist used by the live password meter. */
export const passwordChecks = (pw = '') => [
  { label: '8–16 characters', ok: pw.length >= 8 && pw.length <= 16 },
  { label: 'One uppercase letter', ok: /[A-Z]/.test(pw) },
  { label: 'One special character', ok: /[^A-Za-z0-9]/.test(pw) },
];
