import { z } from 'zod';

// Rules from the brief. Keep in sync with frontend/src/lib/validation.js.
export const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(20, 'Name must be at least 20 characters')
  .max(60, 'Name must be at most 60 characters');

export const email = z
  .string({ error: 'Email is required' })
  .trim()
  .max(255, 'Email is too long')
  .email('Enter a valid email address')
  .transform((v) => v.toLowerCase());

export const address = z
  .string({ error: 'Address is required' })
  .trim()
  .min(1, 'Address is required')
  .max(400, 'Address must be at most 400 characters');

export const password = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(16, 'Password must be at most 16 characters')
  .regex(/[A-Z]/, 'Password needs at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password needs at least one special character');

export const roles = ['ADMIN', 'USER', 'STORE_OWNER'];
export const role = z.enum(roles);

export const uuid = z.string().uuid('Invalid id');
