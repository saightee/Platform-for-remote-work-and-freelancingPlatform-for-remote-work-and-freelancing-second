
// src/services/api.messages.mock.ts

// @ts-nocheck  // если TS будет шуметь — раскомментируй

import type {
  JobPost,
  JobApplication,
  JobApplicationDetails,
  Message,
  Review,
} from '@types';

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));
const stamp = () => new Date().toISOString();

/* -------------------- MOCK DATA: EMPLOYER & JOB POSTS -------------------- */

const EMPLOYER = {
  id: 'emp1',
  username: 'Acme Corp',
  email: 'hr@acme.example',
} as any;

const JOB_POSTS: JobPost[] = ([
  {
    id: 'job-frontend',
    title: 'Frontend Engineer (React/Tailwind)',
    status: 'Active',
    created_at: stamp(),
    employer_id: EMPLOYER.id,
    employer: EMPLOYER,
  },
  {
    id: 'job-backend',
    title: 'Backend Engineer (Node.js)',
    status: 'Active',
    created_at: stamp(),
    employer_id: EMPLOYER.id,
    employer: EMPLOYER,
  },
] as unknown) as JobPost[];

/* -------------------- MOCK DATA: APPLICATIONS -------------------- */

const APPLICATION_DETAILS: JobApplicationDetails[] = ([
  {
    applicationId: 'app-1',
    job_post_id: JOB_POSTS[0].id,
    userId: 'js-1',
    username: 'css_ninja',
    status: 'Pending',
    appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    coverLetter: 'Hi! I do pixel-perfect layouts, Tailwind, BEM, etc.',

    // страна как раньше
    country_code: 'LT',
    country_name: 'Lithuania',

    // новое поле как у бэка
    applicant_date_of_birth: '1995-03-12',
  },
  {
    applicationId: 'app-2',
    job_post_id: JOB_POSTS[0].id,
    userId: 'js-2',
    username: 'grid_master',
    status: 'Accepted',
    appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    coverLetter: 'Animations, accessibility, complex CSS grids.',

    country_code: 'PL',
    country_name: 'Poland',
    applicant_date_of_birth: '1990-11-05',
  },
  {
    applicationId: 'app-3',
    job_post_id: JOB_POSTS[1].id,
    userId: 'js-3',
    username: 'api_guru',
    status: 'Pending',
    appliedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
    coverLetter: 'Node.js, REST, WebSockets, testing.',

    country_code: 'DE',
    country_name: 'Germany',
    applicant_date_of_birth: '1988-07-22',
  },
] as unknown) as JobApplicationDetails[];


/* -------------------- MOCK DATA: CHAT MESSAGES -------------------- */

const makeMsg = (p: Partial<Message>): Message =>
  ({
    id: p.id || `m-${Math.random().toString(36).slice(2, 8)}`,
    job_application_id: p.job_application_id!,
    sender_id: p.sender_id || 'unknown',
    recipient_id: p.recipient_id || 'unknown',
    content: p.content || '',
    is_read: p.is_read ?? false,
    created_at: p.created_at || stamp(),
    updated_at: p.updated_at || stamp(),
  } as Message);

const MESSAGES_BY_APPLICATION: Record<string, Message[]> = {
  'app-1': [
    makeMsg({
      job_application_id: 'app-1',
      sender_id: 'js-1',
      recipient_id: EMPLOYER.id,
      content: 'Hi! Thanks for considering my application 👋',
      created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      is_read: true,
    }),
    makeMsg({
      job_application_id: 'app-1',
      sender_id: EMPLOYER.id,
      recipient_id: 'js-1',
      content: 'Hi! Your profile looks great. Could you share 2–3 portfolio links?',
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      is_read: false,
    }),
  ],
  'app-2': [
    makeMsg({
      job_application_id: 'app-2',
      sender_id: EMPLOYER.id,
      recipient_id: 'js-2',
      content: 'We would like to move forward with you 🎉',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      is_read: true,
    }),
    makeMsg({
      job_application_id: 'app-2',
      sender_id: 'js-2',
      recipient_id: EMPLOYER.id,
      content: 'Awesome, thank you! When can we schedule a call?',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      is_read: true,
    }),
  ],
  'app-3': [
    makeMsg({
      job_application_id: 'app-3',
      sender_id: 'js-3',
      recipient_id: EMPLOYER.id,
      content: 'Hi! Happy to clarify any details about my backend experience.',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      is_read: false,
    }),
  ],
};

