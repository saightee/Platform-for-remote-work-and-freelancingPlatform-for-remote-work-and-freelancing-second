

import axios, { AxiosResponse, AxiosError, AxiosHeaders } from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { 
  User, Profile, JobPost, Category, JobApplication, Review, Feedback, 
  BlockedCountry, LoginCredentials, RegisterCredentials, PaginatedResponse,
  JobSeekerProfile, JobApplicationDetails, Message, PlatformFeedbackAdminItem, PlatformFeedbackList, ChatNotificationsSettings
} from '@types';


interface WebSocketMessage {
  id: string;
  job_application_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

export async function contactSupport(payload: {
  name: string;
  email: string;
  message: string;
  captchaToken?: string;
  website?: string;
}) {
  const { data } = await api.post('/contact', {
    ...payload,
    email: normalizeEmail(payload.email),
  });
  return data;
}

// UI-helper: отразить те же правила, что и на бэке
export const isStrongPassword = (pw: string) =>
  typeof pw === 'string' &&
  pw.length >= 10 &&
  /[a-z]/.test(pw) &&
  /[A-Z]/.test(pw) &&
  /\d/.test(pw) &&
  /[^A-Za-z0-9]/.test(pw);



interface WebSocketError {
  statusCode: number;
  message: string;
}

interface ComplaintData {
  job_post_id?: string;
  profile_id?: string;
  reason: string;
}

interface DecodedToken {
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
}


let __fpPromise: Promise<string> | null = null;
const LS_FP_KEY = 'device_fingerprint_v1';

export const getFingerprint = async (): Promise<string> => {
  // 1) если есть сохранённый — вернём его
  const cached = localStorage.getItem(LS_FP_KEY);
  if (cached) return cached;

  // 2) мемоизируем вычисление, чтобы не грузить FingerprintJS несколько раз
  if (!__fpPromise) {
    __fpPromise = (async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const id = result.visitorId;
        localStorage.setItem(LS_FP_KEY, id);
        return id;
      } catch (e) {
        // 3) fallback, если FingerprintJS не отработал (офлайн/блокировки и т.п.)
        const fallback = crypto.randomUUID();
        localStorage.setItem(LS_FP_KEY, fallback);
        return fallback;
      }
    })();
  }
  return __fpPromise;
};


// const api = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   withCredentials: true, // Включение отправки и получения cookies
// });



