// src/services/api.profile-mock.ts
// @ts-nocheck  // можно включить, если не хочешь заморачиваться с типами

import type { Profile, JobSeekerProfile, Category } from '@types';

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toISOString();

/* ------------ CATEGORIES (для skills) ------------ */

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
    name: 'Web development',
    subcategories: [
      { id: 'react', name: 'React', parent_id: 'web' },
      { id: 'css',   name: 'CSS / Tailwind', parent_id: 'web' },
    ],
  }),
  cat({
    id: 'support',
    name: 'Support',
    subcategories: [
      { id: 'cs', name: 'Customer support', parent_id: 'support' },
    ],
  }),
];

/* ------------ MOCK PROFILE ------------ */

const MOCK_JOBSEEKER: JobSeekerProfile & { portfolio_files?: string[] } = {
  id: 'dev-js-1',
  role: 'jobseeker',
  email: 'dev.jobseeker@example.com',
  username: 'dev_jobhunter',
  country: 'LT',
  languages: ['English', 'Lithuanian'],
  expected_salary: 1500,
  job_search_status: 'open_to_offers',
  date_of_birth: '1995-05-10',

  linkedin: '',
  instagram: '',
  facebook: '',
  whatsapp: '',
  telegram: '',

  skills: [
    CATS[0].subcategories![0],
    CATS[0].subcategories![1],
  ],
  experience: '3-6 years',
  job_experience: '<p>Company A – Frontend dev</p>',
  description: '<p>Demo profile for dev previews.</p>',
  portfolio: 'https://example.com/portfolio',
  video_intro: '',

  timezone: 'Europe/Vilnius',
  currency: 'EUR',
  average_rating: 4.7,
  profile_views: 42,
  avatar: 'https://via.placeholder.com/300x300.png?text=Avatar',
  identity_verified: false,
  identity_document: null,
  resume: '',
  reviews: [],

  portfolio_files: [
    'https://via.placeholder.com/600x400.png?text=Work+1',
    'https://via.placeholder.com/600x400.png?text=Work+2',
  ],
};

/* ------------ EXPORTS, которые ждёт ProfilePage ------------ */

export async function getProfile(): Promise<Profile> {
  await delay();
  return MOCK_JOBSEEKER as unknown as Profile;
}

export async function getCategories(): Promise<Category[]> {
  await delay();
  return CATS;
}

export async function searchCategories(term: string): Promise<Category[]> {
  await delay(120);
  const q = term.trim().toLowerCase();
  const flat = (cats: Category[]): Category[] =>
    cats.flatMap(c => [c, ...(c.subcategories || [])]);
  const all = flat(CATS);
  return q ? all.filter(c => c.name.toLowerCase().includes(q)) : all;
}

export async function updateProfile(patch: any): Promise<Profile> {
  await delay(150);

  Object.assign(MOCK_JOBSEEKER, patch);

  // skills по skillIds
  if (Array.isArray(patch.skillIds)) {
    const flat = (cats: Category[]): Category[] =>
      cats.flatMap(c => [c, ...(c.subcategories || [])]);
    const dict = new Map(flat(CATS).map(c => [c.id, c]));
    MOCK_JOBSEEKER.skills = patch.skillIds
      .map((id: string) => dict.get(id))
      .filter(Boolean) as Category[];
  }

  return MOCK_JOBSEEKER as unknown as Profile;
}

export async function uploadAvatar(_: FormData): Promise<Profile> {
  await delay(150);
  // условный "загруженный" аватар
  MOCK_JOBSEEKER.avatar = 'https://via.placeholder.com/300x300.png?text=Uploaded';
  return MOCK_JOBSEEKER as unknown as Profile;
}

export async function uploadResume(_: FormData): Promise<Profile> {
  await delay(150);
  MOCK_JOBSEEKER.resume = 'https://example.com/mock-resume.pdf';
  return MOCK_JOBSEEKER as unknown as Profile;
}

export async function uploadPortfolioFiles(_: FormData): Promise<Profile> {
  await delay(200);
  // просто ничего не меняем, чтобы не усложнять
  return MOCK_JOBSEEKER as unknown as Profile;
}

export async function deleteAccount(): Promise<void> {
  await delay(150);
  // no-op для dev
}
