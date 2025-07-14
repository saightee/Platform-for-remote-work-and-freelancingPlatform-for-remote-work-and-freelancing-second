
import { User, JobPost, Review, Feedback, BlockedCountry, Category, PaginatedResponse, JobApplicationDetails, Analytics } from './types';

export interface JobPostWithApplications {
  id: string;
  username: string;
  title: string;
  status: string;
  applicationCount: number;
  created_at: string;
}

interface OnlineUsers {
  jobseekers: number;
  employers: number;
}

interface RecentRegistrations {
  jobseekers: { id: string; email: string; username: string; role: string; created_at: string }[];
  employers: { id: string; email: string; username: string; role: string; created_at: string }[];
}

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'user1@example.com',
    username: 'UserOne',
    role: 'jobseeker',
    provider: null,
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2025-07-01T10:00:00Z',
    is_blocked: false,
  },
  {
    id: '2',
    email: 'employer1@example.com',
    username: 'EmployerOne',
    role: 'employer',
    provider: null,
    created_at: '2025-07-02T12:00:00Z',
    updated_at: '2025-07-02T12:00:00Z',
    is_blocked: true,
  },
];

export const mockJobPosts: JobPost[] = [
  {
    id: '1',
    title: 'Frontend Developer',
    description: 'Develop web applications',
    location: 'Remote',
    salary: 80000,
    category_id: 'cat1',
    category: { id: 'cat1', name: 'Web Development', created_at: '2025-07-01T10:00:00Z', updated_at: '2025-07-01T10:00:00Z' },
    job_type: 'Full-time',
    employer_id: '2',
    pending_review: true,
    applicationLimit: 50,
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2025-07-01T10:00:00Z',
    views: 100,
    status: 'Active',
    required_skills: ['JavaScript', 'React'],
  },
  {
    id: '2',
    title: 'Backend Developer',
    description: 'Build APIs',
    location: 'New York',
    salary: 90000,
    category_id: 'cat2',
    category: { id: 'cat2', name: 'Backend Development', created_at: '2025-07-02T12:00:00Z', updated_at: '2025-07-02T12:00:00Z' },
    job_type: 'Part-time',
    employer_id: '2',
    pending_review: false,
    applicationLimit: 30,
    created_at: '2025-07-02T12:00:00Z',
    updated_at: '2025-07-02T12:00:00Z',
    views: 50,
    status: 'Active',
    required_skills: ['Node.js', 'Express'],
  },
];

export const mockJobPostsWithApps: JobPostWithApplications[] = [
  {
    id: '1',
    username: 'john_doe',
    title: 'Frontend Developer',
    status: 'Active',
    applicationCount: 25,
    created_at: '2025-07-01T10:00:00Z',
  },
  {
    id: '2',
    username: 'jo_doe5',
    title: 'Backend Developer',
    status: 'Active',
    applicationCount: 10,
    created_at: '2025-07-02T12:00:00Z',
  },
   {
    id: '3',
    username: 'jo_doe4',
    title: 'Backend Developer',
    status: 'Active',
    applicationCount: 10,
    created_at: '2025-08-02T12:00:00Z',
  },
   {
    id: '4',
    username: 'jo_doe3',
    title: 'Backend Developer',
    status: 'Active',
    applicationCount: 10,
    created_at: '2025-09-02T12:00:00Z',
  },
   {
    id: '5',
    username: 'jo_doe2',
    title: 'Backend Developer',
    status: 'Active',
    applicationCount: 10,
    created_at: '2025-11-02T12:00:00Z',
  },
];

export const mockReviews: Review[] = [
  {
    id: '1',
    reviewer_id: '1',
    reviewed_id: '2',
    job_application_id: 'app1',
    rating: 4,
    comment: 'Great work!',
    reviewer: { id: '1', email: 'user1@example.com', username: 'UserOne', role: 'jobseeker' },
    job_application: { id: 'app1', job_post_id: '1', job_seeker_id: '1', status: 'Accepted' },
    job_post: { id: '1', title: 'Frontend Developer' },
    job_seeker: { id: '1', username: 'UserOne' },
    created_at: '2025-07-03T14:00:00Z',
    updated_at: '2025-07-03T14:00:00Z',
  },
];

export const mockFeedback: Feedback[] = [
  {
    id: '1',
    user_id: '1',
    message: 'Platform is user-friendly!',
    role: 'jobseeker',
    user: { id: '1', email: 'user1@example.com', username: 'UserOne', role: 'jobseeker' },
    created_at: '2025-07-03T15:00:00Z',
    updated_at: '2025-07-03T15:00:00Z',
  },
];

export const mockBlockedCountries: BlockedCountry[] = [
  {
    id: '1',
    country_code: 'US',
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2025-07-01T10:00:00Z',
  },
];

