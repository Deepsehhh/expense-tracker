'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, newId, removeCard, removeCreditExpense, saveCard, saveCreditExpense, todayStr } from '@/lib/db';
import { formatINR } from '@/lib/format';
import { Row } from './Rows';

const blankCard = { name: '', cycleStart: '', cycleEnd: '', dueDate: '' };

export default function CreditSection() {
  const cards = useLiveQuery(() => db.cards.filter((c) => !c.deleted).toArray(), [], []);
  const spends = useLiveQuery(
    async () => (await db.creditExpenses.filter((c) => !c.deleted).toArray()).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10),
    [],
    [],
  );
  const [card, setCard] = useState(blankCard);
  const [editId, setEditId] = useState<string | null>(null);
  const [cardErr, setCardErr] = useState('');
  const [exp, setExp] = useState({ cardId: '', topic: '', amount: '' });
  const [expErr, setExpErr] = useState('');

  const selectedCard = exp.cardId || cards[0]?.id || '';

  async function submitCard() {
    if (!card.name.trim()) return setCardErr('Enter a card name.');
    if (!card.cycleStart || !card.cycleEnd || !card.dueDate) return setCardErr('Pick the cycle start, cycle end and due date.');
    if (card.cycleEnd < card.cycleStart) return setCardErr('Cycle end must be after cycle start.');
    setCardErr('');
    await saveCard({ id: editId ?? newId(), ...card, name: card.name.trim() });
    setCard(blankCard);
    setEditId(null);
  }

  async function submitExpense() {
    const amount = parseFloat(exp.amount);
    if (!selectedCard) return setExpErr('Add a credit card first.');
    if (!exp.topic.trim()) return setExpErr('Enter a topic or note.');
    if (!(amount > 0)) return setExpErr('Enter an amount greater than 0.');
    setExpErr('');
    await saveCreditExpense({ id: newId(), cardId: selectedCard, topic: exp.topic.trim(), amount, date: todayStr() });
    setExp({ cardId: selectedCard, topic: '', amount: '' });
  }

  const setC = (k: keyof typeof card) => (e: React.ChangeEvent<HTMLInputElement>) => setCard((c) => ({ ...c, [k]: e.target.value }));

  return (
    <>
      <h2>Manage Credit Cards</h2>
      <div className="panel">
        {cards.length === 0 && <p className="empty">No cards yet. Add your first card below.</p>}
        <div className="list">
          {cards.map((c) => (
            <Row
              key={c.id}
              title={c.name}
              sub={`Due: ${c.dueDate}`}
              onEdit={() => { setEditId(c.id); setCard({ name: c.name, cycleStart: c.cycleStart, cycleEnd: c.cycleEnd, dueDate: c.dueDate }); }}
              onDelete={() => { if (confirm(`Delete ${c.name} and its credit expenses?`)) removeCard(c.id); }}
            />
          ))}
        </div>
        <h3>{editId ? 'Edit card' : 'Add new card'}</h3>
        <label className="lbl">New Card Name
          <input className="field" placeholder="e.g. HDFC Regalia" value={card.name} onChange={setC('name')} />
        </label>
        <div className="grid2">
          <label className="lbl">Billing cycle start
            <input className="field" type="date" value={card.cycleStart} onChange={setC('cycleStart')} />
          </label>
          <label className="lbl">Billing cycle end
            <input className="field" type="date" value={card.cycleEnd} onChange={setC('cycleEnd')} />
          </label>
        </div>
        <label className="lbl">Due date
          <input className="field" type="date" value={card.dueDate} onChange={setC('dueDate')} />
        </label>
        {cardErr && <p className="err" role="alert">{cardErr}</p>}
        <button className="btn primary" onClick={submitCard}>{editId ? 'Update Card' : '+ Add Card'}</button>
        {editId && <button className="btn ghost" onClick={() => { setEditId(null); setCard(blankCard); setCardErr(''); }}>Cancel edit</button>}
      </div>

      <h2>Save Credit Expense</h2>
      <div className="panel">
        <label className="lbl">Card
          <select className="field" value={selectedCard} onChange={(e) => setExp((x) => ({ ...x, cardId: e.target.value }))}>
            {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="lbl">Topic / Note
          <input className="field" placeholder="What was it for?" value={exp.topic} onChange={(e) => setExp((x) => ({ ...x, topic: e.target.value }))} />
        </label>
        <label className="lbl">Amount (₹)
          <input className="field" inputMode="decimal" type="number" min="0" placeholder="0" value={exp.amount} onChange={(e) => setExp((x) => ({ ...x, amount: e.target.value }))} />
        </label>
        {expErr && <p className="err" role="alert">{expErr}</p>}
        <button className="btn primary" onClick={submitExpense}>Save Credit Expense</button>
        {spends.length > 0 && (
          <div className="list">
            {spends.map((s) => (
              <Row
                key={s.id}
                title={s.topic}
                sub={`${cards.find((c) => c.id === s.cardId)?.name ?? 'Card'} • ${s.date}`}
                amount={formatINR(s.amount)}
                onDelete={() => { if (confirm(`Delete "${s.topic}"?`)) removeCreditExpense(s.id); }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
