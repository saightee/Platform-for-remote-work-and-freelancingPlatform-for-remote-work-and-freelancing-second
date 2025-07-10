import axios, { AxiosResponse, AxiosError } from 'axios';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { 
  User, Profile, JobPost, Category, JobApplication, Review, Feedback, 
  BlockedCountry, LoginCredentials, RegisterCredentials, PaginatedResponse,
  JobSeekerProfile, JobApplicationDetails
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
  withCredentials: true, // Включение отправки и получения cookies
});

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Интерцептор ответов для обработки ошибок
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error('Axios error:', err.message, err.config?.url, err.code);
    return Promise.reject(err);
  }
);


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
export const register = async (credentials: RegisterCredentials) => {
  const fingerprint = await getFingerprint();
  const response = await api.post<{ message: string }>('/auth/register', credentials, {
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

export const forgotPassword = async (email: string) => {
  const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
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
  console.log(`Fetching job post with ID: ${id}`);
  try {
    const response = await api.get<JobPost>(`/job-posts/${id}`);
    console.log(`Job post ${id} fetched:`, response.data);
    return response.data;
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
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}) => {
  const response = await api.get<PaginatedResponse<JobPost>>('/job-posts', { params });
  return response.data;
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
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    console.error('Error fetching categories:', axiosError.response?.data?.message || axiosError.message);
    throw axiosError;
  }
};

// Job Applications
export const applyToJobPost = async (job_post_id: string) => {
  const response = await api.post<JobApplication>('/job-applications', { job_post_id });
  return response.data;
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

// Admin Endpoints
export const getAllUsers = async (params: { username?: string; email?: string; createdAfter?: string; page?: number; limit?: number }) => {
  const response = await api.get<PaginatedResponse<User>>('/admin/users', {
    params,
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
  console.log('getAllUsers response:', response.data); // Лог ответа
  return response.data;
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

export const getAllJobPosts = async (params: { status?: string; pendingReview?: string; title?: string; page?: number; limit?: number }) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const endpoint = decoded?.role === 'moderator' ? '/moderator/job-posts' : '/admin/job-posts';

  try {
    const response = await api.get<PaginatedResponse<JobPost>>(endpoint, { params });
    return response.data;
  } catch (error) {
    console.error(`Error fetching job posts from ${endpoint}:`, error);
    throw error; // Пробрасываем ошибку для обработки в компоненте
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

export const getGeographicDistribution = async (params: { startDate?: string; endDate?: string; role?: 'jobseeker' | 'employer' | 'all' } = {}) => {
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

export const getChatHistory = async (jobApplicationId: string, params: { page?: number; limit?: number }) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const isModerator = decoded?.role === 'moderator';
  const endpoint = isModerator ? `/moderator/chat/${jobApplicationId}` : `/admin/chat/${jobApplicationId}`;
  const response = await api.get<{
    total: number;
    data: {
      id: string;
      job_application_id: string;
      sender_id: string;
      sender: { id: string; username: string; email: string; role: string };
      recipient_id: string;
      recipient: { id: string; username: string; email: string; role: string };
      content: string;
      created_at: string;
      is_read: boolean;
    }[];
  }>(endpoint, { params });
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

export const deletePlatformFeedback = async (id: string) => {
  const token = localStorage.getItem('token');
  const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
  const isModerator = decoded?.role === 'moderator';
  const endpoint = isModerator ? `/moderator/platform-feedback/${id}` : `/admin/platform-feedback/${id}`;
  const response = await api.delete<{ message: string }>(endpoint);
  return response.data;
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
  skills?: string;
  experience?: string;
  description?: string;
  rating?: number;
  timezone?: string;
  skill_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}) => {
  const response = await api.get<PaginatedResponse<JobSeekerProfile>>('/talents', { params });
  return response.data;
};

export const checkJobApplicationStatus = async (job_post_id: string) => {
  const response = await api.get<{ hasApplied: boolean }>(`/job-applications/check/${job_post_id}`);
  return response.data;
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
  employer_id?: string; // Добавляем employer_id для ясности
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
    const response: AxiosResponse<{ id: string; title: string; status: string; applicationCount: number; created_at: string; employer_id: string; employer_username?: string }[]> = await api.get('/admin/job-posts/applications', {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    console.log('getJobPostsWithApplications response:', response.data); // Логирование для диагностики
    const enrichedData = await Promise.all(response.data.map(async (post) => {
      try {
        // Если employer_username уже пришел в ответе, используем его
        if (post.employer_username) {
          return { ...post, username: post.employer_username, applicationCount: post.applicationCount || 0 } as JobPostWithApplications;
        }
        // Проверяем валидность employer_id
        if (!post.employer_id || post.employer_id === 'undefined') {
          console.warn(`Invalid employer_id for job post ${post.id}: ${post.employer_id}`);
          return { ...post, username: 'N/A', applicationCount: post.applicationCount || 0 } as JobPostWithApplications;
        }
        const employer = await getUserById(post.employer_id);
        if (!employer || !employer.username) {
          console.warn(`No username found for employer_id ${post.employer_id} for job post ${post.id}`);
          return { ...post, username: 'N/A', applicationCount: post.applicationCount || 0 } as JobPostWithApplications;
        }
        return { ...post, username: employer.username, applicationCount: post.applicationCount || 0 } as JobPostWithApplications;
      } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        console.error(`Error fetching employer for job post ${post.id}:`, axiosError.response?.data?.message || axiosError.message);
        return { ...post, username: 'N/A', applicationCount: post.applicationCount || 0 } as JobPostWithApplications;
      }
    }));
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