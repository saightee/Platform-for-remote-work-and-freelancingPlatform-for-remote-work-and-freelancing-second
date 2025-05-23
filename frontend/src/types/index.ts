// src/@types/index.ts

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'employer' | 'jobseeker' | 'admin';
  provider?: string | null;
  created_at: string;
  updated_at: string;
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
  avatar?: string;
  identity_verified: boolean;
  reviews: Review[];
}

export interface JobSeekerProfile {
  id: string;
  role: 'jobseeker';
  email: string;
  username: string;
  skills?: string[];
  experience?: string;
  portfolio?: string;
  video_intro?: string;
  timezone?: string;
  currency?: string;
  average_rating?: number;
  avatar?: string;
  identity_verified: boolean;
  reviews: Review[];
  skillCategories?: SkillCategory[];
}

export type Profile = EmployerProfile | JobSeekerProfile;

export interface SkillCategory {
  id: string;
  name: string;
}

export interface JobPost {
  id: string;
  title: string;
  description: string;
  location: string;
  salary: number;
  category_id?: string;
  category?: Category;
  job_type?: 'Full-time' | 'Part-time' | 'Project-based';
  employer_id: string;
  employer?: {
    id: string;
    email: string;
    username: string;
    role: 'employer';
  };
  pending_review?: boolean;
  applicationLimit?: number;
  created_at: string;
  updated_at: string;
  views?: number;
  salaryMin?: number;
  salaryMax?: number;
  status: string;
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
    status: 'Accepted';
  };
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
}

export interface RegisterCredentials extends LoginCredentials {
  username: string;
  role: 'employer' | 'jobseeker';
}

// Добавляем тип для данных, возвращаемых в getApplicationsForJobPost
export interface JobApplicationDetails {
  userId: string;
  username: string;
  email: string;
  jobDescription: string;
  appliedAt: string;
}