/* -------------------- EXPORTED MOCK API (ровно как ждёт Messages) -------------------- */

export async function getMyApplications(): Promise<JobApplication[]> {
  await delay(150);
  return MY_APPLICATIONS;
}

export async function getMyJobPosts(): Promise<JobPost[]> {
  await delay(150);
  return JOB_POSTS;
}

export async function getApplicationsForJobPost(jobPostId: string): Promise<JobApplicationDetails[]> {
  await delay(200);
  return APPLICATION_DETAILS.filter(a => String(a.job_post_id) === String(jobPostId));
}

export async function getChatHistory(
  jobApplicationId: string,
  params?: { page?: number; limit?: number },
  _roleForChatApi?: 'employer' | 'jobseeker'
): Promise<{ total: number; data: Message[] }> {
  await delay(150);
  const id = String(jobApplicationId);
  const all = [...(MESSAGES_BY_APPLICATION[id] || [])].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 100;
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit);

  return { total: all.length, data };
}

export async function createReview(data: {
  job_application_id: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  await delay(200);
  return {
    id: `rev-${Math.random().toString(36).slice(2, 10)}`,
    reviewer_id: 'current-user',
    reviewed_id: 'other-user',
    job_application_id: data.job_application_id,
    rating: data.rating,
    comment: data.comment,
    status: 'Approved',
    created_at: stamp(),
    updated_at: stamp(),
  } as any;
}

export async function broadcastToApplicants(
  jobPostId: string,
  content: string
): Promise<{ sent: number }> {
  await delay(250);
  const count = APPLICATION_DETAILS.filter(a => a.job_post_id === jobPostId).length;
  console.log('[MOCK] broadcastToApplicants', { jobPostId, content, sent: count });
  return { sent: count };
}

export async function broadcastToSelected(
  _jobPostId: string,
  payload: { applicationIds: string[]; content: string }
): Promise<{ sent: number }> {
  await delay(250);
  console.log('[MOCK] broadcastToSelected', payload);
  return { sent: payload.applicationIds.length };
}

export async function bulkRejectApplications(
  applicationIds: string[]
): Promise<{ updated: number; updatedIds: string[] }> {
  await delay(250);
  console.log('[MOCK] bulkRejectApplications', applicationIds);
  return { updated: applicationIds.length, updatedIds: applicationIds };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string
): Promise<JobApplication> {
  await delay(200);
  console.log('[MOCK] updateApplicationStatus', { applicationId, status });

  // чуть-чуть дружбы с локальным массивом (для красоты в dev)
  const idxApp = MY_APPLICATIONS.findIndex(a => String(a.id) === String(applicationId));
  if (idxApp !== -1) {
    (MY_APPLICATIONS[idxApp] as any).status = status;
  }
  const idxDet = APPLICATION_DETAILS.findIndex(a => String(a.applicationId) === String(applicationId));
  if (idxDet !== -1) {
    (APPLICATION_DETAILS[idxDet] as any).status = status;
  }

  return ({
    id: applicationId,
    status,
  } as unknown) as JobApplication;
}

export async function closeJobPost(id: string): Promise<JobPost> {
  await delay(200);
  console.log('[MOCK] closeJobPost', id);
  const post = JOB_POSTS.find(p => String(p.id) === String(id));
  if (post) {
    (post as any).status = 'Closed';
    return post;
  }
  return ({
    id,
    title: 'Unknown job',
    status: 'Closed',
  } as unknown) as JobPost;
}
