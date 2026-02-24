import { createClient } from '@supabase/supabase-js';

let client;

export function getSupabase() {
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return client;
}

/**
 * Obtiene todos los contactados previos para los cursos objetivo.
 * Retorna Set de "email|course_id" para lookup O(1).
 */
export async function getContactadosSet(courseIds) {
  const { data, error } = await getSupabase()
    .from('renovaciones_contactados')
    .select('email, course_id')
    .in('course_id', courseIds);

  if (error) throw error;

  const set = new Set();
  for (const row of data || []) {
    set.add(`${row.email.toLowerCase()}|${row.course_id}`);
  }
  return set;
}

/**
 * Upsert de contactado (anti-spam).
 * Si ya existe email+course_id, actualiza en vez de fallar.
 */
export async function upsertContactado(record) {
  const { data, error } = await getSupabase()
    .from('renovaciones_contactados')
    .upsert(record, { onConflict: 'email,course_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}
