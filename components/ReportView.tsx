'use client';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr } from '@/lib/db';
import { formatINR } from '@/lib/format';

const sum = (xs: { amount: number }[]) => xs.reduce((t, x) => t + x.amount, 0);

function status(due: string) {
  const today = todayStr();
  if (due < today) return { cls: 'late', text: '⚠️ Overdue' };
  const days = Math.round((new Date(due).getTime() - new Date(today).getTime()) / 86400000);
  if (days <= 3) return { cls: 'soon', text: '⏰ Due soon' };
  return { cls: 'ok', text: '✅ On Track' };
}

export default function ReportView() {
  const data = useLiveQuery(async () => {
    const [expenses, cards, credit] = await Promise.all([
      db.expenses.filter((e) => !e.deleted).toArray(),
      db.cards.filter((c) => !c.deleted).toArray(),
      db.creditExpenses.filter((c) => !c.deleted).toArray(),
    ]);
    return { expenses, cards, credit };
  }, []);
  if (!data) return null;

  const normal = sum(data.expenses.filter((e) => e.type === 'normal'));
  const debit = sum(data.expenses.filter((e) => e.type === 'debit'));
  const credit = sum(data.credit);

  return (
    <>
      <div className="total">
        <div className="k">Total Spending</div>
        <div className="v">{formatINR(normal + debit + credit)}</div>
      </div>
      <div className="panel">
        <div className="break" style={{ borderTop: 0, paddingTop: 0 }}><span>Normal Expenses</span><span className="amt">{formatINR(normal)}</span></div>
        <div className="break"><span>Debit Card Expenses</span><span className="amt">{formatINR(debit)}</span></div>
        <div className="break" style={{ paddingBottom: 0 }}><span>Credit Card Expenses</span><span className="amt">{formatINR(credit)}</span></div>
      </div>

      <h2>🔔 Due Date Status &amp; Reminders</h2>
      <div className="panel">
        {data.cards.length === 0 && <p className="empty">Add a credit card to see its due date here.</p>}
        {data.cards.map((c) => {
          const spent = sum(data.credit.filter((x) => x.cardId === c.id && x.date >= c.cycleStart && x.date <= c.cycleEnd));
          const s = status(c.dueDate);
          return (
            <div className="cc" key={c.id}>
              <div className="top"><h3>{c.name}</h3><span className="amt">{formatINR(spent)}</span></div>
              <div className="s" style={{ color: 'var(--sand-dim)', fontSize: '.85rem' }}>Cycle: {c.cycleStart} to {c.cycleEnd}</div>
              <div className="top">
                <span>Due Date: <strong>{c.dueDate}</strong></span>
                <span className={`badge ${s.cls}`}>{s.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
