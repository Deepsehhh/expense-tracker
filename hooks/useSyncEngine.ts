'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Table } from 'dexie';
import { db, pendingCount } from '@/lib/db';
import { getSupabase } from '@/lib/supabase';

type Row = { id: string; synced: 0 | 1; deleted: 0 | 1 };

async function push<T extends Row>(remote: string, table: Table<T, string>, toRow: (r: T) => Record<string, unknown>) {
  const sb = getSupabase()!;
  const rows = await table.where('synced').equals(0).toArray();
  for (const r of rows) {
    if (r.deleted) {
      const { error } = await sb.from(remote).delete().eq('id', r.id);
      if (!error) await table.delete(r.id);
    } else {
      const { error } = await sb.from(remote).upsert(toRow(r));
      if (!error) await table.update(r.id, { synced: 1 } as never);
    }
  }
}

export async function syncAll() {
  const sb = getSupabase();
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return;

  // Cards first so credit expenses never reference a missing card.
  await push('credit_cards', db.cards, (c) => ({
    id: c.id, user_id: uid, name: c.name, cycle_start: c.cycleStart || null,
    cycle_end: c.cycleEnd || null, due_date: c.dueDate || null, updated_at: c.updatedAt,
  }));
  await push('expenses', db.expenses, (e) => ({
    id: e.id, user_id: uid, type: e.type, title: e.title, amount: e.amount,
    category: e.category, date: e.date, updated_at: e.updatedAt,
  }));
  await push('credit_expenses', db.creditExpenses, (c) => ({
    id: c.id, user_id: uid, card_id: c.cardId, topic: c.topic, amount: c.amount,
    date: c.date, updated_at: c.updatedAt,
  }));
}

export function useSyncEngine(enabled: boolean) {
  const [online, setOnline] = useState(true);
  const running = useRef(false);
  const pending = useLiveQuery(() => pendingCount(), [], 0);

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      await syncAll();
    } catch (e) {
      console.warn('Sync failed, will retry when online', e);
    } finally {
      running.current = false;
    }
  }, []);

  // Connectivity: Capacitor Network on device, window events as the browser fallback.
  useEffect(() => {
    let remove: () => void = () => {};
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    const browser = () => {
      setOnline(navigator.onLine);
      window.addEventListener('online', onUp);
      window.addEventListener('offline', onDown);
      remove = () => {
        window.removeEventListener('online', onUp);
        window.removeEventListener('offline', onDown);
      };
    };
    if (Capacitor.isNativePlatform()) {
      let cancelled = false;
      Network.getStatus().then((s) => !cancelled && setOnline(s.connected)).catch(browser);
      Network.addListener('networkStatusChange', (s) => setOnline(s.connected))
        .then((h) => { if (cancelled) h.remove(); else remove = () => h.remove(); })
        .catch(browser);
      return () => { cancelled = true; remove(); };
    }
    browser();
    return () => remove();
  }, []);

  // Push whenever we are online and something is waiting.
  useEffect(() => {
    if (enabled && online && pending > 0) run();
  }, [enabled, online, pending, run]);

  return { online, pending };
}
