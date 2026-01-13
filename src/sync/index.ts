export {
  BUCKET,
  MAX_SLOTS,
  listRemoteSlots,
  loadLatestRemoteSnapshot,
  parseSlot,
  pickSlotToWrite,
  saveRemoteRollingSnapshot,
  signInWithEmailOtp,
  signOut,
  slotPath,
} from './remoteSnapshots.ts';
export type { RemoteSlot } from './remoteSnapshots.ts';
export {
  base64ToBytes,
  bytesToBase64,
  decodeProgressSnapshot,
  encodeProgressSnapshot,
  gzipCompress,
  gzipDecompress,
  snapshotToProgress,
  u16ToBase64,
} from './snapshotCodec.ts';
export type { ProgressSnapshotV1 } from './snapshotCodec.ts';
export { supabase } from './supabaseClient.ts';
