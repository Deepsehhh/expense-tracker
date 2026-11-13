import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Card } from './db';

const native = () => Capacitor.isNativePlatform();
const CHANNEL = 'due-reminders';

async function ensureChannel() {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL, name: 'Due date reminders', description: 'Credit card bill reminders', importance: 4, visibility: 1,
    });
  } catch {}
}

/** Fires a notification in ~5 seconds so the user can confirm alerts work on this phone. */
export async function testAlert(): Promise<boolean> {
  if (!(await alertsGranted())) return false;
  try {
    await ensureChannel();
    await LocalNotifications.schedule({
      notifications: [{
        id: 999999991, channelId: CHANNEL, title: 'Alerts are working', body: 'You will get reminders before your card due dates.',
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
      }],
    });
    return true;
  } catch {
    return false;
  }
}

export async function alertsGranted(): Promise<boolean> {
  if (!native()) return false;
  try {
    return (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch {
    return false;
  }
}

/** Asks Android for notification permission. Returns true if granted. */
export async function enableAlerts(): Promise<boolean> {
  if (!native()) return false;
  try {
    const ok = (await LocalNotifications.requestPermissions()).display === 'granted';
    if (ok) await ensureChannel();
    return ok;
  } catch {
    return false;
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 1_000_000;
}

function at9(dateStr: string, daysBefore: number) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d - daysBefore, 9, 0, 0);
}

/** Replaces all pending reminders: 2 days before the due date and on the due date, at 9:00. */
export async function scheduleDueReminders(cards: Card[]) {
  if (!(await alertsGranted())) return;
  try {
    await ensureChannel();
    const pending = await LocalNotifications.getPending();
    const old = pending.notifications.filter((n) => n.id !== 999999991);
    if (old.length) await LocalNotifications.cancel({ notifications: old.map((n) => ({ id: n.id })) });
    const now = Date.now();
    const notifications = cards
      .filter((c) => c.dueDate)
      .flatMap((c) =>
        [2, 0].map((daysBefore) => ({
          id: hash(c.id) * 10 + daysBefore,
          channelId: CHANNEL,
          title: daysBefore === 0 ? `${c.name} bill is due today` : `${c.name} bill due in 2 days`,
          body: `Due date: ${c.dueDate}`,
          schedule: { at: at9(c.dueDate, daysBefore), allowWhileIdle: true },
        })),
      )
      .filter((n) => n.schedule.at.getTime() > now);
    if (notifications.length) await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.warn('Could not schedule reminders', e);
  }
}
