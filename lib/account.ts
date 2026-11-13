import { db } from './db';
import { getSupabase } from './supabase';
import { clearCachedUser } from './auth';

/** Permanently deletes the cloud account (needs internet) and wipes local data. Play Store requires this. */
export async function deleteAccount() {
  const sb = getSupabase();
  if (!sb) throw new Error('Not configured');
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw error;
  await Promise.all([db.expenses.clear(), db.cards.clear(), db.creditExpenses.clear()]);
  try { await sb.auth.signOut({ scope: 'local' }); } catch {}
  clearCachedUser();
}
