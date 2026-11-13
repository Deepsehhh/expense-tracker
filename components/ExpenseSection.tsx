'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, ExpenseType, newId, removeExpense, saveExpense, todayStr } from '@/lib/db';
import { formatINR } from '@/lib/format';
import { Row } from './Rows';

const CATEGORIES = ['General', 'Food', 'Travel', 'Bills'];
const blank = () => ({ title: '', amount: '', category: 'General', date: todayStr() });

export default function ExpenseSection({ type }: { type: ExpenseType }) {
  const label = type === 'normal' ? 'Normal' : 'Debit';
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const items = useLiveQuery(
    async () => (await db.expenses.where('type').equals(type).filter((e) => !e.deleted).toArray())
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt),
    [type],
    [],
  );

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    const amount = parseFloat(form.amount);
    if (!form.title.trim()) return setError('Enter a title.');
    if (!(amount > 0)) return setError('Enter an amount greater than 0.');
    setError('');
    await saveExpense({ id: editId ?? newId(), type, title: form.title.trim(), amount, category: form.category, date: form.date || todayStr() });
    setForm(blank());
    setEditId(null);
  }

  return (
    <>
      <h2>{editId ? `Edit ${label} Expense` : `Add ${label} Expense`}</h2>
      <div className="panel">
        <label className="lbl">Title
          <input className="field" placeholder="Groceries" value={form.title} onChange={set('title')} />
        </label>
        <div className="grid2">
          <label className="lbl">Amount (₹)
            <input className="field" inputMode="decimal" type="number" min="0" placeholder="0" value={form.amount} onChange={set('amount')} />
          </label>
          <label className="lbl">Category
            <select className="field" value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="lbl">Date
          <input className="field" type="date" value={form.date} onChange={set('date')} />
        </label>
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" onClick={submit}>{editId ? `Update ${label} Expense` : `Save ${label} Expense`}</button>
        {editId && <button className="btn ghost" onClick={() => { setEditId(null); setForm(blank()); setError(''); }}>Cancel edit</button>}
      </div>

      <div className="panel">
        {items.length === 0 && <p className="empty">No {label.toLowerCase()} expenses yet. Add one above.</p>}
        <div className="list">
          {items.map((e) => (
            <Row
              key={e.id}
              title={e.title}
              sub={`${e.category} • ${e.date}`}
              amount={formatINR(e.amount)}
              onEdit={() => { setEditId(e.id); setForm({ title: e.title, amount: String(e.amount), category: e.category, date: e.date }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              onDelete={() => { if (confirm(`Delete "${e.title}"?`)) removeExpense(e.id); }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
