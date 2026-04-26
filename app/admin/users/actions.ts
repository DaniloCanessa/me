'use server';

import { getSupabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function createUser(formData: FormData) {
  const email    = (formData.get('email') as string).toLowerCase().trim();
  const name     = formData.get('name') as string;
  const role     = formData.get('role') as string;
  const password = formData.get('password') as string;

  if (!email || !name || !password) return { error: 'Campos requeridos incompletos' };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' };

  const password_hash = await bcrypt.hash(password, 12);
  const db = getSupabaseAdmin();

  const { error } = await db.from('users').insert({ email, name, role, password_hash });
  if (error) return { error: error.message.includes('unique') ? 'El email ya está registrado' : error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}

export async function updateUser(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const role = formData.get('role') as string;
  const db   = getSupabaseAdmin();

  const { error } = await db
    .from('users')
    .update({ name, role, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function resetPassword(id: string, formData: FormData) {
  const password = formData.get('password') as string;
  if (!password || password.length < 8) return { error: 'Mínimo 8 caracteres' };

  const password_hash = await bcrypt.hash(password, 12);
  const db = getSupabaseAdmin();

  const { error } = await db
    .from('users')
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function toggleUserActive(id: string, isActive: boolean) {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from('users')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

export async function deleteUser(id: string) {
  const db = getSupabaseAdmin();

  // Evitar eliminar el último admin
  const { data: admins } = await db
    .from('users')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  const isLastAdmin = (admins ?? []).length === 1 && (admins ?? [])[0]?.id === id;
  if (isLastAdmin) return { error: 'No puedes eliminar el único administrador activo' };

  const { error } = await db.from('users').delete().eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/admin/users');
  return { ok: true };
}
