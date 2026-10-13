export interface Contact {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  [key: string]: string | undefined; // Allow dynamic fields
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
