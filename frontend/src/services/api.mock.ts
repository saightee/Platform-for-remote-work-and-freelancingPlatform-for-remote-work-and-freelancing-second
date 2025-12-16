// src/services/api.mock.ts

// @ts-nocheck  ← если хочешь совсем тишины, раскомментируй эту строку

import type { Profile, Category, JobPost, JobSeekerProfile, Review } from '@types';

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toISOString();
/* -------------------- MOCK IMAGES -------------------- */

// один аватар – используем и в списке талантов, и в публичном профиле
const MOCK_AVATAR =
  'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';

const MOCK_PORTFOLIO_IMAGES = [
  'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1181467/pexels-photo-1181467.jpeg?auto=compress&cs=tinysrgb&w=400',
  'https://images.pexels.com/photos/1181524/pexels-photo-1181524.jpeg?auto=compress&cs=tinysrgb&w=400',
];

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
    avatar: MOCK_AVATAR,                 // ← АВАТАР ДЛЯ СПИСКА ТАЛАНТОВ
    portfolio_files: MOCK_PORTFOLIO_IMAGES, // ← чтобы и в поиске, и в профайле были фотки (если надо)
    current_position: 'Frontend Developer',
    headline: 'Frontend Developer',
    title: 'Frontend Developer',
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
    current_position: 'Frontend Developer',
    headline: 'Frontend Developer',
    title: 'Frontend Developer',
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


/* -------------------- PUBLIC PROFILE MOCK -------------------- */

const PUBLIC_PROFILE: JobSeekerProfile = {
  id: 'js-mock-1',
  role: 'jobseeker',
  email: 'css.ninja@example.com',
  username: 'css_ninja',

  country: 'LT',
  languages: ['English', 'Lithuanian'],
  expected_salary: 3500,
  job_search_status: 'open_to_offers',
  date_of_birth: '1995-05-12',

  // соцсети
  linkedin: 'https://www.linkedin.com/in/css-ninja',
  instagram: 'https://www.instagram.com/css.ninja',
  facebook: 'https://www.facebook.com/css.ninja',
  whatsapp: '+37060000000',
  telegram: '@css_ninja',

  // skills: берём настоящие категории из CATS, чтобы всё совпадало по типу
  skills: [
    CATS[0].subcategories![0], // HTML/CSS
    CATS[0].subcategories![1], // React
  ],

  experience: '3-6 years',
  job_experience: `
    <p><strong>Senior Frontend Developer</strong> at Creative Agency (2021 — now)</p>
    <ul>
      <li>Built design systems with Tailwind & CSS Modules</li>
      <li>Led CSS architecture & code reviews</li>
    </ul>
    <p><strong>Frontend Developer</strong> at Startup (2018 — 2021)</p>
  `,
  description: `
    <p>Pixel-perfect CSS engineer focused on responsive layouts, animations and accessibility.</p>
    <p>Comfortable with Tailwind, BEM, SCSS and modern JS frameworks.</p>
  `,
  portfolio: 'https://dribbble.com/css_ninja',
  video_intro: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  timezone: 'Europe/Vilnius',
  currency: 'EUR',
  average_rating: 4.8,
  profile_views: 123,

  // крупный аватар (портрет)
 avatar: MOCK_AVATAR,

  identity_verified: true,
  identity_document: null,

  // РЕЗЮМЕ (пусть остаётся локальным/моковым)
  resume: '/mock/resumes/css-ninja.pdf',

  // НОВОЕ: файлы портфолио — крупные фотки + документы
  portfolio_files: [
    // вертикальная крупная
    'https://placehold.co/1200x1600.png?text=Portfolio+1',

    // горизонтальная
    'https://placehold.co/1600x900.png?text=Portfolio+2',

    // очень широкая
    'https://placehold.co/2000x800.png?text=Portfolio+3',

    // PDF (пример документа)
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',

    // DOCX (пример документа)
    'https://file-examples.com/wp-content/uploads/2017/02/file-sample_100kB.docx',
  ],



  // основное поле, но для PublicProfile само наполним через PUBLIC_REVIEWS
  reviews: [],
};


