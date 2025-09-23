export const normalizeTelegram = (raw?: string | null) => {
  if (!raw) return '';
  const s = raw.trim();
  if (/^(https?:\/\/|tg:)/i.test(s)) return s;
  if (/^(t\.me|telegram\.me)\//i.test(s)) return `https://${s}`;
  const uname = s.replace(/^@/, '');
  return `https://t.me/${encodeURIComponent(uname)}`;
};

export const normalizeWhatsApp = (raw?: string | null) => {
  if (!raw) return '';
  const s = raw.trim();
  if (/^(https?:\/\/|wa:|whatsapp:)/i.test(s)) return s;
  if (/^(wa\.me|api\.whatsapp\.com)\//i.test(s)) return `https://${s}`;
  const digits = s.replace(/[^\d]/g, '');
  return digits ? `https://wa.me/${digits}` : '';
};

export const normalizeLinkedIn = (raw?: string | null) => {
  if (!raw) return '';
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(www\.)?linkedin\.com\//i.test(s)) return `https://${s}`;
  const handle = s.replace(/^@/, '');
  return `https://www.linkedin.com/in/${encodeURIComponent(handle)}`;
};

export const normalizeInstagram = (raw?: string | null) => {
  if (!raw) return '';
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(www\.)?instagram\.com\//i.test(s)) return `https://${s}`;
  const handle = s.replace(/^@/, '');
  return `https://instagram.com/${encodeURIComponent(handle)}`;
};

export const normalizeFacebook = (raw?: string | null) => {
  if (!raw) return '';
  const s = raw.trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (/^(www\.)?facebook\.com\//i.test(s)) return `https://${s}`;
  const handle = s.replace(/^@/, '');
  return `https://facebook.com/${encodeURIComponent(handle)}`;
};
