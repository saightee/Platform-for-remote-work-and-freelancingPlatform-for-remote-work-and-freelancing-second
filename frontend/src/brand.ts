const SITE = (import.meta.env.VITE_SITE || '').toLowerCase();

type Brand = {
  id: 'jobforge' | '22resumes';
  name: string;      // короткое имя для текстов
  wordmark: string;  // текст логотипа
  domain: string;    // для Helmet/canonical
  heroTitle: string;
  heroSubtitle: string;
  whyChooseTitle: string;
  copyright: string; // футер копирайт
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
};

const MAP: Record<string, Brand> = { jobforge: JOBFORGE, '22resumes': R22 };

/** Фолбэк: если env нет — угадаем по домену */
function fromLocation(): Brand {
  try {
    const h = window.location.hostname.toLowerCase();
    if (h.includes('22resumes')) return R22;
    return JOBFORGE;
  } catch {
    return JOBFORGE;
  }
}

export const brand: Brand = MAP[SITE] || fromLocation();
