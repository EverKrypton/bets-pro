import crypto from 'crypto';
import { cookies } from 'next/headers';
import User from '@/models/User';

export const SESSION_COOKIE_NAME = 'fcc_session';

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const tokenHash = hashSessionToken(token);
  return User.findOne({ sessionTokenHash: tokenHash });
}
