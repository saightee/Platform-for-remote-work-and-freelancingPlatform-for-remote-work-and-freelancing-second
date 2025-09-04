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
  status?: 'active' | 'blocked';
  identity_verified?: boolean;
  identity_document?: string | null;
  last_seen_at?: string | null;
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
  email?: string; // Оставлено как необязательное для публичного профиля
  username: string;
  skills?: Category[];
  experience?: string;
  description?: string;
  portfolio?: string;
  video_intro?: string;
  timezone?: string;
  currency?: string;
  average_rating: number;
  profile_views: number;
  avatar?: string | null;
  identity_verified: boolean;
  identity_document?: string | null;
  resume?: string; // Добавлено: link или path к resume (optional, как в docs)
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

export type SalaryType = 'per hour' | 'per month' | 'negotiable';

export interface JobPost {
  id: string;
  title: string;
  description: string;
  location?: string;
  salary: number | null;
  salary_type: SalaryType | null;
  category_id?: string;
  category_ids?: string[];
  category?: Category | null;
  job_type?: 'Full-time' | 'Part-time' | 'Project-based' | null;
  employer_id: string;
  employer?: EmployerProfile | null;
  pending_review?: boolean;
  applicationLimit?: number;
  created_at: string;
  updated_at: string;
  views?: number;
  status: string;
  required_skills?: string[];
  excluded_locations?: string[];
}



export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  subcategories?: Category[];
  
}

export interface JobApplication {
  id: string;
  job_post_id: string;
  job_seeker_id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  job_post?: { id: string; title: string; employer_id?: string; employer?: { id: string; username: string; }; }; // Расширено для employer_id и employer
  job_seeker?: { id: string; username: string; email?: string; }; // Nested из docs, убрал email/role если не нужно
  created_at: string;
  updated_at: string;
  reviews?: Review[];
}

export interface ReviewJobApplication {
  id: string;
  job_post_id: string;
  job_seeker_id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  job_post?: { id: string; title: string; };
 job_seeker?: { id: string; username: string; };
}

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_id: string;
  job_application_id?: string;
  rating: number;
  comment: string;
  reviewer?: {
    id: string;
    email: string;
    username: string;
    role: 'employer' | 'jobseeker';
  };
  reviewed?: { 
    id: string;
    email: string;
    username: string;
    role: 'employer' | 'jobseeker';
  };
  job_application?: ReviewJobApplication | null; // Изменено на JobApplication, которая имеет nested job_post/job_seeker
  job_post?: {
    id: string;
    title: string;
  } | null;
  job_seeker?: {
    id: string;
    username: string;
  } | null;
  created_at: string;
  updated_at: string;
}


export interface Feedback {
  id: string;
  user_id: string;
  role: 'jobseeker' | 'employer';
  category: 'Bug' | 'UI' | 'Performance' | 'Data' | 'Other';
  summary: string;
  steps_to_reproduce?: string;
  expected_result?: string;
  actual_result?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    username: string;
    role: 'jobseeker' | 'employer';
  };
}

export interface PlatformFeedbackAdminItem {
  id: string;
  user_id: string;
  role: 'jobseeker' | 'employer';
  headline: string;
  story: string;
  rating: number;
  allowed_to_publish: boolean;
  is_public: boolean;
  company?: string;
  country?: string;
  created_at: string;
  updated_at: string;
  user?: { id: string; username: string; role: 'jobseeker' | 'employer' };
}

export interface PlatformFeedbackList {
  total: number;
  data: PlatformFeedbackAdminItem[];
}



export interface Message {
  id: string;
  job_application_id: string;
  sender_id: string;
  sender: { id: string; username: string; email: string; role: string }; // Добавлено: nested sender из docs
  recipient_id: string;
  recipient: { id: string; username: string; email: string; role: string }; // Добавлено: nested recipient
  content: string;
  created_at: string;
  is_read: boolean;
}

type MessagesReadPayload = { data: Message[] } | Message[];

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
  skills?: string[]; 
  experience?: string; 
  resume?: string;

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
  coverLetter?: string;
}

export interface Analytics {
  totalUsers: number;
  employers: number;
  jobSeekers: number;
  totalJobPosts: number;
  activeJobPosts: number;
  totalApplications: number;
  totalReviews: number;
}

interface Complaint { // Добавьте базовый, если typeof complaints[0] не работает (complaints - state)
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
  resolver?: { username: string }; // Добавьте для resolver.username
}

interface EnrichedComplaint extends Complaint { // Изменено: extends Complaint вместо typeof
  targetUsername: string;
}


export interface ChatNotificationsSettings {
  enabled: boolean;
  onEmployerMessage: {
    immediate: boolean;
    delayedIfUnread: { enabled: boolean; minutes: number }; // 1..10080
    onlyFirstMessageInThread: boolean;
  };
  throttle: { perChatCount: number; perMinutes: number };   // count 1..100, minutes 1..10080
}
