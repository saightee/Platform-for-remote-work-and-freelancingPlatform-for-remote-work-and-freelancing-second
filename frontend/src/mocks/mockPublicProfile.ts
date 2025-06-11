import { Profile, Review, Category } from '@types';

export const mockProfile: Profile = {
  id: 'talent1',
  role: 'jobseeker',
  email: 'talent1@example.com',
  username: 'JohnDoe',
  skills: ['JavaScript', 'React'],
  skillCategories: [
    { id: 'cat1', name: 'Web Development', created_at: '2025-05-20', updated_at: '2025-06-10' },
  ],
  categories: [],
  categoryIds: ['cat1'],
  experience: '3 years',
  portfolio: 'https://portfolio.johndoe.com',
  video_intro: 'https://video.johndoe.com',
  timezone: 'Europe/Kiev',
  currency: 'USD',
  average_rating: 4.5,
  profile_views: 150,
  avatar: '/avatars/johndoe.jpg',
  identity_verified: true,
  identity_document: '/documents/johndoe.pdf',
  reviews: [],
};

export const mockReviews: Review[] = [
  {
    id: 'review1',
    reviewer_id: 'employer1',
    reviewed_id: 'talent1',
    job_application_id: 'app1',
    rating: 4,
    comment: 'Great work on the project!',
    reviewer: { id: 'employer1', email: 'employer1@example.com', username: 'JaneSmith', role: 'employer' },
    job_application: { id: 'app1', job_post_id: 'job1', job_seeker_id: 'talent1', status: 'Accepted' },
    created_at: '2025-06-01T10:00:00Z',
    updated_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 'review2',
    reviewer_id: 'employer2',
    reviewed_id: 'talent1',
    job_application_id: 'app2',
    rating: 5,
    comment: 'Excellent skills and communication!',
    reviewer: { id: 'employer2', email: 'employer2@example.com', username: 'AlexBrown', role: 'employer' },
    job_application: { id: 'app2', job_post_id: 'job2', job_seeker_id: 'talent1', status: 'Accepted' },
    created_at: '2025-06-05T14:30:00Z',
    updated_at: '2025-06-05T14:30:00Z',
  },
];