// src/services/api.mock.ts

// @ts-nocheck  ← если хочешь совсем тишины, раскомментируй эту строку

import type { Profile, Category, JobPost } from '@types';

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toISOString();

/* -------------------- CATEGORIES -------------------- */
// делаем helper, который добавит обязательные поля (created_at/updated_at) рекурсивно
function cat(c: any): Category {
  return {
    id: String(c.id),
    name: String(c.name),
    parent_id: c.parent_id ? String(c.parent_id) : undefined,
    created_at: c.created_at || stamp(),
    updated_at: c.updated_at || stamp(),
    subcategories: (c.subcategories || []).map(cat),
  } as Category;
}

const CATS: Category[] = [
  cat({
    id: 'web',
    name: 'Web',
    subcategories: [
      { id: 'htmlcss', name: 'HTML/CSS', parent_id: 'web' },
      { id: 'react',   name: 'React',    parent_id: 'web' },
    ],
  }),
  cat({
    id: 'design',
    name: 'Design',
    subcategories: [
      { id: 'ui', name: 'UI', parent_id: 'design' },
      { id: 'ux', name: 'UX', parent_id: 'design' },
    ],
  }),
];

/* -------------------- TALENTS -------------------- */
/** Не спорим с твоими типами: все «спорные» поля делаем как any/строки */
type MockProfile = Profile & Record<string, any>;

const TALENTS: MockProfile[] = [
  {
    id: 1,
    username: 'css_ninja',
    country: 'LT',
    languages: ['English', 'Lithuanian'],
    description: 'Pixel-perfect, BEM, Tailwind, Grid/Flex.',
    experience: '3-6 years',
    expected_salary: 3500,
    currency: 'EUR',
    average_rating: 4.8 as any,          // ← число (чтобы звёзды зажглись), тип подавили
    averageRating: 4.8 as any,           // ← дублируем на всякий
    job_search_status: 'open_to_offers',
    profile_views: 123,
    skills: ['CSS', 'SCSS', 'Tailwind', 'Responsive'],
    categories: [CATS[0].subcategories![0]],
  },
  {
    id: 2,
    username: 'grid_master',
    country: 'PL',
    languages: ['English', 'Polish'],
    description: 'Complex grids, animations, accessibility.',
    experience: '6+ years',
    expected_salary: 4800,
    currency: 'EUR',
    average_rating: 4.5 as any,          // ← число
    averageRating: 4.5 as any,
    job_search_status: 'actively_looking',
    profile_views: 89,
    skills: ['CSS Grid', 'Animations', 'A11y'],
    categories: [CATS[0].subcategories![0]],
    resume: '/mock-resume.pdf',
  },
  {
    id: 3,
    username: 'tailwind_sam',
    country: 'DE',
    languages: ['German', 'English'],
    description: 'Design systems with Tailwind, dark mode.',
    experience: '2-3 years',
    expected_salary: 3900,
    currency: 'EUR',
    average_rating: 4.2 as any,          // ← число
    averageRating: 4.2 as any,
    job_search_status: 'hired',
    profile_views: 45,
    skills: ['Tailwind', 'Design Systems', 'Dark Mode'],
    categories: [CATS[0].subcategories![1]],
  },
  
];

/* -------------------- JOBS -------------------- */
/** На странице нужны только id+title. Жёсткие поля у твоего JobPost заполнять не будем —
    просто приведём массив к JobPost[] через unknown, чтобы TS отстал. */
const JOBS: JobPost[] = ([
  { id: 100, title: 'Frontend (CSS/Tailwind) Engineer', status: 'Active' },
  { id: 101, title: 'UI Engineer (Animations)',        status: 'Active' },
] as unknown) as JobPost[];

/* -------------------- EXPORTS (ровно то, что ждёт страница) -------------------- */
export async function getCategories(): Promise<Category[]> {
  await delay(); return CATS;
}

export async function searchCategories(term: string): Promise<Category[]> {
  await delay(120);
  const q = term.trim().toLowerCase();
  const flat = (cats: Category[]): Category[] =>
    cats.flatMap(c => [c, ...(c.subcategories ? flat(c.subcategories) : [])]);
  return q ? flat(CATS).filter(c => c.name.toLowerCase().includes(q)) : [];
}

export async function searchTalents(params: any): Promise<{ total: number; data: Profile[] }> {
  await delay();
  let list = [...TALENTS];

  if (params.country) {
    list = list.filter(t => (t.country || '').toUpperCase() === String(params.country).toUpperCase());
  }

  if (params.languages) {
    const arr = String(params.languages).split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
    if (arr.length) {
      if ((params.languages_mode || 'any') === 'all') {
        list = list.filter(t => {
          const langs = (t.languages || []).map((l: string) => l.toLowerCase());
          return arr.every(a => langs.includes(a));
        });
      } else {
        list = list.filter(t => {
          const langs = (t.languages || []).map((l: string) => l.toLowerCase());
          return arr.some(a => langs.includes(a));
        });
      }
    }
  }

  if (params.experience) list = list.filter(t => (t.experience || '') === params.experience);

  // rating как число через Number(...)
  if (params.rating != null) {
    list = list.filter(t => Number(t.average_rating ?? t.averageRating ?? 0) >= Number(params.rating));
  }

  if (params.description) {
    const q = String(params.description).toLowerCase();
    list = list.filter(t =>
      (t.description || '').toLowerCase().includes(q) ||
      (t.username || '').toLowerCase().includes(q) ||
      (Array.isArray(t.skills) ? t.skills.join(' ').toLowerCase().includes(q) : false)
    );
  }

  if (Array.isArray(params.skills) && params.skills.length) {
    const ids = params.skills.map(String);
    list = list.filter(t => (t.categories || []).some((c: any) => ids.includes(String(c.id))));
  }

  const page = Number(params.page || 1);
  const limit = Number(params.limit || 25);
  const total = list.length;
  const data = list.slice((page - 1) * limit, page * limit) as Profile[];
  return { total, data };
}

export async function searchJobseekers(params: any) {
  return searchTalents(params);
}

export async function getMyJobPosts(): Promise<JobPost[]> {
  await delay(150); return JOBS;
}

export async function sendInvitation(_: { job_post_id: any; job_seeker_id: any; message?: string }) {
  await delay(200); return { ok: true };
}