export const mockCategories: Category[] = [
  {
    id: 'cat1',
    name: 'Web Development',
    parent_id: null,
    created_at: '2025-07-01T10:00:00Z',
    updated_at: '2025-07-01T10:00:00Z',
    subcategories: [
      {
        id: 'cat1-1',
        name: 'Frontend Development',
        parent_id: 'cat1',
        created_at: '2025-07-01T10:00:00Z',
        updated_at: '2025-07-01T10:00:00Z',
        subcategories: [],
      },
    ],
  },
  {
    id: 'cat2',
    name: 'Backend Development',
    parent_id: null,
    created_at: '2025-07-02T12:00:00Z',
    updated_at: '2025-07-02T12:00:00Z',
    subcategories: [],
  },
];

export const mockAnalytics: Analytics = {
  totalUsers: 100,
  employers: 40,
  jobSeekers: 60,
  totalJobPosts: 20,
  activeJobPosts: 15,
  totalApplications: 200,
  totalReviews: 50,
};

export const mockRegistrationStats: { period: string; count: number }[] = [
  { period: '2025-07-01', count: 10 },
  { period: '2025-07-02', count: 15 },
];

export const mockGeographicDistribution: { country: string; count: number; percentage: string }[] = [
  { country: 'US', count: 50, percentage: '50%' },
  { country: 'UK', count: 30, percentage: '30%' },
];

export const mockFreelancerSignups: { country: string; count: number }[] = [
  { country: 'US', count: 30 },
  { country: 'UK', count: 18 },
];

export const mockBusinessSignups: { country: string; count: number }[] = [
  { country: 'US', count: 20 },
  { country: 'UK', count: 12 },
];

export const mockTopEmployers: { employer_id: string; username: string; job_count: number }[] = [
  { employer_id: '2', username: 'EmployerOne', job_count: 5 },
];

export const mockTopJobseekers: { job_seeker_id: string; username: string; application_count: number }[] = [
  { job_seeker_id: '1', username: 'UserOne', application_count: 10 },
];

export const mockTopJobseekersByViews: { userId: string; username: string; email: string; profileViews: number }[] = [
  { userId: '1', username: 'UserOne', email: 'user1@example.com', profileViews: 100 },
];

export const mockTopEmployersByPosts: { userId: string; username: string; email: string; jobCount: number }[] = [
  { userId: '2', username: 'EmployerOne', email: 'employer1@example.com', jobCount: 5 },
];

export const mockGrowthTrends: { registrations: { period: string; count: number }[]; jobPosts: { period: string; count: number }[] } = {
  registrations: [
    { period: '2025-07-01', count: 10 },
    { period: '2025-07-02', count: 15 },
  ],
  jobPosts: [
    { period: '2025-07-01', count: 5 },
    { period: '2025-07-02', count: 7 },
  ],
};

export const mockComplaints: {
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
}[] = [
  {
    id: '1',
    complainant_id: '1',
    complainant: { id: '1', username: 'UserOne', email: 'user1@example.com', role: 'jobseeker' },
    job_post_id: '1',
    job_post: { id: '1', title: 'Frontend Developer', description: 'Develop web applications' },
    reason: 'Inappropriate job post',
    status: 'Pending',
    created_at: '2025-07-03T14:00:00Z',
  },
];

export const mockChatHistory: {
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
} = {
  total: 1,
  data: [
    {
      id: '1',
      job_application_id: 'app1',
      sender_id: '1',
      sender: { id: '1', username: 'UserOne', email: 'user1@example.com', role: 'jobseeker' },
      recipient_id: '2',
      recipient: { id: '2', username: 'EmployerOne', email: 'employer1@example.com', role: 'employer' },
      content: 'Interested in your job post!',
      created_at: '2025-07-03T14:00:00Z',
      is_read: false,
    },
  ],
};

export const mockOnlineUsers: OnlineUsers = {
  jobseekers: 10,
  employers: 5,
};

export const mockRecentRegistrations: RecentRegistrations = {
  jobseekers: [
    {
      id: '1',
      email: 'user1@example.com',
      username: 'UserOne',
      role: 'jobseeker',
      created_at: '2025-07-03T14:00:00Z',
    },
  ],
  employers: [
    {
      id: '2',
      email: 'employer1@example.com',
      username: 'EmployerOne',
      role: 'employer',
      created_at: '2025-07-03T14:00:00Z',
    },
  ],
};

export const mockJobApplications: JobApplicationDetails[] = [
  {
    applicationId: 'app1',
    userId: '1',
    username: 'UserOne',
    email: 'user1@example.com',
    jobDescription: 'Frontend Developer',
    appliedAt: '2025-07-03T14:00:00Z',
    status: 'Accepted',
    job_post_id: '1',
  },
];