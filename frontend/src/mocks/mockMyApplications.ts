import { JobApplication } from '@types';

export const mockApplications: JobApplication[] = [
  {
    id: 'app1',
    job_post_id: '1',
    job_seeker_id: 'seeker1',
    status: 'Pending',
    job_post: {
      id: '1',
      title: 'Virtual Assistant',
      description: 'Assist with administrative tasks.',
      location: 'Remote',
      salary: 50000,
      status: 'Active',
      category_id: 'cat1',
      employer_id: 'emp1',
      created_at: '2025-06-05T08:00:00Z', // Добавлено
      updated_at: '2025-06-05T08:00:00Z', // Добавлено
    },
    job_seeker: {
      id: 'seeker1',
      email: 'seeker1@example.com',
      username: 'JobSeeker1',
      role: 'jobseeker',
    },
    created_at: '2025-06-05T08:00:00Z',
    updated_at: '2025-06-05T08:00:00Z',
  },
  {
    id: 'app2',
    job_post_id: '2',
    job_seeker_id: 'seeker1',
    status: 'Accepted',
    job_post: {
      id: '2',
      title: 'Graphic Designer',
      description: 'Create visual content.',
      location: 'New York',
      salary: 60000,
      status: 'Closed',
      category_id: 'cat5',
      employer_id: 'emp2',
      created_at: '2025-06-06T09:00:00Z', // Добавлено
      updated_at: '2025-06-06T09:00:00Z', // Добавлено
    },
    job_seeker: {
      id: 'seeker1',
      email: 'seeker1@example.com',
      username: 'JobSeeker1',
      role: 'jobseeker',
    },
    created_at: '2025-06-06T09:00:00Z',
    updated_at: '2025-06-06T09:00:00Z',
  },
  {
    id: 'app3',
    job_post_id: '3',
    job_seeker_id: 'seeker1',
    status: 'Rejected',
    job_post: {
      id: '3',
      title: 'Graphic Designer',
      description: 'Create visual content.',
      location: 'New York',
      salary: 60000,
      status: 'Closed',
      category_id: 'cat5',
      employer_id: 'emp3',
      created_at: '2025-06-07T10:00:00Z', // Добавлено
      updated_at: '2025-06-07T10:00:00Z', // Добавлено
    },
    job_seeker: {
      id: 'seeker1',
      email: 'seeker1@example.com',
      username: 'JobSeeker1',
      role: 'jobseeker',
    },
    created_at: '2025-06-07T10:00:00Z',
    updated_at: '2025-06-07T10:00:00Z',
  },
];