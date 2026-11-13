import Dexie, { Table } from 'dexie';

type Flag = 0 | 1;
interface SyncFields {
  id: string;
  synced: Flag; // 0 = pending upload
  deleted: Flag; // soft delete until the cloud confirms
  updatedAt: number;
}

export type ExpenseType = 'normal' | 'debit';

export interface Expense extends SyncFields {
  type: ExpenseType;
  title: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
}
export interface Card extends SyncFields {
  name: string;
  cycleStart: string;
  cycleEnd: string;
  dueDate: string;
}
export interface CreditExpense extends SyncFields {
  cardId: string;
  topic: string;
  amount: number;
  date: string;
}

class AppDB extends Dexie {
  expenses!: Table<Expense, string>;
  cards!: Table<Card, string>;
  creditExpenses!: Table<CreditExpense, string>;

  constructor() {
    super('expense-tracker');
    this.version(1).stores({
      expenses: 'id, type, date, synced',
      cards: 'id, synced',
      creditExpenses: 'id, cardId, date, synced',
    });
  }
}

export const db = new AppDB();

export const newId = () => crypto.randomUUID();

export function todayStr(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const pending = () => ({ synced: 0 as Flag, deleted: 0 as Flag, updatedAt: Date.now() });

export const saveExpense = (e: Omit<Expense, 'synced' | 'deleted' | 'updatedAt'>) =>
  db.expenses.put({ ...e, ...pending() });
export const removeExpense = (id: string) =>
  db.expenses.update(id, { deleted: 1, synced: 0, updatedAt: Date.now() });

export const saveCard = (c: Omit<Card, 'synced' | 'deleted' | 'updatedAt'>) =>
  db.cards.put({ ...c, ...pending() });
export async function removeCard(id: string) {
  const now = Date.now();
  await db.transaction('rw', db.cards, db.creditExpenses, async () => {
    await db.cards.update(id, { deleted: 1, synced: 0, updatedAt: now });
    await db.creditExpenses.where('cardId').equals(id).modify({ deleted: 1, synced: 0, updatedAt: now });
  });
}

export const saveCreditExpense = (c: Omit<CreditExpense, 'synced' | 'deleted' | 'updatedAt'>) =>
  db.creditExpenses.put({ ...c, ...pending() });
export const removeCreditExpense = (id: string) =>
  db.creditExpenses.update(id, { deleted: 1, synced: 0, updatedAt: Date.now() });

export async function pendingCount() {
  const [a, b, c] = await Promise.all([
    db.expenses.where('synced').equals(0).count(),
    db.cards.where('synced').equals(0).count(),
    db.creditExpenses.where('synced').equals(0).count(),
  ]);
  return a + b + c;
}
