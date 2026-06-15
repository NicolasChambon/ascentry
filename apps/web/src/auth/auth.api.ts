import { apiFetch } from '@/lib/api';
import { LoginInput, PublicUser, publicUserSchema, RegisterInput } from '@ascentry/shared';

export async function login(input: LoginInput): Promise<PublicUser> {
  const data = await apiFetch('/auth/login', { method: 'POST', body: input });
  return publicUserSchema.parse(data);
}

export async function register(input: RegisterInput): Promise<PublicUser> {
  const data = await apiFetch('/auth/register', { method: 'POST', body: input });
  return publicUserSchema.parse(data);
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}
