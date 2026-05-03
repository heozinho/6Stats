import { Bindings } from '../types';
import { getDb } from '../db';
import { listeningEvents } from '../db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { archiveData } from '../services/storage';

export async function runArchiving(env: Bindings) {
  const db = getDb(env.DATABASE_URL);
  
  // Find events older than 7 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const oldEvents = await db.select()
    .from(listeningEvents)
    .where(and(eq(listeningEvents.processed, true), lt(listeningEvents.playedAt, cutoff)))
    .limit(5000);

  if (oldEvents.length === 0) return;

  // Group by user and month for storage efficiency
  const grouped = new Map<string, any[]>();
  for (const event of oldEvents) {
    const month = new Date(event.playedAt).toISOString().slice(0, 7); // YYYY-MM
    const key = `archive/${event.userId}/${month}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(event);
  }

  // Upload and delete
  for (const [key, data] of grouped.entries()) {
    const timestamp = Date.now();
    await archiveData(env.ARCHIVE_BUCKET, `${key}/${timestamp}`, data);

    // Delete from DB after successful upload
    const ids = data.map(d => d.id);
    // Note: in a real app, delete in chunks to avoid query size limits
    for (const id of ids) {
       await db.delete(listeningEvents).where(eq(listeningEvents.id, id));
    }
  }
}
