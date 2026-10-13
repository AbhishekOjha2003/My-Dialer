export interface Contact {
  name: string;
  phone: string;
  email?: string;
  leadStatus?: string;
  notes?: string;
  [key: string]: string | undefined; // Allow dynamic fields
}

export interface CallRecording {
  id: string; // RecordingSid
  duration: number; // in seconds
  url: string; // audio playback url
  status: string;
  dateCreated: string;
  channels?: number;
}

export interface CallRecord {
  id: string;
  callSid: string;
  phoneNumber: string;
  contactName?: string;
  direction: 'outbound' | 'inbound';
  status: 'completed' | 'missed' | 'failed' | 'busy' | 'no-answer' | 'user-cut';
  statusLabel: string;
  duration: number;
  formattedDuration: string;
  timestamp: string;
  formattedDate: string;
  formattedTime: string;
  recordings: CallRecording[];
}

export interface ContactHistoryStats {
  totalCalls: number;
  completedCalls: number;
  missedCalls: number;
  totalDuration: number;
  formattedTotalDuration: string;
  totalRecordings: number;
  lastCallDate?: string;
  lastCallTime?: string;
}

export interface ContactHistoryResponse {
  contactPhone: string;
  contactName?: string;
  stats: ContactHistoryStats;
  calls: CallRecord[];
}

export interface CallLog {
  id: string;
  contactName: string;
  phoneNumber: string;
  duration: number;
  status: 'completed' | 'missed' | 'failed' | 'busy' | 'no-answer';
  timestamp: Date;
  direction: 'inbound' | 'outbound';
}
