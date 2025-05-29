import axios from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { 
  User, Profile, JobPost, Category, JobApplication, Review, Feedback, 
  BlockedCountry, LoginCredentials, RegisterCredentials 
} from '@types';

const getFingerprint = async () => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication
export const register = async (credentials: RegisterCredentials) => {
  const fingerprint = await getFingerprint();
  const response = await api.post<{ accessToken: string }>('/auth/register', credentials, {
    headers: {
      'x-fingerprint': fingerprint,
    },
  });
  return response.data;
};

export const login = async (credentials: LoginCredentials) => {
  const response = await api.post<{ accessToken: string }>('/auth/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await api.post<{ message: string }>('/auth/logout');
  return response.data;
};

export const requestPasswordReset = async (email: string) => {
  const response = await api.post<{ message: string }>('/auth/reset-password-request', { email });
  return response.data;
};

export const confirmPasswordReset = async (token: string, newPassword: string) => {
  const response = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword });
  return response.data;
};

// Profile
export const getProfile = async () => {
  const response = await api.get<Profile>('/profile');
  return response.data;
};

export const getUserProfileById = async (id: string) => {
  const response = await api.get<Profile>(`/users/${id}`);
  return response.data;
};

export const updateProfile = async (data: Partial<Profile>) => {
  const response = await api.put<Profile>('/profile', data);
  return response.data;
};

export const deleteAccount = async () => {
  const response = await api.delete<{ message: string }>('/profile');
  return response.data;
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

// Job Posts
export const createJobPost = async (data: Partial<JobPost>) => {
  const response = await api.post<JobPost>('/job-posts', data);
  return response.data;
};

export const updateJobPost = async (id: string, data: Partial<JobPost>) => {
  const response = await api.put<JobPost>(`/job-posts/${id}`, data);
  return response.data;
};

export const getJobPost = async (id: string) => {
  const response = await api.get<JobPost>(`/job-posts/${id}`);
  return response.data;
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
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}) => {
  const response = await api.get<JobPost[]>('/job-posts', { params });
  return response.data;
};

export const searchJobseekers = async (params: {
  username?: string;
  skills?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await api.get<Profile[]>('/users', {
    params: { ...params, role: 'jobseeker' },
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
export const createCategory = async (name: string) => {
  const response = await api.post<Category>('/categories', { name });
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get<Category[]>('/categories');
  return response.data;
};

// Job Applications
export const applyToJobPost = async (job_post_id: string) => {
  const response = await api.post<JobApplication>('/job-applications', { job_post_id });
  return response.data;
};

export const getMyApplications = async () => {
  const response = await api.get<JobApplication[]>('/job-applications/my-applications');
  return response.data;
};

export const getApplicationsForJobPost = async (jobPostId: string) => {
  const response = await api.get<
    { id: string; userId: string; username: string; email: string; jobDescription: string; appliedAt: string; status: string }[]
  >(`/job-applications/job-post/${jobPostId}`);
  return response.data;
};

export const updateApplicationStatus = async (applicationId: string, status: 'Accepted' | 'Rejected') => {
  const response = await api.put<JobApplication>(`/job-applications/${applicationId}`, { status });
  return response.data;
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

// Admin Endpoints
export const getAllUsers = async (params: { username?: string; email?: string; createdAfter?: string }) => {
  const response = await api.get<User[]>('/admin/users', { params });
  return response.data;
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

export const exportUsersToCSV = async () => {
  const response = await api.get('/admin/users/export-csv', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'users.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

export const getUserOnlineStatus = async (id: string) => {
  const response = await api.get<{ userId: string; isOnline: boolean }>(`/users/${id}/online`);
  return response.data;
};

export const getAllJobPosts = async (params: { status?: string; pendingReview?: string }) => {
  const response = await api.get<JobPost[]>('/admin/job-posts', { params });
  return response.data;
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
  const response = await api.post<JobPost>(`/admin/job-posts/${id}/approve`);
  return response.data;
};

export const flagJobPost = async (id: string) => {
  const response = await api.post<JobPost>(`/admin/job-posts/${id}/flag`);
  return response.data;
};

export const setJobPostApplicationLimitAdmin = async (id: string, limit: number) => {
  const response = await api.post<{ message: string; limit: number }>(
    `/admin/job-posts/${id}/set-application-limit`,
    { limit }
  );
  return response.data;
};

export const getAllReviews = async () => {
  const response = await api.get<Review[]>('/admin/reviews');
  return response.data;
};

export const deleteReview = async (id: string) => {
  const response = await api.delete<{ message: string }>(`/admin/reviews/${id}`);
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
  }>('/admin/analytics');
  return response.data;
};

export const getRegistrationStats = async (params: { startDate: string; endDate: string; interval: string }) => {
  const response = await api.get<{ period: string; count: number }[]>('/admin/analytics/registrations', { params });
  return response.data;
};

export const getGeographicDistribution = async () => {
  const response = await api.get<{ country: string; count: number; percentage: string }[]>(
    '/admin/analytics/geographic-distribution'
  );
  return response.data;
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
export const submitFeedback = async (message: string) => {
  const response = await api.post<Feedback>('/feedback', { message });
  return response.data;
};

export const getFeedback = async () => {
  const response = await api.get<Feedback[]>('/admin/feedback');
  return response.data;
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
  skills?: string;
  experience?: string;
  rating?: number;
  timezone?: string;
  category_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}) => {
  const response = await api.get<Profile[]>('/talents', { params });
  return response.data;
};