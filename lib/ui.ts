// Shared presentational helpers for the Dialer Pro UI

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #7c5cff, #22d3ee)',
  'linear-gradient(135deg, #f472b6, #7c5cff)',
  'linear-gradient(135deg, #10b981, #0ea5e9)',
  'linear-gradient(135deg, #f59e0b, #f43f5e)',
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #06b6d4, #3b82f6)',
];

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Maps a free-text lead status (from Google Sheets) to a pill colour. */
export function leadTone(status: string): string {
  const s = status.toLowerCase();
  if (/(won|closed|converted|customer|hot)/.test(s)) return 'pill-green';
  if (/(follow|callback|warm|pending|progress|contacted)/.test(s)) return 'pill-amber';
  if (/(lost|dead|cold|not interested|dnc|rejected)/.test(s)) return 'pill-red';
  if (/(qualified|interested|meeting)/.test(s)) return 'pill-blue';
  return 'pill-violet';
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return raw.startsWith('+') ? raw : d ? `+${d}` : raw;
}