const PUBLIC_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    reviewer_id: 'emp-1',
    reviewed_id: PUBLIC_PROFILE.id,
    job_application_id: 'ja-1',
    rating: 5,
    comment: 'Great communication and excellent CSS work. Delivered on time.',
    reviewer: {
      id: 'emp-1',
      email: 'employer@example.com',
      username: 'design_hiring_manager',
      role: 'employer',
    },
    reviewed: {
      id: PUBLIC_PROFILE.id,
      email: PUBLIC_PROFILE.email || 'css.ninja@example.com',
      username: PUBLIC_PROFILE.username,
      role: 'jobseeker',
    },
    job_application: {
      id: 'ja-1',
      job_post_id: '100',
      job_seeker_id: PUBLIC_PROFILE.id,
      status: 'Accepted',
      job_post: { id: '100', title: 'Frontend (CSS/Tailwind) Engineer' },
      job_seeker: { id: PUBLIC_PROFILE.id, username: PUBLIC_PROFILE.username },
    },
    job_post: {
      id: '100',
      title: 'Frontend (CSS/Tailwind) Engineer',
    },
    job_seeker: {
      id: PUBLIC_PROFILE.id,
      username: PUBLIC_PROFILE.username,
    },
    created_at: stamp(),
    updated_at: stamp(),
  },
  {
    id: 'rev-2',
    reviewer_id: 'emp-2',
    reviewed_id: PUBLIC_PROFILE.id,
    job_application_id: 'ja-2',
    rating: 4,
    comment: 'Very strong skills, needed a bit more time on animations, but result was great.',
    reviewer: {
      id: 'emp-2',
      email: 'hr@agency.com',
      username: 'agency_hr',
      role: 'employer',
    },
    reviewed: {
      id: PUBLIC_PROFILE.id,
      email: PUBLIC_PROFILE.email || 'css.ninja@example.com',
      username: PUBLIC_PROFILE.username,
      role: 'jobseeker',
    },
    job_application: {
      id: 'ja-2',
      job_post_id: '101',
      job_seeker_id: PUBLIC_PROFILE.id,
      status: 'Accepted',
      job_post: { id: '101', title: 'UI Engineer (Animations)' },
      job_seeker: { id: PUBLIC_PROFILE.id, username: PUBLIC_PROFILE.username },
    },
    job_post: {
      id: '101',
      title: 'UI Engineer (Animations)',
    },
    job_seeker: {
      id: PUBLIC_PROFILE.id,
      username: PUBLIC_PROFILE.username,
    },
    created_at: stamp(),
    updated_at: stamp(),
  },
];

/** GET /users/:id/public-profile */
export async function getUserProfileById(id: string): Promise<JobSeekerProfile> {
  await delay(150);
  // можем подставить id из URL, чтобы в адресе и данных совпадало
  return { ...(PUBLIC_PROFILE as any), id };
}

/** GET /reviews/user/:id */
export async function getReviewsForUser(userId: string): Promise<Review[]> {
  await delay(120);
  return PUBLIC_REVIEWS;
}

/** POST /profiles/:id/view – просто имитируем инкремент просмотров */
export async function incrementProfileView(userId: string): Promise<{ ok: boolean }> {
  await delay(80);
  return { ok: true };
}




export async function getHomeFeaturedJobs(): Promise<JobPost[]> {
  await delay(150);
  return HOME_JOBS;
}

export async function getHomeFeaturedTalents(): Promise<Profile[]> {
  await delay(150);
  return HOME_TALENTS;
}

const HOME_JOBS: JobPost[] = ([
  {
    id: 201,
    title: 'Senior React Developer',
    status: 'Active',
    job_type: 'Full time',
    location: 'Remote',
    salary: 5000,
    salary_type: 'per month',
    currency: '$',
    required_skills: ['React', 'TypeScript', 'CSS'],
    company_name: 'PixelCraft Studio',
    description:
      'We are looking for a Senior React Developer to build and maintain a modern front-end stack with TypeScript, Vite and Tailwind. You will work closely with designers and backend engineers to ship high-quality UI.',
  },
  {
    id: 202,
    title: 'UI/UX Designer',
    status: 'Active',
    job_type: 'Contract',
    location: 'Remote',
    salary: 40,
    salary_type: 'per hour',
    currency: '$',
    required_skills: ['Figma', 'Prototyping', 'UI'],
    company_name: 'Flow Design Lab',
    description:
      'Contract position for a UI/UX Designer to create wireframes, prototypes and production-ready layouts in Figma for web dashboards and marketing websites. Experience with design systems is a plus.',
  },
  {
    id: 203,
    title: 'Content Writer',
    status: 'Active',
    job_type: 'Part time',
    location: 'Remote',
    salary: 1200,
    salary_type: 'per month',
    currency: '$',
    required_skills: ['Copywriting', 'SEO', 'Blog'],
    company_name: 'BrightWords Media',
    description:
      'Part-time role for a Content Writer to create blog posts, landing page copy and basic SEO content. Ideal for someone with experience in tech or SaaS topics.',
  },
] as unknown) as JobPost[];


// имитируем реальный searchJobPosts: тебе нужен только res.data
export async function searchJobPosts(_: any): Promise<{
  data: JobPost[];
  total: number;
  page: number;
  limit: number;
}> {
  await delay(150);
  return {
    data: HOME_JOBS,
    total: HOME_JOBS.length,
    page: 1,
    limit: HOME_JOBS.length,
  };
}