api.interceptors.request.use(async (config) => {
  const headers = (config.headers instanceof AxiosHeaders)
    ? config.headers
    : new AxiosHeaders(config.headers);

  const token = localStorage.getItem('token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Всегда отправляем стабильный fingerprint (участвует в rate-limit логина, обязателен для регистрации)
  try {
    const fp = await getFingerprint();
    headers.set('x-fingerprint', fp);
  } catch {
    // fallback реализован внутри getFingerprint, сюда почти не попадём
  }

  config.headers = headers;
  return config;
});



// Интерцептор ответов для обработки ошибок
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('Axios error:', err.message, err.config?.url, err.code);
    const token = localStorage.getItem('token');
    if (err.response?.status === 401 && token) {
      localStorage.removeItem('token');
      document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const submitPlatformFeedback = async (rating: number, description: string) => {
  console.warn('submitPlatformFeedback(rating, description) is deprecated; use submitSuccessStory(payload) instead.');
  const response = await api.post('/platform-feedback', { rating, description });
  return response.data;
};

export type IssuePayload = {
  category: 'Bug' | 'UI' | 'Performance' | 'Data' | 'Other';
  summary: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
};

export type StoryPayload = {
  headline: string;
  story: string;
  role: 'Employer' | 'Jobseeker';
  company?: string;
  country?: string;
  consent_public: true; // должен быть true
};


// services/api.ts
export const submitIssueFeedback = async (payload: IssuePayload) => {
  const res = await api.post('/feedback', payload);
  return res.data;
};

export const submitSuccessStory = async (payload: {
  headline: string;
  story: string;
  rating: number;
  allow_publish: boolean;
  company?: string;
  country?: string;
}) => {
  const res = await api.post('/platform-feedback', payload);
  return res.data;
};


export const initializeWebSocket = (
  onMessage: (message: WebSocketMessage) => void,
  onError: (error: WebSocketError) => void
): Socket => {
  const token = localStorage.getItem('token');
  const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3000/socket.io/';
  
  const socket = io(wsBaseUrl, {
    path: '/socket.io/', 
    auth: { token: token ? `Bearer ${token}` : '' },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 3000,
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected, ID:', socket.id, 'Transport:', socket.io.engine.transport.name, 'URL:', wsBaseUrl);
  });

  socket.on('newMessage', onMessage);
  socket.on('error', (error) => {
    console.error('WebSocket server error:', error);
    onError(error);
  });

  socket.on('connect_error', (err) => {
    console.error('WebSocket connection error:', err.message);
    onError({ statusCode: 500, message: err.message });
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  return socket;
};

// Authentication
const normalizeEmail = (e: string) => e?.trim().toLowerCase();



export const register = async (payload: any) => {
  const fingerprint = await getFingerprint();

  const isFormData =
    typeof FormData !== 'undefined' && payload instanceof FormData;

  const headers: Record<string, any> = { 'x-fingerprint': fingerprint };
  if (isFormData) headers['Content-Type'] = undefined; // <— ключевой момент

  const { data } = await api.post<{ message: string }>(
    '/auth/register',
    payload,
    { headers }
  );
  return data;
};




export const login = async (credentials: LoginCredentials) => {
  const fingerprint = await getFingerprint();
  const body = {
    ...credentials,
    email: normalizeEmail(credentials.email),
  };

  // интерцептор тоже поставит x-fingerprint, но локально явно укажем (участвует в rate-limit)
  const response = await api.post<{ accessToken: string }>('/auth/login', body, {
    headers: { 'x-fingerprint': fingerprint },
  });
  return response.data;
};


export const logout = async () => {
  try {
    const response = await api.post<{ message: string }>('/auth/logout');
    document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; // Очистка cookie
    return response.data;
  } catch (error) {
    console.error('Logout error:', error);
    document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; // Очистка при ошибке
    throw error;
  }
};

export const requestPasswordReset = async (email: string) => {
  const response = await api.post<{ message: string }>('/auth/reset-password-request', { email: normalizeEmail(email) });
  return response.data;
};

export const confirmPasswordReset = async (token: string, newPassword: string) => {
  const response = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  return response.data;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post<{ message: string }>('/auth/forgot-password', { email: normalizeEmail(email) });
  return response.data;
};


export const verifyEmail = async (token: string) => {
  const response = await api.get<{ message: string }>('/auth/verify-email', { params: { token } });
  return response.data;
};

// Profile
export const getProfile = async () => {
  console.log('Fetching profile from /profile/myprofile');
  try {
    const response = await api.get<Profile>('/profile/myprofile');
    console.log('Profile response:', response.data);
    return response.data;
  } catch (error) {
    console.error('GetProfile error:', error);
    throw error;
  }
};

export const getUserProfileById = async (id: string) => {
  console.log(`Fetching user profile with ID: ${id}`);
  try {
    const response = await api.get<JobSeekerProfile>(`/profile/${id}`);
    console.log(`Profile ${id} fetched:`, response.data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error(`Error fetching profile for ID ${id}:`, axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

export const updateProfile = async (data: Partial<Profile>) => {
  const response = await api.put<Profile>('/profile', data);
  return response.data;
};

export const deleteAccount = async () => {
  const response = await api.delete<{ message: string }>('/profile');
  return response.data;
};

export const searchCategories = async (term: string) => {
  try {
    const response = await api.get<Category[]>('/categories/search', {
      params: { term },
    });
    console.log('Search categories response:', response.data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error searching categories:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

export const uploadAvatar = async (formData: FormData) => {
  const response = await api.post<Profile>('/profile/upload-avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadIdentityDocument = async (formData: FormData) => {
  const response = await api.post<Profile>('/profile/upload-identity', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const uploadResume = async (formData: FormData) => { // Добавлено: новая функция
  const response = await api.post<Profile>('/profile/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getEmailStatsForJob = async (id: string) => {
  const response = await api.get<{
    sent: number;
    opened: number;
    clicked: number;
    details: { email: string; username: string; opened: boolean; clicked: boolean; sent_at: string; opened_at: string | null; clicked_at: string | null; }[];
  }>(`/admin/job-posts/${id}/email-stats`);
  return response.data;
};

export const getAllEmailStats = async (params: {
  jobPostId?: string;
  title?: string;
  employerId?: string;
  employerEmail?: string;
  employerUsername?: string;
}) => {
  const response = await api.get<{
    sent: number;
    opened: number;
    clicked: number;
    details: { job_post_id: string; email: string; username: string; opened: boolean; clicked: boolean; sent_at: string; opened_at: string | null; clicked_at: string | null; }[];
  }>('/admin/email-stats', { params });
  return response.data;
};



export const generateDescription = async (data: {
  aiBrief: string;
  title?: string;
  location?: string;
  salary?: number | null;
  salary_type?: 'per hour' | 'per month' | 'negotiable';
  job_type?: 'Full-time' | 'Part-time' | 'Project-based';
}) => {
  const token = localStorage.getItem('token'); // Добавлено: явный token на случай
  try {
    const response = await api.post('/job-posts/generate-description', data, {
      headers: { Authorization: `Bearer ${token}` } // Добавлено: headers для surety
    });
    console.log('Generate description response:', response.data); // Добавлено: лог для отладки
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error generating description:', axiosError.response?.data?.message || axiosError.message, 'URL:', api.defaults.baseURL + '/job-posts/generate-description');
    throw axiosError;
  }
};

export const rejectJobPost = async (id: string, reason: string) => {
  const response = await api.post(`/admin/job-posts/${id}/reject`, { reason });
  return response.data;
};

// Create referral link (optional description)
export const createReferralLink = async (
  jobPostId: string,
  payload: { description?: string } = {}
) => {
  const res = await api.post<{
    id: string;
    refCode: string;
    fullLink: string;
    jobPostId: string;
    description?: string | null;
    clicks: number;
    registrations: number;
    created_at?: string;
  }>(`/admin/job-posts/${jobPostId}/referral-links`, payload);
  return res.data;
};

// List referral links (global) — supports filters jobId, jobTitle
export const getReferralLinks = async (params: { jobId?: string; jobTitle?: string } = {}) => {
  const res = await api.get<
    {
      id: string;
      refCode: string;
      fullLink: string;
      jobPostId: string;
      description?: string | null;
      clicks: number;
      registrations: number;
      created_at?: string;
      job_post?: { id: string; title: string };
      registrationsDetails?: { user: { id: string; username: string; email: string; role: string; created_at: string } }[];
    }[]
  >('/admin/referral-links', { params });
  return res.data;
};

// List referral links by job post
export const getReferralLinksByJob = async (jobPostId: string) => {
  const res = await api.get<
    {
      id: string;
      refCode: string;
      fullLink: string;
      jobPostId: string;
      description?: string | null;
      clicks: number;
      registrations: number;
      created_at?: string;
    }[]
  >(`/admin/job-posts/${jobPostId}/referral-links`);
  return res.data;
};

// Update referral link description
export const updateReferralLink = async (linkId: string, payload: { description: string }) => {
  const res = await api.put<{ id: string; description?: string }>(`/admin/referral-links/${linkId}`, payload);
  return res.data;
};

export const broadcastToApplicants = async (jobPostId: string, content: string) => {
  const res = await api.post<{ sent: number }>(`/chat/broadcast/${jobPostId}`, { content });
  return res.data;
};

export const broadcastToSelected = async (
  jobPostId: string,
  payload: { applicationIds: string[]; content: string }
) => {
  const res = await api.post(`/chat/broadcast-selected/${jobPostId}`, payload);
  return res.data as { sent: number };
};

export const bulkRejectApplications = async (applicationIds: string[]) => {
  const res = await api.post('/job-applications/bulk-reject', { applicationIds });
  return res.data as { updated: number; updatedIds: string[] };
};

// Delete referral link
export const deleteReferralLink = async (linkId: string) => {
  const res = await api.delete<{ message: string }>(`/admin/referral-links/${linkId}`);
  return res.data;
};


// Job Posts
export const createJobPost = async (data: Partial<JobPost>) => {
  // Нормализуем кейсы ключей, если вдруг прилетят camelCase
  const body: any = { ...data };

  if (body.categoryId && !body.category_id) {
    body.category_id = body.categoryId;
    delete body.categoryId;
  }
  if (body.salaryType && !body.salary_type) {
    body.salary_type = body.salaryType;
    delete body.salaryType;
  }
  if (body.excludedLocations && !body.excluded_locations) {
    body.excluded_locations = body.excludedLocations;
    delete body.excludedLocations;
  }
  if (body.jobType && !body.job_type) {
    body.job_type = body.jobType;
    delete body.jobType;
  }

  const response = await api.post<JobPost>('/job-posts', body);
  return response.data;
};


export const updateJobPost = async (id: string, data: Partial<JobPost>) => {
  const response = await api.put<JobPost>(`/job-posts/${id}`, data);
  return response.data;
};

export const getJobPost = async (id: string) => {
  console.log(`Fetching job post with ID: ${id}`);
  try {
    const response = await api.get<JobPost>(`/job-posts/${id}`);
    const job = response.data as any;

    // category fallback (single)
    if (!job?.category && job?.category_id != null) {
      const cats = await __ensureCategories();
      const cat = __findCatById(job.category_id, cats);
      if (cat) job.category = { id: cat.id, name: cat.name };
    }

    // employer fallback
    if ((!job?.employer || !job.employer?.username) && job?.employer_id != null) {
      try {
        const p = await getUserProfileById(String(job.employer_id));
        job.employer = {
          id: String((p as any).id ?? job.employer_id),
          username: p.username || 'Unknown',
          avatar: p.avatar || null,
          company_name: (p as any).company_name || undefined,
        };
      } catch (e) {
        console.warn(`Employer fallback failed for job ${id}`, e);
      }
    }

    // --- NEW: build categories[] from category_ids (multi) + keep backward compatibility ---
    try {
      const catsTree = await __ensureCategories();
      const ids: string[] =
        Array.isArray(job?.category_ids) ? job.category_ids.map((x: any) => String(x))
        : (job?.category_id != null ? [String(job.category_id)] : []);

      if (ids.length) {
        job.category_ids = ids; // normalize
        const mapped = ids.map((cid: string) => {
          const c = __findCatById(cid, catsTree);
          return c ? { id: String(c.id), name: c.name, parent_id: c.parent_id ?? null } : { id: cid, name: 'Unknown' };
        });
        job.categories = mapped;
        if (!job.category && mapped.length) {
          job.category = mapped[0]; // backward compat for places still reading .category
        }
      }
    } catch {/* ignore */}

    console.log(`Job post ${id} fetched:`, job);
    return job as JobPost;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error(`Error fetching job post ${id}:`, axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};




export const getMyJobPosts = async () => {
  const response = await api.get<JobPost[]>('/job-posts/my-posts');
  return response.data;
};

export const searchJobPosts = async (params: {
  title?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  job_type?: string;
  category_id?: string;
  required_skills?: string | string[];
  salary_type?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}) => {
  const { data } = await api.get<PaginatedResponse<JobPost>>('/job-posts', { params });

try {
  const cats = await __ensureCategories();
  data.data = await Promise.all(
    data.data.map(async (j) => {
      const job: any = { ...j };

      // category fallback
            // category fallback (single)
      if (!job.category && job.category_id != null) {
        const cat = __findCatById(job.category_id, cats);
        if (cat) job.category = { id: cat.id, name: cat.name };
      }

      // ✅ employer fallback
      if ((!job.employer || !job.employer?.username) && job.employer_id != null) {
        try {
          const p = await getUserProfileById(String(job.employer_id));
          job.employer = {
            id: String((p as any).id ?? job.employer_id),
            username: p.username || 'Unknown',
            avatar: p.avatar || null,
            company_name: (p as any).company_name || undefined,
          };
        } catch { /* ignore */ }
      }

      // --- NEW: multi-categories from category_ids ---
      if ((job as any).category_ids && Array.isArray((job as any).category_ids)) {
        const ids = (job as any).category_ids.map((x: any) => String(x));
        const mapped = ids.map((cid: string) => {
          const c = __findCatById(cid, cats);
          return c ? { id: String(c.id), name: c.name } : null;
        }).filter(Boolean);
        (job as any).categories = mapped;
        if (!job.category && mapped.length) job.category = mapped[0] as any;
      }

      return job as JobPost;

    })
  );
} catch {
  // молча пропускаем
}
return data;
};


export const searchJobseekers = async (params: {
  username?: string;
  skills?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get<PaginatedResponse<JobSeekerProfile>>('/talents', {
    params: { ...params },
  });
  return response.data;
};

export const closeJobPost = async (id: string) => {
  const response = await api.post<JobPost>(`/job-posts/${id}/close`);
  return response.data;
};

export const incrementJobView = async (id: string) => {
  const response = await api.post<{ message: string; views: number }>(`/job-posts/${id}/increment-view`);
  return response.data;
};

export const incrementProfileView = async (id: string) => {
  const response = await api.post<{ message: string; profile_views: number }>(`/profile/${id}/increment-view`);
  return response.data;
};

export const applyToJob = async (id: string) => {
  const response = await api.post(`/job-applications`, { job_post_id: id });
  return response.data;
};

export const setJobPostApplicationLimit = async (id: string, limit: number) => {
  const response = await api.post<{ message: string; limit: number }>(
    `/job-posts/${id}/set-application-limit`,
    { limit }
  );
  return response.data;
};

// Categories
export const createCategory = async (data: { name: string; parentId?: string }) => {
  const response = await api.post<Category>('/admin/categories', data);
  return response.data;
};

export const getCategories = async () => {
  try {
    const response = await api.get<Category[]>('/categories');
    console.log('Fetched categories:', response.data);
    __categoriesCache = response.data || []; // <-- обновляем кэш
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching categories:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};


// --- КЭШ И ХЕЛПЕРЫ ДЛЯ КАТЕГОРИЙ (добавить сразу после getCategories) ---
let __categoriesCache: Category[] | null = null;

const __flatCats = (cats: Category[]): Category[] =>
  cats.flatMap(c => [c, ...(c.subcategories ? __flatCats(c.subcategories) : [])]);

const __findCatById = (id: string | number, tree: Category[]): Category | undefined => {
  const all = __flatCats(tree);
  return all.find(c => String(c.id) === String(id));
};

const __ensureCategories = async (): Promise<Category[]> => {
  if (__categoriesCache && __categoriesCache.length) return __categoriesCache;
  try {
    const { data } = await api.get<Category[]>('/categories');
    __categoriesCache = data || [];
  } catch {
    __categoriesCache = [];
  }
  return __categoriesCache;
};


// Job Applications
export const applyToJobPost = async (job_post_id: string, cover_letter: string) => {
  const response = await api.post<JobApplication>('/job-applications', { job_post_id, cover_letter });
  return response.data;
};

export const applyToJobPostExtended = async (payload: {
  job_post_id: string;
  cover_letter: string;
  relevant_experience: string;     // NEW (required)
  full_name?: string;
  referred_by?: string;
}) => {
  const response = await api.post<JobApplication>('/job-applications', payload);
  return response.data;
};

/* ===================== Invitations API (93–96) ===================== */

/** Employer: send invitation to jobseeker (93) */
export const sendInvitation = async (payload: {
  job_post_id: string;
  job_seeker_id: string;
  message?: string;
}) => {
  const { data } = await api.post<{
    id: string;
    job_post_id: string;
    employer_id: string;
    job_seeker_id: string;
    status: 'Pending' | 'Accepted' | 'Declined';
    message?: string | null;
    created_at: string;
    updated_at: string;
  }>('/job-applications/invitations', payload);
  return data;
};

/** Jobseeker: list invitations (94) */
export const listInvitations = async (includeAll = false) => {
  const { data } = await api.get<Array<{
    id: string;
    status: 'Pending' | 'Accepted' | 'Declined';
    message?: string | null;
    created_at: string;
    job_post: {
      id: string;
      title: string;
      location?: string | null;
      salary?: number | null;
      salary_type?: 'per hour' | 'per month' | 'negotiable' | null;
      job_type?: 'Full-time' | 'Part-time' | 'Project-based' | null;
      slug?: string | null;
      slug_id?: string | null;
      employer?: { id: string; username: string } | null;
    };
    employer?: { id: string; username: string } | null;
  }>>('/job-applications/invitations', { params: { includeAll } });
  return data;
};

/** Jobseeker: decline invitation (95) */
export const declineInvitation = async (invitationId: string) => {
  const { data } = await api.post<{ id: string; status: 'Declined' }>(
    `/job-applications/invitations/${invitationId}/decline`
  );
  return data;
};

/** Jobseeker: accept invitation — starts application flow (96) */
export const acceptInvitation = async (
  invitationId: string,
  payload: {
    cover_letter?: string;
    relevant_experience?: string;
    full_name?: string;
    referred_by?: string;
  }
) => {
  const { data } = await api.post<{ id: string; status: 'Accepted' }>(
    `/job-applications/invitations/${invitationId}/accept`,
    payload
  );
  return data;
};

export const getMyApplications = async () => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  if (decoded?.role === 'admin' || decoded?.role === 'moderator') {
    console.log('Skipping getMyApplications for admin or moderator role');
    return [];
  }
  try {
    const response = await api.get<JobApplication[]>('/job-applications/my-applications', {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    console.log('getMyApplications response:', response.data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching applications:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

export const getApplicationsForJobPost = async (jobPostId: string) => {
  const response = await api.get<JobApplicationDetails[]>(`/job-applications/job-post/${jobPostId}`);
  console.log('Fetched applications:', response.data);
  return response.data;
};

export const updateApplicationStatus = async (applicationId: string, status: 'Accepted' | 'Rejected') => {
  console.log('Sending updateApplicationStatus', { applicationId, status, token: localStorage.getItem('token') });
  try {
    const response = await api.put<JobApplication>(`/job-applications/${applicationId}`, { status });
    console.log('updateApplicationStatus response:', response.data);
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error('updateApplicationStatus error:', axiosError.response?.data || axiosError.message);
    throw error;
  }
};

// Reviews
export const createReview = async (data: { job_application_id: string; rating: number; comment: string }) => {
  const response = await api.post<Review>('/reviews', data);
  return response.data;
};

export const getReviewsForUser = async (userId: string) => {
  const response = await api.get<Review[]>(`/reviews/user/${userId}`);
  return response.data;
};

// Complaints
export const submitComplaint = async (data: ComplaintData) => {
  const response = await api.post<{ message: string }>('/complaints', data);
  return response.data;
};




// services/api.ts
export const getAllUsers = async (params: {
  username?: string;
  email?: string;
  id?: string; // точное совпадение
  createdAfter?: string; // YYYY-MM-DD
  role?: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  status?: 'active' | 'blocked';
  page?: number;  // default: 1
  limit?: number; // default: 10
}) => {
  const { data } = await api.get<PaginatedResponse<User>>('/admin/users', {
    params,
  });

  if (import.meta?.env?.DEV) {
    // eslint-disable-next-line no-console
    console.log('getAllUsers response:', data);
  }

  return data; // { total, data: User[] }
};


export const getJobApplicationById = async (applicationId: string) => {
  console.log(`Fetching job application with ID: ${applicationId}`);
  try {
    const response = await api.get<JobApplication>(`/job-applications/${applicationId}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    console.log(`Job application ${applicationId} fetched:`, response.data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error(`Error fetching job application ${applicationId}:`, axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

export const getUserById = async (id: string) => {
  const response = await api.get<User>(`/admin/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, data: Partial<User>) => {
  const response = await api.put<User>(`/admin/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: string) => {
  const response = await api.delete<{ message: string }>(`/admin/users/${id}`);
  return response.data;
};

export const resetUserPassword = async (id: string, newPassword: string) => {
  const response = await api.post<{ message: string }>(`/admin/users/${id}/reset-password`, { newPassword });
  return response.data;
};

export const blockUser = async (id: string) => {
  const response = await api.post<{ message: string }>(`/admin/users/${id}/block`);
  return response.data;
};

export const unblockUser = async (id: string) => {
  const response = await api.post<{ message: string }>(`/admin/users/${id}/unblock`);
  return response.data;
};

export const getUserRiskScore = async (id: string) => {
  const response = await api.get<{ userId: string; riskScore: number; details: { duplicateIp: boolean; proxyDetected: boolean; duplicateFingerprint: boolean } }>(`/admin/users/${id}/risk-score`);
  return response.data;
};

// services/api.ts

// 1) Тип всех поддерживаемых бэком параметров экспорта
export interface AdminUserExportParams {
  role?: 'jobseeker' | 'employer' | 'admin' | 'moderator';
  status?: 'active' | 'blocked';
  q?: string;
  email?: string;
  username?: string;
  country?: string;            // 'unknown' для NULL
  provider?: string;           // 'none' для NULL
  referralSource?: string;
  isEmailVerified?: boolean;
  identityVerified?: boolean;
  hasAvatar?: boolean;
  hasResume?: boolean;         // для соискателей
  jobSearchStatus?: 'actively_looking' | 'open_to_offers' | 'hired';
  companyName?: string;        // для работодателей
  riskMin?: number;
  riskMax?: number;
  createdFrom?: string;        // YYYY-MM-DD
  createdTo?: string;          // YYYY-MM-DD (inclusive на бэке)
  lastLoginFrom?: string;      // YYYY-MM-DD
  lastLoginTo?: string;        // YYYY-MM-DD (inclusive на бэке)
  sortBy?: 'created_at' | 'last_login_at';
  order?: 'ASC' | 'DESC';
}

// 2) Хелпер: вытащить имя файла из Content-Disposition
const __filenameFromContentDisposition = (cd?: string | null) => {
  if (!cd) return null;
  // варианты: attachment; filename="users_20250915.csv"
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i.exec(cd);
  const raw = decodeURIComponent(m?.[1] || m?.[2] || m?.[3] || '').trim();
  return raw || null;
};

// 3) Обновлённая функция с params
export const exportUsersToCSV = async (params: AdminUserExportParams = {}) => {
  // ничего не переводим вручную — бэку ок со строковым query; booleans/числа axios сериализует нормально
  const res = await api.get('/admin/users/export-csv', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);

  // имя файла из заголовка
  const cd = (res.headers as any)?.['content-disposition'] || (res.headers as any)?.['Content-Disposition'];
  const fname = __filenameFromContentDisposition(cd) || 'users.csv';

  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};


export const getUserOnlineStatus = async (id: string) => {
  const response = await api.get<{ userId: string; isOnline: boolean }>(`/users/${id}/online`);
  return response.data;
};

export const getAllJobPosts = async (params: {
  status?: string;
  pendingReview?: string;
  title?: string;
  employer_id?: string;
  category_id?: string;
  employer_username?: string;
  id?: string;
  page?: number;
  limit?: number;
}) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const endpoint = decoded?.role === 'moderator' ? '/moderator/job-posts' : '/admin/job-posts';

  try {
    const response = await api.get<PaginatedResponse<JobPost>>(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching job posts from ${endpoint}:`, error);
    throw error;
  }
};


export const updateJobPostAdmin = async (id: string, data: Partial<JobPost>) => {
  const response = await api.put<JobPost>(`/admin/job-posts/${id}`, data);
  return response.data;
};

export const deleteJobPostAdmin = async (id: string) => {
  const response = await api.delete<{ message: string }>(`/admin/job-posts/${id}`);
  return response.data;
};

export const approveJobPost = async (id: string) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const isModerator = decoded?.role === 'moderator';
  const endpoint = isModerator ? `/moderator/job-posts/${id}/approve` : `/admin/job-posts/${id}/approve`;
  const response = await api.post<JobPost>(endpoint);
  return response.data;
};

export const flagJobPost = async (id: string) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const isModerator = decoded?.role === 'moderator';
  const endpoint = isModerator ? `/moderator/job-posts/${id}/flag` : `/admin/job-posts/${id}/flag`;
  const response = await api.post<JobPost>(endpoint);
  return response.data;
};

export const setJobPostApplicationLimitAdmin = async (id: string, limit: number) => {
  const response = await api.post<{ message: string; limit: number }>(
    `/admin/job-posts/${id}/set-application-limit`,
    { limit }
  );
  return response.data;
};

export const notifyCandidates = async (jobPostId: string, data: { limit: number; orderBy: 'beginning' | 'end' | 'random' }) => {
  const response = await api.post<{ total: number; sent: number; jobPostId: string }>(
    `/admin/job-posts/${jobPostId}/notify-candidates`,
    data
  );
  return response.data;
};

export const getAllReviews = async () => {
  const response = await api.get<Review[]>('/admin/reviews');
  return response.data;
};

export const deleteReview = async (id: string) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const isModerator = decoded?.role === 'moderator';
  const endpoint = isModerator ? `/moderator/reviews/${id}` : `/admin/reviews/${id}`;
  const response = await api.delete<{ message: string }>(endpoint);
  return response.data;
};


export const getAnalytics = async () => {
  const response = await api.get<{
    totalUsers: number;
    employers: number;
    jobSeekers: number;
    totalJobPosts: number;
    activeJobPosts: number;
    totalApplications: number;
    totalReviews: number;
  }>('/admin/analytics', {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  return response.data;
};

export const getRegistrationStats = async (params: { startDate: string; endDate: string; interval: string }) => {
  const response = await api.get<{ period: string; count: number }[]>('/admin/analytics/registrations', { params });
  return response.data;
};

export const getGeographicDistribution = async (params: {
  startDate?: string;
  endDate?: string;
  role?: 'jobseeker' | 'employer' | 'all';
  tzOffset?: number;                  // ← добавили, чтобы бэк знал локальную дату
} = {}) => {
  try {
    const response = await api.get<{ country: string; count: number }[]>(
      '/admin/analytics/geographic-distribution',
      { params }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching geographic distribution:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

export const getTopEmployers = async (limit?: number) => {
  const response = await api.get<{ employer_id: string; username: string; job_count: number }[]>(
    '/admin/leaderboards/top-employers',
    { params: { limit } }
  );
  return response.data;
};

export const getTopJobseekers = async (limit?: number) => {
  const response = await api.get<{ job_seeker_id: string; username: string; application_count: number }[]>(
    '/admin/leaderboards/top-jobseekers',
    { params: { limit } }
  );
  return response.data;
};

export const getTopJobseekersByViews = async (limit?: number) => {
  const response = await api.get<{ userId: string; username: string; email: string; profileViews: number }[]>(
    '/admin/leaderboards/top-jobseekers-by-views',
    { params: { limit } }
  );
  return response.data;
};

export const getTopEmployersByPosts = async (limit?: number) => {
  const response = await api.get<{ userId: string; username: string; email: string; jobCount: number }[]>(
    '/admin/leaderboards/top-employers-by-posts',
    { params: { limit } }
  );
  return response.data;
};

export const getGrowthTrends = async (params: { period: '7d' | '30d' }) => {
  const response = await api.get<{
    registrations: { period: string; count: number }[];
    jobPosts: { period: string; count: number }[];
  }>('/admin/analytics/growth-trends', { params });
  return response.data;
};

export const getComplaints = async () => {
  const response = await api.get<{
    id: string;
    complainant_id: string;
    complainant: { id: string; username: string; email: string; role: string };
    job_post_id?: string;
    job_post?: { id: string; title: string; description: string };
    profile_id?: string;
    reason: string;
    status: 'Pending' | 'Resolved' | 'Rejected';
    created_at: string;
    resolution_comment?: string;
  }[]>('/admin/complaints');
  return response.data;
};

export const resolveComplaint = async (id: string, data: { status: 'Resolved' | 'Rejected'; comment?: string }) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const isModerator = decoded?.role === 'moderator';
  const endpoint = isModerator ? `/moderator/complaints/${id}/resolve` : `/admin/complaints/${id}/resolve`;
  const response = await api.post(endpoint, data);
  return response.data;
};

export const getChatHistory = async (jobApplicationId: string, params: { page?: number; limit?: number } = {}, role: string) => {
  let endpoint = '/chat/' + jobApplicationId; // Для users (jobseeker/employer)
  if (role === 'admin') {
    endpoint = '/admin/chat/' + jobApplicationId;
  } else if (role === 'moderator') {
    endpoint = '/moderator/chat/' + jobApplicationId; // Если модераторы имеют отдельный, иначе используйте /admin/
  }
  console.log('Fetching chat history with endpoint:', endpoint); // Добавлено: лог для отладки
  const response = await api.get<{ total: number; data: Message[] }>(endpoint, { params });
  return response.data;
};

export const getAdminChatHistory = async (
  jobApplicationId: string,
  params: { page?: number; limit?: number } = {}
) => {
  const { data } = await api.get<{ total: number; data: Message[] }>(
    `/admin/chat/${jobApplicationId}`,
    { params }
  );
  return data; // { total, data: Message[] } — сортировка ASC по created_at
};

export const verifyIdentity = async (id: string, verify: boolean) => {
  const response = await api.post<Profile>(`/admin/profile/${id}/verify-identity`, { verify });
  return response.data;
};

export const setGlobalApplicationLimit = async (limit: number) => {
  const response = await api.post<{ message: string; limit: number }>('/admin/settings/application-limit', { limit });
  return response.data;
};

export const getGlobalApplicationLimit = async () => {
  const response = await api.get<{ globalApplicationLimit: number }>('/admin/settings/application-limit');
  return response.data;
};

// Feedback
// export const submitFeedback = async (message: string) => {
//   const response = await api.post<Feedback>('/feedback', { message });
//   return response.data;
// };

export const deletePlatformFeedback = async (id: string) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }
    // Не нужно декодировать и менять endpoint — backend проверит роль
    const endpoint = `/admin/platform-feedback/${id}`;
    const response = await api.delete<{ message: string }>(endpoint);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error deleting platform feedback:', axiosError);
    throw axiosError.response?.data?.message || 'Failed to delete feedback';
  }
};

export const getFeedback = async () => {
  try {
    const response = await api.get<Feedback[]>('/feedback');
    return response.data;
  } catch (error) {
    console.error('Error fetching feedback:', error);
    throw error;
  }
};

// Blocked Countries
export const addBlockedCountry = async (countryCode: string) => {
  const response = await api.post<BlockedCountry>('/admin/blocked-countries', { countryCode });
  return response.data;
};

export const removeBlockedCountry = async (countryCode: string) => {
  const response = await api.delete<{ message: string }>(`/admin/blocked-countries/${countryCode}`);
  return response.data;
};

export const getBlockedCountries = async () => {
  const response = await api.get<BlockedCountry[]>('/admin/blocked-countries');
  return response.data;
};

export const searchTalents = async (params: {
  skills?: string | string[];
  experience?: string;
  description?: string;
  rating?: number;
  timezone?: string;
  skill_id?: string;
  salary_type?: string;
  /** NEW: expected salary filters (no currency conversion) */
  expected_salary_min?: number;
  expected_salary_max?: number;
  /** NEW: job search status filter */
  job_search_status?: 'actively_looking' | 'open_to_offers' | 'hired';
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}) => {
  const response = await api.get<PaginatedResponse<JobSeekerProfile>>('/talents', { params });
  return response.data;
};


// export const checkJobApplicationStatus = async (job_post_id: string) => {
//   const response = await api.get<{ hasApplied: boolean }>(`/job-applications/check/${job_post_id}`);
//   return response.data;
// };

// services/api.ts
export const checkJobApplicationStatus = async (job_post_id: string) => {
  try {
    const { data } = await api.get<{ hasApplied: boolean }>(`/job-applications/check/${job_post_id}`);
    return data;
  } catch (e: any) {
    if (e?.response?.status === 404) return { hasApplied: false };
    throw e;
  }
};



export const sendApplicationNotification = async (applicationId: string, status: 'Accepted' | 'Rejected') => {
  const response = await api.post(`/job-applications/${applicationId}/notify`, { status });
  return response.data;
};

interface OnlineUsers {
  jobseekers: number;
  employers: number;
}

interface RecentRegistrations {
  jobseekers: { id: string; email: string; username: string; role: string; created_at: string }[];
  employers: { id: string; email: string; username: string; role: string; created_at: string }[];
}

export interface JobPostWithApplications {
  id: string;
  username: string;
  title: string;
  status: string;
  applicationCount: number;
  created_at: string;
  employer_id?: string; // Добавлено из docs employer.id
  employer?: { id: string; username: string; company_name?: string }; // Nested employer
  category?: string | { id: string; name: string }; // Поддержка string или object для гибкости (первичная)
  categories?: string[]; // NEW: массив названий категорий (для множественных)
}


export const getOnlineUsers = async (): Promise<OnlineUsers | null> => {
  try {
    const response: AxiosResponse<OnlineUsers> = await api.get('/admin/analytics/online-users');
    return response.data;
  } catch (error) {
    console.error('Error fetching online users:', error);
    return null;
  }
};

export const getRecentRegistrations = async (params: { limit?: number }): Promise<RecentRegistrations> => {
  try {
    const response: AxiosResponse<RecentRegistrations> = await api.get('/admin/analytics/recent-registrations', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching recent registrations:', error);
    return { jobseekers: [], employers: [] };
  }
};

export const getJobPostsWithApplications = async (): Promise<JobPostWithApplications[]> => {
  try {
    const response: AxiosResponse<{
      id: string;
      title: string;
      status: string;
      applicationCount: number;
      created_at: string;
      employer_id: string;
      employer_username?: string;
    }[]> = await api.get('/admin/job-posts/applications', {
      headers: { 'Cache-Control': 'no-cache' },
    });

    console.log('getJobPostsWithApplications response:', response.data);

    const enrichedData = await Promise.all(
      response.data.map(async (post: {
        id: string;
        title: string;
        status: string;
        applicationCount: number;
        created_at: string;
        employer_id: string;
        employer_username?: string;
      }) => {
        try {
          console.log('Processing post:', post);
          let username = 'N/A';

          if (post.employer_username) {
            username = post.employer_username;
          } else if (post.employer_id && post.employer_id !== 'undefined') {
            const employer = await getUserById(post.employer_id);
            username = employer?.username || 'N/A';
          } else {
            console.warn(`Invalid employer_id for job post ${post.id}: ${post.employer_id}`);
          }

          // Fetch categories from job post details (multi aware)
          const jobDetails = await getJobPost(post.id);
          const names = Array.isArray((jobDetails as any).categories)
            ? ((jobDetails as any).categories as Array<{ name: string }>).map(x => x.name)
            : (
                (jobDetails as any).category_ids && Array.isArray((jobDetails as any).category_ids)
                  ? (jobDetails as any).category_ids.map((id: any) => String(id))
                  : (jobDetails.category?.name ? [jobDetails.category.name] : [])
              );

          return {
            ...post,
            username,
            category: names[0] || 'N/A',   // совместимость со старым рендером
            categories: names,             // полный список
            applicationCount: post.applicationCount || 0,
          } as JobPostWithApplications;
        } catch (innerError) {
          const axiosError = innerError as AxiosError<{ message?: string }>;
          console.error(`Error enriching job post ${post.id}:`, axiosError.response?.data?.message || axiosError.message);

          return {
            ...post,
            username: post.employer_username || 'N/A',
            category: 'N/A',
            categories: [],
            applicationCount: post.applicationCount || 0,
          } as JobPostWithApplications;
        }
      })
    );

    return enrichedData;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching job posts with applications:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};


export const getStats = async () => {
  try {
    const response: AxiosResponse<{
      totalResumes: number;
      totalJobPosts: number;
      totalEmployers: number;
    }> = await api.get('/stats');
    console.log('Stats response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
    throw error;
  }
};

// Moderator Endpoints




export const getAllReviewsModerator = async () => {
  const response = await api.get<Review[]>('/moderator/reviews');
  return response.data;
};



export const getComplaintsModerator = async () => {
  const response = await api.get<{
    id: string;
    complainant_id: string;
    complainant: { id: string; username: string; email: string; role: string };
    job_post_id?: string;
    job_post?: { id: string; title: string; description: string };
    profile_id?: string;
    reason: string;
    status: 'Pending' | 'Resolved' | 'Rejected';
    created_at: string;
    resolution_comment?: string;
  }[]>('/moderator/complaints');
  return response.data;
};

export const getAdminCategories = async () => {
  try {
    const response = await api.get<Category[]>('/admin/categories');
    console.log('Fetched admin categories:', response.data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching admin categories:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

export const getPlatformFeedback = async (
  params?: { page?: number; limit?: number; is_public?: boolean }
): Promise<PlatformFeedbackList> => {
  const { data } = await api.get<PlatformFeedbackList>('/admin/platform-feedback', { params });
  return data; // { total, data: PlatformFeedbackAdminItem[] }
};

export const deleteCategory = async (id: string) => {
  const response = await api.delete<{ message: string }>(`/admin/categories/${id}`);
  return response.data;
};

export const publishPlatformFeedback = async (id: string) => {
  const { data } = await api.patch<PlatformFeedbackAdminItem>(`/admin/platform-feedback/${id}/publish`);
  return data;
};

export const unpublishPlatformFeedback = async (id: string) => {
  const { data } = await api.patch<PlatformFeedbackAdminItem>(`/admin/platform-feedback/${id}/unpublish`);
  return data;
};





export const resendVerification = async (email: string) => {
  const { data } = await api.post('/auth/resend-verification', { email: normalizeEmail(email) });
  return data;
};




const normalizeChatSettings = (s: any): ChatNotificationsSettings => ({
  enabled: !!s?.enabled,
  onEmployerMessage: {
    immediate: !!s?.onEmployerMessage?.immediate,
    delayedIfUnread: {
      enabled: !!s?.onEmployerMessage?.delayedIfUnread?.enabled,
      minutes: Number(s?.onEmployerMessage?.delayedIfUnread?.minutes ?? 60),
    },
    after24hIfUnread: {                                   // NEW
      enabled: !!s?.onEmployerMessage?.after24hIfUnread?.enabled,
      hours: Number(s?.onEmployerMessage?.after24hIfUnread?.hours ?? 24),
    },
    onlyFirstMessageInThread: !!s?.onEmployerMessage?.onlyFirstMessageInThread,
  },
  throttle: {
    perChatCount: Number(s?.throttle?.perChatCount ?? 2),
    perMinutes: Number(s?.throttle?.perMinutes ?? 60),
  },
});

export const getChatNotificationSettings = async (): Promise<ChatNotificationsSettings> => {
  const { data } = await api.get('/admin/settings/chat-notifications');
  return normalizeChatSettings(data);
};


export const updateChatNotificationSettings = async (
  payload: Partial<ChatNotificationsSettings>
): Promise<ChatNotificationsSettings> => {
  const { data } = await api.post('/admin/settings/chat-notifications', payload);
  return data;
};

export const notifyReferralApplicants = (
  jobPostId: string,
  payload: {
    limit: number;
    orderBy: 'beginning' | 'end' | 'random';
    titleContains?: string;       // опциональный фильтр по ключевому слову в названии прошлых вакансий
    categoryId?: string;          // если бэк будет поддерживать матчинг по категории
  }
) => api.post(`/admin/job-posts/${jobPostId}/notify-referral-applicants`, payload)
       .then(r => r.data);



// export const getJobBySlugOrId = async (slugOrId: string) => {
//   const { data } = await api.get<JobPost>(`/job-posts/by-slug-or-id/${slugOrId}`);
//   const job = data as any;

//   if (!job?.category && job?.category_id != null) {
//     const cats = await __ensureCategories();
//     const cat = __findCatById(job.category_id, cats);
//     if (cat) {
//       job.category = { id: cat.id, name: cat.name };
//     }
//   }

//   return job as JobPost;
// };

export const getJobBySlugOrId = async (slugOrId: string) => {
  const { data } = await api.get<JobPost>(`/job-posts/by-slug-or-id/${slugOrId}`);
  const job = data as any;

  // Категории — как было (single)
  if (!job?.category && job?.category_id != null) {
    const cats = await __ensureCategories();
    const cat = __findCatById(job.category_id, cats);
    if (cat) job.category = { id: cat.id, name: cat.name };
  }

  // 🔧 fallback по работодателю
  if ((!job?.employer || !job.employer?.username) && job?.employer_id != null) {
    try {
      const p = await getUserProfileById(String(job.employer_id));
      job.employer = {
        id: String((p as any).id ?? job.employer_id),
        username: p.username || 'Unknown',
        avatar: p.avatar || null,
        company_name: (p as any).company_name || undefined,
      };
    } catch {
      // ignore
    }
  }

  // --- NEW: build categories[] from category_ids (multi) + keep backward compatibility ---
  try {
    const catsTree = await __ensureCategories();
    const ids: string[] =
      Array.isArray(job?.category_ids) ? job.category_ids.map((x: any) => String(x))
      : (job?.category_id != null ? [String(job.category_id)] : []);

    if (ids.length) {
      job.category_ids = ids;
      const mapped = ids.map((cid: string) => {
        const c = __findCatById(cid, catsTree);
        return c ? { id: String(c.id), name: c.name, parent_id: c.parent_id ?? null } : { id: cid, name: 'Unknown' };
      });
      job.categories = mapped;
      if (!job.category && mapped.length) job.category = mapped[0];
    }
  } catch {/* ignore */}

  return job as JobPost;
};



// Track referral click once per visit
export const trackReferralClick = async (ref: string) => {
  try {
    await api.post('/ref/track', { ref });
  } catch (e) {
    console.warn('ref track failed', e);
  }
};

// либо импортируй сюда AdminRecentRegistrationsDTO,
// либо просто убери generic, чтобы не тянуть конфликтующее имя

export async function getRecentRegistrationsToday(opts?: { date?: string; tzOffset?: number; limit?: number }) {
  const tzOffset = opts?.tzOffset ?? -new Date().getTimezoneOffset();
  const today = (() => {
    if (opts?.date) return opts.date;
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  })();

  const limit = opts?.limit ?? 5;

  const { data } = await api.get('/admin/analytics/recent-registrations', {
    params: { date: today, tzOffset, limit },
  });
  return data; 
}

export async function adminFindJobPostsByTitle(title: string) {
  // сначала пытаемся админским списком (полнее), если что — публичным
  try {
    const res = await getAllJobPosts({ title, limit: 10, page: 1 });
    return res.data; // JobPost[]
  } catch {
    const res = await searchJobPosts({ title, limit: 10, page: 1 });
    return res.data; // JobPost[]
  }
}

// Список откликов по вакансии (использует уже существующий эндпоинт)
export async function adminListApplicationsForJob(jobPostId: string) {
  return getApplicationsForJobPost(jobPostId); // JobApplicationDetails[]
}

export const getBrandsAnalytics = async (params?: {
  startDate?: string; // 'YYYY-MM-DD'
  endDate?: string;   // 'YYYY-MM-DD'
}) => {
  const res = await api.get('/admin/analytics/brands', { params });
  return res.data as {
    range: { startDate: string; endDate: string };
    byBrand: Array<{ brand: string; total: number; employers: number; jobseekers: number }>;
    overall: { total: number; employers: number; jobseekers: number };
  };
};
