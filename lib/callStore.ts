import fs from 'fs';
import path from 'path';
import { CallRecord, CallRecording } from './types';

const STORE_PATH = path.join(process.cwd(), 'data', 'call_store.json');

interface StoreData {
  calls: Record<string, CallRecord>;
  recordings: Record<string, CallRecording[]>;
}

// Ensure data directory exists
function ensureDataDir() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Ignore if cannot create
    }
  }
}

function loadStore(): StoreData {
  try {
    ensureDataDir();
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.error('[callStore] Failed to read store:', e);
  }
  return { calls: {}, recordings: {} };
}

function saveStore(data: StoreData) {
  try {
    ensureDataDir();
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[callStore] Failed to write store:', e);
  }
}

export function logCallEvent(call: {
  callSid: string;
  phoneNumber: string;
  contactName?: string;
  duration?: number;
  status?: CallRecord['status'];
  statusLabel?: string;
  direction?: 'outbound' | 'inbound';
}) {
  const data = loadStore();
  const existing: Partial<CallRecord> = data.calls[call.callSid] || {};

  const now = new Date();
  const duration = call.duration !== undefined ? call.duration : existing.duration || 0;
  const status = call.status || existing.status || 'completed';

  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const formattedDuration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const record: CallRecord = {
    id: call.callSid,
    callSid: call.callSid,
    phoneNumber: call.phoneNumber || existing.phoneNumber || '',
    contactName: call.contactName || existing.contactName || '',
    direction: call.direction || existing.direction || 'outbound',
    status: status,
    statusLabel:
      call.statusLabel ||
      (status === 'user-cut'
        ? 'User Cut Call'
        : status === 'completed'
        ? 'Completed'
        : status === 'no-answer'
        ? 'No Answer'
        : status === 'busy'
        ? 'Busy'
        : 'Failed'),
    duration: duration,
    formattedDuration: formattedDuration,
    timestamp: existing.timestamp || now.toISOString(),
    formattedDate:
      existing.formattedDate ||
      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    formattedTime:
      existing.formattedTime ||
      now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    recordings: data.recordings[call.callSid] || existing.recordings || [],
  };

  data.calls[call.callSid] = record;
  saveStore(data);
  return record;
}

export function attachRecordingToCall(callSid: string, recording: CallRecording) {
  const data = loadStore();
  if (!data.recordings[callSid]) {
    data.recordings[callSid] = [];
  }

  // Prevent duplicate recording entries
  const exists = data.recordings[callSid].some((r) => r.id === recording.id);
  if (!exists) {
    data.recordings[callSid].push(recording);
  }

  if (data.calls[callSid]) {
    data.calls[callSid].recordings = data.recordings[callSid];
  }

  saveStore(data);
}

export function getLocalCallsForPhone(phone: string): CallRecord[] {
  const data = loadStore();
  const digits = phone.replace(/\D/g, '').slice(-10);
  return Object.values(data.calls).filter((c) => {
    const callDigits = c.phoneNumber.replace(/\D/g, '');
    return callDigits.endsWith(digits);
  });
}
