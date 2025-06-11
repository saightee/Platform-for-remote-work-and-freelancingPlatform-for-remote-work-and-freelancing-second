import { JobPost, Category } from '@types';

export const mockJobPosts: JobPost[] = [
  {
    id: '1',
    title: 'Virtual Assistant',
    description: 'Assist with administrative tasks.',
    location: 'Remote',
    salary: 50000,
    status: 'Active',
    job_type: 'Full-time',
    category_id: 'cat1',
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-10T10:00:00Z',
    applicationLimit: 10,
    views: 50,
    employer_id: 'emp1', // Добавлено обязательное поле
    employer: {
      id: 'emp1',
      role: 'employer',
      email: 'employer1@example.com',
      username: 'Employer1',
      identity_verified: false,
      reviews: [],
    },
  },
  {
    id: '2',
    title: 'Graphic Designer',
    description: 'Create visual content.',
    location: 'New York',
    salary: 60000,
    status: 'Closed',
    job_type: 'Part-time',
    category_id: 'cat5',
    created_at: '2025-06-02T12:00:00Z',
    updated_at: '2025-06-09T12:00:00Z',
    applicationLimit: 5,
    views: 30,
    employer_id: 'emp2', // Добавлено обязательное поле
    employer: {
      id: 'emp2',
      role: 'employer',
      email: 'employer2@example.com',
      username: 'Employer2',
      identity_verified: false,
      reviews: [],
    },
  },
  {
    id: '3',
    title: 'Graphic Designer',
    description: 'Create visual content.',
    location: 'New York',
    salary: 60000,
    status: 'Closed',
    job_type: 'Part-time',
    category_id: 'cat5',
    created_at: '2025-06-02T12:00:00Z',
    updated_at: '2025-06-09T12:00:00Z',
    applicationLimit: 5,
    views: 30,
    employer_id: 'emp3', // Добавлено обязательное поле
    employer: {
      id: 'emp3',
      role: 'employer',
      email: 'employer23@example.com',
      username: 'Employer23',
      identity_verified: false,
      reviews: [],
    },
  },
];

export const mockCategories: Category[] = [
  { id: 'cat1', name: 'Virtual Assistant', created_at: '20.05.2025', updated_at: '20.06.2025' },
  { id: 'cat2', name: 'Social Media Manager', created_at: '20.05.2025', updated_at: '20.06.2025' },
  { id: 'cat3', name: 'Data Entry Specialist', created_at: '20.05.2025', updated_at: '20.06.2025' },
  { id: 'cat4', name: 'Content Writer', created_at: '20.05.2025', updated_at: '20.06.2025' },
  { id: 'cat5', name: 'Graphic Designer', created_at: '20.05.2025', updated_at: '20.06.2025' },
  { id: 'cat6', name: 'Project Coordinator', created_at: '20.05.2025', updated_at: '20.06.2025' },
];