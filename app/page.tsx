'use client';
import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Session } from '@supabase/supabase-js';
import { db, ExpenseType } from '@/lib/db';
import { getSupabase } from '@/lib/supabase';
import { loadCachedUser, cacheUser, clearCachedUser, CachedUser } from '@/lib/auth';
import { alertsGranted, enableAlerts, scheduleDueReminders, testAlert } from '@/lib/notifications';
import { useSyncEngine } from '@/hooks/useSyncEngine';
import ThemeToggle from '@/components/ThemeToggle';
import { deleteAccount } from '@/lib/account';
import ExpenseSection from '@/components/ExpenseSection';
import CreditSection from '@/components/CreditSection';
import ReportView from '@/components/ReportView';

type Sub = ExpenseType | 'credit';

const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL;

function Setup({ onLocal }: { onLocal: () => void }) {
  const dev = process.env.NODE_ENV !== 'production';
  return (
    <div className="app">
      <div className="actions"><ThemeToggle /></div>
      <h2>Login needs Supabase keys</h2>
      <div className="panel">
        <p className="notice">Create a file named <strong>.env.local</strong> in the project folder with:</p>
        <p className="notice" style={{ wordBreak: 'break-all' }}>NEXT_PUBLIC_SUPABASE_URL=…<br />NEXT_PUBLIC_SUPABASE_ANON_KEY=…</p>
        <p className="notice">Then stop and restart <strong>npm run dev</strong> (keys are read at build time). See README for the full steps.</p>
        {dev && <button className="btn" onClick={onLocal}>Continue without login (development only)</button>}
      </div>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const sb = getSupabase()!;

  async function go(mode: 'in' | 'up') {
    setMsg('');
    if (!navigator.onLine) return setMsg('You are offline. Connect to the internet to sign in the first time.');
    const { error } = mode === 'in'
      ? await sb.auth.signInWithPassword({ email, password })
      : await sb.auth.signUp({ email, password });
    if (error) setMsg(error.message === 'Failed to fetch' ? 'Could not reach the server. Check your connection.' : error.message);
    else if (mode === 'up') setMsg('Account created. Check your email to confirm, then sign in.');
    else onDone();
  }

  return (
    <div className="app">
      <div className="actions"><ThemeToggle /></div>
      <h2>Sign in</h2>
      <div className="panel">
        <label className="lbl">Email
          <input className="field" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="lbl">Password
          <input className="field" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {msg && <p className="err" role="alert">{msg}</p>}
        <button className="btn primary" onClick={() => go('in')}>Sign in</button>
        <button className="btn" onClick={() => go('up')}>Create account</button>
      </div>
    </div>
  );
}

export default function Page() {
  const sb = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!sb);
  const [view, setView] = useState<'input' | 'output'>('input');
  const [sub, setSub] = useState<Sub>('normal');
  const [alertsOn, setAlertsOn] = useState(false);
  const [note, setNote] = useState('');
  const [devLocal, setDevLocal] = useState(false);
  const [offlineUser, setOfflineUser] = useState<CachedUser | null>(null);

  useEffect(() => {
    if (!sb) return;
    let alive = true;
    (async () => {
      try {
        const { data } = await sb.auth.getSession();
        if (!alive) return;
        if (data.session) {
          setSession(data.session);
          cacheUser({ id: data.session.user.id, email: data.session.user.email ?? '' });
        } else if (!navigator.onLine) {
          setOfflineUser(loadCachedUser()); // offline: trust the last signed-in user
        }
      } catch {
        if (alive) setOfflineUser(loadCachedUser());
      }
      if (alive) setReady(true);
    })();
    const { data } = sb.auth.onAuthStateChange((event, s) => {
      if (s) {
        setSession(s);
        setOfflineUser(null);
        cacheUser({ id: s.user.id, email: s.user.email ?? '' });
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
      } // a null session from a failed offline refresh must not log the user out
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [sb]);

  async function logout() {
    try { await sb?.auth.signOut({ scope: 'local' }); } catch {}
    clearCachedUser(); // also works offline: removes the stored session
    setSession(null);
    setOfflineUser(null);
  }

  const signedIn = sb ? !!session || !!offlineUser : devLocal;
  const { online, pending } = useSyncEngine(!!sb && !!session);

  // Keep due-date reminders in step with the saved cards.
  const cards = useLiveQuery(() => db.cards.filter((c) => !c.deleted).toArray(), [], []);
  useEffect(() => { alertsGranted().then(setAlertsOn); }, []);
  useEffect(() => { scheduleDueReminders(cards); }, [cards, alertsOn]);

  async function onAlerts() {
    if (!Capacitor.isNativePlatform()) return setNote('Alerts work in the installed Android app, not in the browser.');
    const ok = await enableAlerts();
    setAlertsOn(ok);
    setNote(ok ? 'Alerts enabled. Reminders go out 2 days before and on each due date at 9:00.' : 'Permission was not granted. Turn on notifications for this app in Android Settings.');
  }
  async function onTest() {
    setNote((await testAlert()) ? 'Test alert coming in about 5 seconds…' : 'Could not schedule the test alert.');
  }
  async function removeAccount() {
    if (!online) return alert('Connect to the internet to delete your account.');
    if (!confirm('Permanently delete your account and all your data? This cannot be undone.')) return;
    try { await deleteAccount(); setSession(null); setOfflineUser(null); }
    catch { alert('Could not delete the account. Please try again.'); }
  }

  if (!ready) return null;
  if (!signedIn) return sb ? <Login onDone={() => {}} /> : <Setup onLocal={() => setDevLocal(true)} />;

  const email = session?.user.email ?? offlineUser?.email ?? 'Local mode';
  const subs: [Sub, string][] = [['normal', 'Normal'], ['debit', 'Debit'], ['credit', 'Credit Cards']];

  return (
    <div className="app">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="profile">
          <div className="avatar" aria-hidden>👤</div>
          <div style={{ minWidth: 0 }}>
            <div className="email">{email}</div>
            <div className={`status ${online ? '' : 'off'}`}>
              {!online ? 'Offline • saving on this device' : !sb ? 'Saved on this device' : pending > 0 ? `Syncing ${pending} change${pending > 1 ? 's' : ''}…` : 'All changes synced'}
            </div>
          </div>
        </div>
        <div className="actions">
          <button className="btn small" onClick={onAlerts}>🔔 {alertsOn ? 'Alerts on' : 'Enable Alerts'}</button>
          {alertsOn && <button className="btn small" onClick={onTest}>Test</button>}
          <ThemeToggle />
          {sb && <button className="btn small" onClick={logout}>Logout</button>}
        </div>
        {note && <p className="notice" role="status">{note}</p>}
      </header>

      <nav className="tabs" aria-label="Primary">
        <button className={`tab ${view === 'input' ? 'on' : ''}`} onClick={() => setView('input')}>📥 Input Expenses</button>
        <button className={`tab ${view === 'output' ? 'on' : ''}`} onClick={() => setView('output')}>📈 Output &amp; Reports</button>
      </nav>

      {view === 'input' ? (
        <>
          <div className="pills" role="tablist">
            {subs.map(([k, l]) => (
              <button key={k} role="tab" aria-selected={sub === k} className={`pill ${sub === k ? 'on' : ''}`} onClick={() => setSub(k)}>{l}</button>
            ))}
          </div>
          {sub === 'credit' ? <CreditSection /> : <ExpenseSection key={sub} type={sub} />}
        </>
      ) : (
        <ReportView />
      )}

      <footer className="foot">
        Client Demo App • Warm Sand &amp; Amber Theme
        <div className="links">
          {PRIVACY_URL && <a className="linkbtn" href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>}
          {session && <button className="linkbtn" onClick={removeAccount}>Delete account</button>}
        </div>
      </footer>
    </div>
  );
}
