import type { UserProgress } from '../types';
import {
  decodeProgressSnapshot,
  encodeProgressSnapshot,
  snapshotToProgress,
} from './snapshotCodec';
import { supabase } from './supabaseClient';

const BUCKET = 'pattern-saves';
const MAX_SLOTS = 9;

type RemoteSlot = {
  slot: number;
  path: string;
  updatedAtMs: number;
};

function slotPath(userId: string, patternId: string, slot: number): string {
  return `${userId}/${patternId}/slot-${slot}.json.gz`;
}

function parseSlot(name: string): number | null {
  // expects slot-N.json.gz
  const m = /^slot-(\d+)\.json\.gz$/i.exec(name);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n < 0 || n >= MAX_SLOTS) return null;
  return n;
}

async function getUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function signInWithEmailOtp(email: string): Promise<void> {
  // Use full base URL including path (e.g., https://rr-h.github.io/42x09_Cross-Stitcher/)
  const redirectTo = window.location.origin + import.meta.env.BASE_URL;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listRemoteSlots(patternId: string): Promise<RemoteSlot[]> {
  const userId = await getUserId();
  if (!userId) return [];

  const prefix = `${userId}/${patternId}`;
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100 });
  if (error) throw error;

  const slots: RemoteSlot[] = [];
  for (const obj of data ?? []) {
    const slot = parseSlot(obj.name);
    if (slot === null) continue;

    const updatedAt = (obj.updated_at || obj.created_at || '') as string;
    const ms = updatedAt ? Date.parse(updatedAt) : 0;

    slots.push({
      slot,
      path: `${prefix}/${obj.name}`,
      updatedAtMs: Number.isFinite(ms) ? ms : 0,
    });
  }

  return slots;
}

function pickSlotToWrite(existing: RemoteSlot[]): number {
  if (existing.length < MAX_SLOTS) {
    const used = new Set(existing.map(s => s.slot));
    for (let i = 0; i < MAX_SLOTS; i++) if (!used.has(i)) return i;
    return existing.length; // should not happen
  }

  // overwrite oldest
  const oldest = [...existing].sort((a, b) => a.updatedAtMs - b.updatedAtMs)[0];
  return oldest.slot;
}

export async function saveRemoteRollingSnapshot(
  progress: UserProgress,
  savedAt: number
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return; // not signed in, nothing to do

  const existing = await listRemoteSlots(progress.patternId);
  const slot = pickSlotToWrite(existing);
  const path = slotPath(userId, progress.patternId, slot);

  const bytes = await encodeProgressSnapshot(progress, savedAt);
  const blob = new Blob([bytes as any], { type: 'application/gzip' });

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType: 'application/gzip',
    cacheControl: '0',
  });
  if (error) throw error;
}

export async function loadLatestRemoteSnapshot(patternId: string): Promise<UserProgress | null> {
  const slots = await listRemoteSlots(patternId);
  if (slots.length === 0) return null;

  const latest = [...slots].sort((a, b) => b.updatedAtMs - a.updatedAtMs)[0];
  const { data, error } = await supabase.storage.from(BUCKET).download(latest.path);
  if (error) throw error;

  const ab = await data.arrayBuffer();
  const snap = await decodeProgressSnapshot(new Uint8Array(ab));
  return snapshotToProgress(snap);
}
