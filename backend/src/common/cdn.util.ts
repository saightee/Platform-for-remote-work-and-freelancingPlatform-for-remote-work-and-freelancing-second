export function pickCdnBaseByHost(host?: string): string {
  const h = (host || '').toLowerCase();
  const jb = process.env.CDN_BASE_URL_JOBFORGE || '';
  const rb = process.env.CDN_BASE_URL_22RESUMES || jb;
  if (h.includes('22resumes.com')) return rb || jb;
  if (h.includes('jobforge.net'))  return jb || rb;
  return jb || rb || ''; // крайний случай
}
