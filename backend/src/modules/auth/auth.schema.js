import { z } from 'zod';
import { name, email, address, password } from '../../validation/fields.js';

export const signupBody = z.object({ name, email, address, password }).strict();

export const loginBody = z
  .object({
    email: z.string().trim().min(1, 'Email is required'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
  })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must differ from the current one',
  });
