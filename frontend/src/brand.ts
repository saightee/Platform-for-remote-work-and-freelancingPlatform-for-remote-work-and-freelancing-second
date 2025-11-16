const SITE = (import.meta.env.VITE_SITE || '').toLowerCase();

type Brand = {
  id: 'jobforge' | '22resumes' | 'onlinejobs';
  name: string;            // короткое имя
  wordmark: string;        // текст логотипа
  domain: string;          // голый домен без протокола
  heroTitle: string;
  heroSubtitle: string;
  whyChooseTitle: string;
  copyright: string;

  // ↓ новое — для index.html / OG / JSON-LD
  siteTitle: string;       // <title> главной
  siteDescription: string; // meta description главной
  ogTitle: string;         // OG: title
  ogDescription: string;   // OG: description
  ogImagePath: string;     // относительный путь к баннеру (без домена)
};

const JOBFORGE: Brand = {
  id: 'jobforge',
  name: 'Jobforge',
  wordmark: 'Jobforge_',
  domain: 'jobforge.net',
  heroTitle: 'The Simplest Path to Connect Talent and Opportunities',
  heroSubtitle:
    'Join a growing community of candidates and employers finding the right fit through clear listings and smart search.',
  whyChooseTitle: 'Why Choose JobForge',
  copyright: '© 2025 Jobforge. All rights reserved.',
  siteTitle: 'Jobforge - Connecting Talent with Opportunity',
  siteDescription:
    'Jobforge helps remote talent and employers connect through clear listings, smart search, and direct chat. Find work or hire global talent today.',
  ogTitle: 'Jobforge — Find Remote Work & Hire Global Talent',
  ogDescription:
    'Remote jobs and global hiring made simple. Create a profile, apply with one click, and chat directly with employers.',
  ogImagePath: '/public/static/og/jobforge.png',
};

const R22: Brand = {
  id: '22resumes',
  name: '22Resumes',
  wordmark: '22Resumes_',
  domain: '22resumes.com',
  heroTitle: 'Build a Strong Team with the Right Talent',
  heroSubtitle:
    'Post roles, discover great candidates and make hiring simple.',
  whyChooseTitle: 'Why Choose 22Resumes',
  copyright: '© 2025 22Resumes. All rights reserved.',
  siteTitle: '22Resumes - Simple Hiring, Better Teams',
  siteDescription:
    '22Resumes connects teams with vetted candidates. Post roles, discover talent, and hire faster.',
  ogTitle: '22Resumes — Hire Great People Faster',
  ogDescription:
    'Post roles, discover great candidates and make hiring simple.',
  ogImagePath: '/public/static/og/22resumes.png',
};

const ONLINE_JOBS: Brand = {
  id: 'onlinejobs',
  name: 'Online.jobs',
  wordmark: 'Online.jobs_',
  domain: 'online.jobs',
  heroTitle: 'Find Remote and Local Jobs Online',
  heroSubtitle:
    'Discover curated job listings and connect directly with employers on Online.jobs.',
  whyChooseTitle: 'Why Choose Online.jobs',
  copyright: '© 2025 Online.jobs. All rights reserved.',
  siteTitle: 'Online.jobs - Find Your Next Job Online',
  siteDescription:
    'Online.jobs connects talent and employers through clear listings, simple search, and direct communication.',
  ogTitle: 'Online.jobs — Search Jobs & Hire Talent Online',
  ogDescription:
    'Browse fresh job listings, apply in a few clicks, and reach employers worldwide via Online.jobs.',
  ogImagePath: '/public/static/og/onlinejobs.png',
};

const MAP: Record<string, Brand> = {
  jobforge: JOBFORGE,
  '22resumes': R22,
  onlinejobs: ONLINE_JOBS,
  // на всякий случай, если вдруг VITE_SITE зададут как "online.jobs"
  'online.jobs': ONLINE_JOBS,
};

/** Фолбэк: если env нет — угадаем по домену */
function fromLocation(): Brand {
  try {
    const h = window.location.hostname.toLowerCase();
    if (h.includes('22resumes')) return R22;
    if (h.includes('online.jobs')) return ONLINE_JOBS;
    return JOBFORGE;
  } catch {
    return JOBFORGE;
  }
}

export const brand: Brand = MAP[SITE] || fromLocation();

/** Абсолютный origin текущего бренда (https://domain) */
export function brandOrigin(): string {
  try {
    const proto = window.location.protocol || 'https:';
    return `${proto}//${brand.domain}`;
  } catch {
    return `https://${brand.domain}`;
  }
}

/** Абсолютный origin backend (https://domain/backend) */
export function brandBackendOrigin(): string {
  try {
    const proto = window.location.protocol || 'https:';
    return `${proto}//${brand.domain}/backend`;
  } catch {
    return `https://${brand.domain}/backend`;
  }
}

/** Имя кастомного события с префиксом текущего бренда: "<brandId>:<name>" */
export function brandEvent(name: string): string {
  return `${brand.id}:${name}`;
}
