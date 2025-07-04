export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'employer' | 'jobseeker' | 'admin' | 'moderator';
  provider?: string | null;
  created_at: string;
  updated_at: string;
  is_blocked: boolean;
}

export interface EmployerProfile {
  id: string;
  role: 'employer';
  email: string;
  username: string;
  company_name?: string;
  company_info?: string;
  referral_link?: string;
  timezone?: string;
  currency?: string;
  average_rating?: number;
  avatar?: string | null;
  identity_verified: boolean;
  identity_document?: string | null;
  reviews: Review[];
}

export interface JobSeekerProfile {
  id: string;
  role: 'jobseeker';
  email?: string;
  username: string;
  skills?: string[];
  categories?: Category[];
  categoryIds?: string[];
  experience?: string;
  portfolio?: string;
  video_intro?: string;
  timezone?: string;
  currency?: string;
  average_rating: number;
  profile_views: number;
  avatar?: string | null;
  identity_verified: boolean;
  identity_document?: string | null;
  reviews: Review[];
}

export interface AdminProfile {
  id: string;
  role: 'admin';
  email: string;
  username: string;
  timezone?: string;
  currency?: string;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModeratorProfile {
  id: string;
  role: 'moderator';
  email: string;
  username: string;
  timezone?: string;
  currency?: string;
  avatar?: string | null;
  created_at: string;
  updated_at: string;
}

export type Profile = EmployerProfile | JobSeekerProfile | AdminProfile | ModeratorProfile;

export interface JobPost {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: number | null;
  category_id?: string;
  category?: Category;
  job_type?: 'Full-time' | 'Part-time' | 'Project-based' | null;
  employer_id: string;
  employer?: EmployerProfile;
  pending_review?: boolean;
  applicationLimit?: number;
  created_at: string;
  updated_at: string;
  views?: number;
  status: string;
  required_skills?: string[];
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface JobApplication {
  id: string;
  job_post_id: string;
  job_seeker_id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  job_post?: JobPost;
  job_seeker?: {
    id: string;
    email: string;
    username: string;
    role: 'jobseeker';
  };
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  job_application_id: string;
  rating: number;
  comment: string;
  reviewer?: {
    id: string;
    email: string;
    username: string;
    role: 'employer' | 'jobseeker';
  };
  job_application?: {
    id: string;
    job_post_id: string;
    job_seeker_id: string;
    status: string;
  };
  job_post?: {
    id: string;
    title: string;
  } | null; // Добавляем возможность null
  job_seeker?: {
    id: string;
    username: string;
  } | null; // Добавляем возможность null
  created_at: string;
  updated_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  message: string;
  role: 'jobseeker' | 'employer';
  user?: {
    id: string;
    email: string;
    username: string;
    role: 'jobseeker' | 'employer';
  };
  created_at: string;
  updated_at: string;
}

export interface BlockedCountry {
  id: string;
  country_code: string;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
  role: 'employer' | 'jobseeker';
}

export interface JobApplicationDetails {
  applicationId: string;
  userId: string;
  username: string;
  email: string;
  jobDescription: string;
  appliedAt: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  job_post_id: string; // Добавлено
}

export interface Analytics {
  totalUsers: number;
  employers: number;
  jobSeekers: number;
  totalJobPosts: number;
  activeJobPosts: number;
  totalApplications: number;
  totalReviews: number;
  [key: string]: any; // Для дополнительных полей
}
