import * as request from 'supertest';
import { io as Client, Socket } from 'socket.io-client';

describe('OnlineJobs E2E Tests', () => {
  const baseUrl = process.env.BASE_URL || 'https://jobforge.net';
  const socketUrl = process.env.SOCKET_URL || 'wss://jobforge.net';

  const JOBSEEKER_EMAIL = 'romanbukshak@mail.ru';
  const JOBSEEKER_PASSWORD = 'dragomir4eg';
  const JOBSEEKER_USERNAME = 'romanbukshak';
  const EMPLOYER_EMAIL = 'petriciowoodler@gmail.com';
  const EMPLOYER_PASSWORD = 'dragomir4eg';
  const EMPLOYER_USERNAME = 'petriciowoodler';
  const ADMIN_EMAIL = 'newadmin1@example.com';
  const ADMIN_PASSWORD = 'admin123';
  const MODERATOR_EMAIL = 'newmoderator@example.com';
  const MODERATOR_PASSWORD = 'moderator123';

  let adminToken = '';
  let moderatorToken = '';
  let jobseekerToken = '';
  let employerToken = '';
  let jobseekerId = '';
  let employerId = '';
  let moderatorId = '';
  let categoryId = '';
  let jobPostId = '';
  let applicationId = '';
  let reviewId = '';
  let complaintId = '';
  let feedbackId = '';
  let socket: Socket;

  const cleanupIds: {
    jobs: string[];
    categories: string[];
    applications: string[];
    reviews: string[];
    complaints: string[];
    feedback: string[];
  } = {
    jobs: [],
    categories: [],
    applications: [],
    reviews: [],
    complaints: [],
    feedback: [],
  };

  beforeAll(async () => {
    // Логин jobseeker
    const jobseekerCheck = await request(baseUrl)
      .get(`/api/admin/users?email=${encodeURIComponent(JOBSEEKER_EMAIL)}`)
      .set('Authorization', `Bearer ${await getAdminToken()}`); // Предварительный логин админа для проверки
    if (!jobseekerCheck.body.length) {
      throw new Error(`Jobseeker ${JOBSEEKER_EMAIL} not found`);
    }
    if (jobseekerCheck.body[0].status === 'blocked') {
      await request(baseUrl)
        .post(`/api/admin/users/${jobseekerCheck.body[0].id}/unblock`)
        .set('Authorization', `Bearer ${await getAdminToken()}`)
        .expect(200);
      console.log(`Unblocked jobseeker ${JOBSEEKER_EMAIL}`);
    }
    const jobseekerResponse = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-jobseeker-${Date.now()}`)
      .send({ email: JOBSEEKER_EMAIL, password: JOBSEEKER_PASSWORD });
    if (jobseekerResponse.status !== 201) {
      console.error('Jobseeker login failed:', jobseekerResponse.body);
      throw new Error(`Jobseeker login failed: ${jobseekerResponse.body.message}`);
    }
    expect(jobseekerResponse.status).toBe(201);
    expect(jobseekerResponse.body).toHaveProperty('accessToken');
    jobseekerToken = jobseekerResponse.body.accessToken;
    const jobseekerProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`);
    jobseekerId = jobseekerProfile.body.id;
    console.log('Jobseeker logged in');

    // Логин employer
    const employerCheck = await request(baseUrl)
      .get(`/api/admin/users?email=${encodeURIComponent(EMPLOYER_EMAIL)}`)
      .set('Authorization', `Bearer ${await getAdminToken()}`);
    if (!employerCheck.body.length) {
      throw new Error(`Employer ${EMPLOYER_EMAIL} not found`);
    }
    if (employerCheck.body[0].status === 'blocked') {
      await request(baseUrl)
        .post(`/api/admin/users/${employerCheck.body[0].id}/unblock`)
        .set('Authorization', `Bearer ${await getAdminToken()}`)
        .expect(200);
      console.log(`Unblocked employer ${EMPLOYER_EMAIL}`);
    }
    const employerResponse = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-employer-${Date.now()}`)
      .send({ email: EMPLOYER_EMAIL, password: EMPLOYER_PASSWORD });
    if (employerResponse.status !== 201) {
      console.error('Employer login failed:', employerResponse.body);
      throw new Error(`Employer login failed: ${employerResponse.body.message}`);
    }
    expect(employerResponse.status).toBe(201);
    expect(employerResponse.body).toHaveProperty('accessToken');
    employerToken = employerResponse.body.accessToken;
    const employerProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${employerToken}`);
    employerId = employerProfile.body.id;
    console.log('Employer logged in');

    // Логин модератора
    const moderatorResponse = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-moderator-${Date.now()}`)
      .send({ email: MODERATOR_EMAIL, password: MODERATOR_PASSWORD });
    if (moderatorResponse.status !== 201) {
      console.error('Moderator login failed:', moderatorResponse.body);
      throw new Error(`Moderator login failed: ${moderatorResponse.body.message}`);
    }
    expect(moderatorResponse.status).toBe(201);
    expect(moderatorResponse.body).toHaveProperty('accessToken');
    moderatorToken = moderatorResponse.body.accessToken;
    const moderatorProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${moderatorToken}`);
    moderatorId = moderatorProfile.body.id;
    console.log('Moderator logged in');

    // Логин админа (в конце)
    const adminResponse = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-admin-${Date.now()}`)
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (adminResponse.status !== 201) {
      console.error('Admin login failed:', adminResponse.body);
      throw new Error(`Admin login failed: ${adminResponse.body.message}`);
    }
    expect(adminResponse.status).toBe(201);
    expect(adminResponse.body).toHaveProperty('accessToken');
    adminToken = adminResponse.body.accessToken;
    console.log('Admin logged in');

    // Очистка тестовых категорий
    const categoriesResponse = await request(baseUrl)
      .get('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`);
    const testCategories = categoriesResponse.body.filter((cat: any) => cat.name.startsWith('Test Category'));
    for (const category of testCategories) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/categories/${category.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        console.log(`Deleted category ${category.id}`);
      } catch (error) {
        console.warn(`Failed to delete category ${category.id}: ${error.message}`);
      }
    }
  }, 20000);

  afterEach(async () => {
    // Логаут админа после каждого теста, где он используется
    if (adminToken) {
      try {
        await request(baseUrl)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);
        console.log('Admin logged out');
      } catch (error) {
        console.warn(`Failed to logout admin: ${error.message}`);
      }
    }

    for (const applicationId of cleanupIds.applications) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/job-applications/${applicationId}`)
          .set('Authorization', `Bearer ${await getAdminToken()}`);
        console.log(`Deleted application ${applicationId}`);
      } catch (error) {
        console.warn(`Failed to delete application ${applicationId}: ${error.message}`);
      }
    }
    cleanupIds.applications = [];

    for (const reviewId of cleanupIds.reviews) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/reviews/${reviewId}`)
          .set('Authorization', `Bearer ${await getAdminToken()}`);
        console.log(`Deleted review ${reviewId}`);
      } catch (error) {
        console.warn(`Failed to delete review ${reviewId}: ${error.message}`);
      }
    }
    cleanupIds.reviews = [];

    for (const complaintId of cleanupIds.complaints) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/complaints/${complaintId}`)
          .set('Authorization', `Bearer ${await getAdminToken()}`);
        console.log(`Deleted complaint ${complaintId}`);
      } catch (error) {
        console.warn(`Failed to delete complaint ${complaintId}: ${error.message}`);
      }
    }
    cleanupIds.complaints = [];

    for (const feedbackId of cleanupIds.feedback) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/feedback/${feedbackId}`)
          .set('Authorization', `Bearer ${await getAdminToken()}`);
        console.log(`Deleted feedback ${feedbackId}`);
      } catch (error) {
        console.warn(`Failed to delete feedback ${feedbackId}: ${error.message}`);
      }
    }
    cleanupIds.feedback = [];
  }, 15000);

  afterAll(async () => {
    // Логаут админа
    if (adminToken) {
      try {
        await request(baseUrl)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(201);
        console.log('Admin logged out');
      } catch (error) {
        console.warn(`Failed to logout admin: ${error.message}`);
      }
    }

    // Очистка вакансий
    for (const jobId of cleanupIds.jobs) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/job-posts/${jobId}`)
          .set('Authorization', `Bearer ${await getAdminToken()}`);
        console.log(`Deleted job ${jobId}`);
      } catch (error) {
        console.warn(`Failed to delete job ${jobId}: ${error.message}`);
      }
    }

    // Очистка категорий
    for (const categoryId of cleanupIds.categories) {
      try {
        await request(baseUrl)
          .delete(`/api/admin/categories/${categoryId}`)
          .set('Authorization', `Bearer ${await getAdminToken()}`);
        console.log(`Deleted category ${categoryId}`);
      } catch (error) {
        console.warn(`Failed to delete category ${categoryId}: ${error.message}`);
      }
    }

    if (socket) {
      socket.disconnect();
      console.log('WebSocket disconnected');
    }
  }, 20000);

  // Вспомогательная функция для получения админского токена
  async function getAdminToken(): Promise<string> {
    if (!adminToken) {
      const adminResponse = await request(baseUrl)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .set('X-Forwarded-For', '99.79.0.2')
        .set('X-Fingerprint', `test-fingerprint-admin-${Date.now()}`)
        .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      if (adminResponse.status !== 201) {
        console.error('Admin login failed:', adminResponse.body);
        throw new Error(`Admin login failed: ${adminResponse.body.message}`);
      }
      adminToken = adminResponse.body.accessToken;
      console.log('Admin token refreshed');
    }
    return adminToken;
  }

  // Группа 1: Логин (jobseeker, employer)
  it('should fail login with invalid credentials for jobseeker', async () => {
    const response = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${Date.now()}`)
      .send({ email: JOBSEEKER_EMAIL, password: 'wrong123' })
      .expect(401);
    expect(response.body.message).toBe('Invalid credentials');
    console.log('Invalid jobseeker login blocked');
  }, 15000);

  it('should fail login with invalid credentials for employer', async () => {
    const response = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${Date.now()}`)
      .send({ email: EMPLOYER_EMAIL, password: 'wrong123' })
      .expect(401);
    expect(response.body.message).toBe('Invalid credentials');
    console.log('Invalid employer login blocked');
  }, 15000);

  it('should logout successfully for jobseeker', async () => {
    const response = await request(baseUrl)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .expect(201);
    expect(response.body.message).toBe('Logout successful');
    console.log('Jobseeker logged out');
  }, 15000);

  // Группа 2: Профили (jobseeker, employer)
  it('should retrieve jobseeker profile', async () => {
    const response = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('role', 'jobseeker');
    expect(response.body).toHaveProperty('id', jobseekerId);
    expect(response.body).toHaveProperty('username', JOBSEEKER_USERNAME);
    expect(response.body).toHaveProperty('categories');
    expect(response.body).not.toHaveProperty('skillCategories');
    console.log('Jobseeker profile retrieved');
  }, 15000);

  it('should retrieve employer profile', async () => {
    const response = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);
    expect(response.body).toHaveProperty('role', 'employer');
    expect(response.body).toHaveProperty('id', employerId);
    expect(response.body).toHaveProperty('username', EMPLOYER_USERNAME);
    console.log('Employer profile retrieved');
  }, 15000);

  it('should update jobseeker profile', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        role: 'jobseeker',
        skills: ['JavaScript', 'Python'],
        categoryIds: [categoryId],
        experience: '3 years',
        timezone: 'America/New_York',
        currency: 'USD',
      })
      .expect(200);
    expect(response.body.skills).toEqual(['JavaScript', 'Python']);
    expect(response.body.experience).toBe('3 years');
    console.log('Jobseeker profile updated');
  }, 15000);

  it('should update employer profile', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        role: 'employer',
        company_name: 'Tech Corp',
        company_info: 'We build tech solutions',
        timezone: 'America/New_York',
        currency: 'USD',
      })
      .expect(200);
    expect(response.body.company_name).toBe('Tech Corp');
    expect(response.body.company_info).toBe('We build tech solutions');
    console.log('Employer profile updated');
  }, 15000);

  it('should fail profile update with invalid role', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ company_name: 'Tech Corp' })
      .expect(401);
    expect(response.body.message).toBe('User role mismatch');
    console.log('Invalid role profile update blocked');
  }, 15000);

  it('should increment jobseeker profile views', async () => {
    const initialProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .expect(200);
    const initialViews = initialProfile.body.profile_views || 0;
    await request(baseUrl)
      .post(`/api/profile/${jobseekerId}/increment-view`)
      .expect(200);
    const updatedProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .expect(200);
    expect(updatedProfile.body.profile_views).toBe(initialViews + 1);
    console.log('Profile views incremented');
  }, 15000);

  // Группа 3: Категории
  it('should create category', async () => {
    const response = await request(baseUrl)
      .post('/api/categories')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .set('Content-Type', 'application/json')
      .send({ name: `Test Category ${Date.now()}` })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    categoryId = response.body.id;
    cleanupIds.categories.push(categoryId);
    console.log('Category created');
  }, 15000);

  it('should fail creating duplicate category', async () => {
    const categoryName = `Duplicate Category ${Date.now()}`;
    await request(baseUrl)
      .post('/api/categories')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .set('Content-Type', 'application/json')
      .send({ name: categoryName })
      .expect(201);
    const response = await request(baseUrl)
      .post('/api/categories')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .set('Content-Type', 'application/json')
      .send({ name: categoryName })
      .expect(400);
    expect(response.body.message).toBe('Category with this name already exists');
    console.log('Duplicate category creation blocked');
  }, 15000);

  it('should get category list', async () => {
    const response = await request(baseUrl)
      .get('/api/categories')
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((cat: any) => cat.id === categoryId)).toBe(true);
    console.log('Category list retrieved');
  }, 15000);

  // Группа 4: Вакансии
  it('should create job post as employer', async () => {
    const response = await request(baseUrl)
      .post('/api/job-posts')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Software Engineer',
        description: 'We need a skilled engineer',
        location: 'Remote',
        salary: 50000,
        job_type: 'Full-time',
        category_id: categoryId,
        required_skills: ['JavaScript'],
        applicationLimit: 10,
      })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.salary).toBe(50000);
    jobPostId = response.body.id;
    cleanupIds.jobs.push(jobPostId);
    console.log('Job post created');
  }, 15000);

  it('should search job posts with filters and pagination', async () => {
    const response = await request(baseUrl)
      .get('/api/job-posts')
      .query({ title: 'Software', job_type: 'Full-time', page: 2, limit: 5, sort_by: 'salary', sort_order: 'ASC' })
      .expect(200);
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(5);
    if (response.body.data.length > 1) {
      expect(response.body.data[0].salary || 0).toBeLessThanOrEqual(response.body.data[1].salary || 0);
    }
    console.log('Job posts filtered with pagination');
  }, 15000);

  it('should increment job post views', async () => {
    const initialJob = await request(baseUrl)
      .get(`/api/job-posts/${jobPostId}`)
      .expect(200);
    const initialViews = initialJob.body.views || 0;
    await request(baseUrl)
      .post(`/api/job-posts/${jobPostId}/increment-view`)
      .expect(200);
    const updatedJob = await request(baseUrl)
      .get(`/api/job-posts/${jobPostId}`)
      .expect(200);
    expect(updatedJob.body.views).toBe(initialViews + 1);
    console.log('Job post views incremented');
  }, 15000);

  // Группа 5: Заявки
  it('should apply to job post as jobseeker', async () => {
    await request(baseUrl)
      .post(`/api/admin/job-posts/${jobPostId}/approve`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    const response = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_post_id: jobPostId })
      .expect(201);
    expect(response.body).toHaveProperty('id');
    applicationId = response.body.id;
    cleanupIds.applications.push(applicationId);
    console.log('Job application submitted');
  }, 15000);

  it('should fail duplicate job application', async () => {
    const response = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_post_id: jobPostId })
      .expect(400);
    expect(response.body.message).toBe('You have already applied to this job post');
    console.log('Duplicate job application blocked');
  }, 15000);

  it('should view applications as employer', async () => {
    const response = await request(baseUrl)
      .get(`/api/job-applications/job-post/${jobPostId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((app: any) => app.job_seeker_id === jobseekerId)).toBe(true);
    console.log('Applications viewed by employer');
  }, 15000);

  // Группа 6: Отзывы
  it('should create review from employer to jobseeker', async () => {
    await request(baseUrl)
      .put(`/api/job-applications/${applicationId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'Accepted' })
      .expect(200);
    const response = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_application_id: applicationId, rating: 4, comment: 'Great work!' })
      .expect(201);
    expect(response.body.rating).toBe(4);
    reviewId = response.body.id;
    cleanupIds.reviews.push(reviewId);
    console.log('Review created');
  }, 15000);

  it('should fail review with invalid rating', async () => {
    const response = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_application_id: applicationId, rating: 6, comment: 'Invalid rating' })
      .expect(400);
    expect(response.body.message).toBe('Rating must be between 1 and 5');
    console.log('Invalid rating review blocked');
  }, 15000);

  // Группа 7: Жалобы
  it('should submit complaint on job post', async () => {
    const response = await request(baseUrl)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_post_id: jobPostId, reason: 'Inappropriate description' })
      .expect(201);
    expect(response.body.status).toBe('Pending');
    complaintId = response.body.id;
    cleanupIds.complaints.push(complaintId);
    console.log('Complaint submitted');
  }, 15000);

  it('should fail complaint on own profile', async () => {
    const response = await request(baseUrl)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ profile_id: jobseekerId, reason: 'Testing own profile' })
      .expect(400);
    expect(response.body.message).toBe('Cannot submit a complaint against your own profile');
    console.log('Own profile complaint blocked');
  }, 15000);

  // Группа 8: Обратная связь
  it('should submit feedback as jobseeker', async () => {
    const response = await request(baseUrl)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ message: 'Great platform!' })
      .expect(201);
    expect(response.body.message).toBe('Great platform!');
    feedbackId = response.body.id;
    cleanupIds.feedback.push(feedbackId);
    console.log('Feedback submitted');
  }, 15000);

  it('should fail feedback with empty message', async () => {
    const response = await request(baseUrl)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ message: '' })
      .expect(400);
    expect(response.body.message).toContain('message must be a non-empty string');
    console.log('Empty feedback blocked');
  }, 15000);

  // Группа 9: Чат
  it('should connect to chat and send message', async () => {
    socket = Client(socketUrl, {
      auth: { token: `Bearer ${jobseekerToken}` },
      reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
      socket.on('connect', () => {
        console.log('WebSocket connected');
        socket.emit('joinChat', { jobApplicationId: applicationId });
        socket.on('chatHistory', (history: any[]) => {
          expect(Array.isArray(history)).toBe(true);
          socket.emit('sendMessage', { jobApplicationId: applicationId, content: 'Test message' });
          socket.on('newMessage', (message: any) => {
            expect(message.content).toBe('Test message');
            expect(message.job_application_id).toBe(applicationId);
            console.log('Message sent and received');
            resolve();
          });
        });
        socket.on('error', (err: any) => {
          console.error('WebSocket error:', err);
          reject(err);
        });
      });
      socket.on('connect_error', (err: any) => {
        console.error('WebSocket connection error:', err);
        reject(err);
      });
    });
  }, 20000);

  it('should fail chat access without permission', async () => {
    const invalidSocket = Client(socketUrl, {
      auth: { token: `Bearer ${moderatorToken}` },
      reconnection: false,
    });
    await new Promise<void>((resolve, reject) => {
      invalidSocket.on('connect', () => {
        invalidSocket.emit('joinChat', { jobApplicationId: applicationId });
        invalidSocket.on('error', (err: any) => {
          expect(err.message).toBe('No access to this chat');
          console.log('Unauthorized chat access blocked');
          resolve();
        });
      });
      invalidSocket.on('connect_error', (err: any) => {
        console.error('WebSocket connection error:', err);
        reject(err);
      });
      setTimeout(() => reject(new Error('Timeout waiting for error')), 5000);
    });
    invalidSocket.disconnect();
  }, 15000);

  // Группа 10: Поиск талантов
  it('should search talents with filters and pagination', async () => {
    const response = await request(baseUrl)
      .get('/api/talents')
      .query({ skills: 'JavaScript', experience: '3 years', rating: 4, page: 1, limit: 5, sort_by: 'average_rating', sort_order: 'DESC' })
      .expect(200);
    expect(response.body).toHaveProperty('total');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeLessThanOrEqual(5);
    if (response.body.data.length > 1) {
      expect(response.body.data[0].average_rating).toBeGreaterThanOrEqual(response.body.data[1].average_rating);
    }
    console.log('Talents filtered with pagination');
  }, 15000);

  it('should fail talent search with invalid rating', async () => {
    const response = await request(baseUrl)
      .get('/api/talents')
      .query({ rating: 6 })
      .expect(400);
    expect(response.body.message).toBe('Rating must be between 0 and 5');
    console.log('Invalid talent search blocked');
  }, 15000);

  // Группа 11: Публичная статистика
  it('should retrieve public statistics', async () => {
    const response = await request(baseUrl)
      .get('/api/stats')
      .expect(200);
    expect(response.body).toHaveProperty('totalResumes');
    expect(response.body).toHaveProperty('totalJobPosts');
    expect(response.body).toHaveProperty('totalEmployers');
    console.log('Public statistics retrieved');
  }, 15000);

  // Группа 12: Модераторские действия
  it('should approve job post as moderator', async () => {
    const newJobResponse = await request(baseUrl)
      .post('/api/job-posts')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Another Engineer',
        description: 'Need another skilled engineer',
        location: 'Remote',
        salary: null,
        job_type: 'Full-time',
        category_id: categoryId,
      })
      .expect(201);
    const newJobId = newJobResponse.body.id;
    cleanupIds.jobs.push(newJobId);
    const response = await request(baseUrl)
      .post(`/api/moderator/job-posts/${newJobId}/approve`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);
    expect(response.body.pending_review).toBe(false);
    expect(response.body.status).toBe('Active');
    console.log('Job post approved by moderator');
  }, 15000);

  it('should flag job post as moderator', async () => {
    const response = await request(baseUrl)
      .post(`/api/moderator/job-posts/${jobPostId}/flag`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);
    expect(response.body.pending_review).toBe(true);
    console.log('Job post flagged by moderator');
  }, 15000);

  it('should delete review as moderator', async () => {
    await request(baseUrl)
      .delete(`/api/moderator/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .expect(200);
    const response = await request(baseUrl)
      .get(`/api/reviews/user/${jobseekerId}`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(response.body.find((r: any) => r.id === reviewId)).toBeUndefined();
    console.log('Review deleted by moderator');
  }, 15000);

  it('should resolve complaint as moderator', async () => {
    const newComplaint = await request(baseUrl)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_post_id: jobPostId, reason: 'Test complaint' })
      .expect(201);
    cleanupIds.complaints.push(newComplaint.body.id);
    const response = await request(baseUrl)
      .post(`/api/moderator/complaints/${newComplaint.body.id}/resolve`)
      .set('Authorization', `Bearer ${moderatorToken}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'Resolved', comment: 'Issue resolved' })
      .expect(200);
    expect(response.body.status).toBe('Resolved');
    console.log('Complaint resolved by moderator');
  }, 15000);

  // Группа 13: Админские действия
  it('should retrieve analytics as admin', async () => {
    const response = await request(baseUrl)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(response.body).toHaveProperty('totalUsers');
    expect(response.body).toHaveProperty('employers');
    expect(response.body).toHaveProperty('jobSeekers');
    expect(response.body).toHaveProperty('totalJobPosts');
    expect(response.body).toHaveProperty('activeJobPosts');
    expect(response.body).toHaveProperty('totalApplications');
    expect(response.body).toHaveProperty('totalReviews');
    console.log('Analytics retrieved');
  }, 15000);

  it('should block and unblock user as admin', async () => {
    await request(baseUrl)
      .post(`/api/admin/users/${jobseekerId}/block`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    const loginResponse = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send({ email: JOBSEEKER_EMAIL, password: JOBSEEKER_PASSWORD })
      .expect(401);
    expect(loginResponse.body.message).toBe('User is blocked');
    await request(baseUrl)
      .post(`/api/admin/users/${jobseekerId}/unblock`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    console.log('User blocked and unblocked');
  }, 15000);

  it('should delete job post and associated complaints as admin', async () => {
    await request(baseUrl)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_post_id: jobPostId, reason: 'Test complaint' })
      .expect(201);
    const deleteResponse = await request(baseUrl)
      .delete(`/api/admin/job-posts/${jobPostId}`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(deleteResponse.body.message).toBe('Job post deleted successfully');
    const complaintsResponse = await request(baseUrl)
      .get('/api/admin/complaints')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(complaintsResponse.body.find((c: any) => c.job_post_id === jobPostId)).toBeUndefined();
    cleanupIds.jobs = cleanupIds.jobs.filter(id => id !== jobPostId);
    console.log('Job post and complaints deleted');
  }, 15000);

  it('should set global application limit as admin', async () => {
    const response = await request(baseUrl)
      .post('/api/admin/settings/application-limit')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .set('Content-Type', 'application/json')
      .send({ limit: 1000 })
      .expect(200);
    expect(response.body.message).toBe('Global application limit updated successfully');
    const getResponse = await request(baseUrl)
      .get('/api/admin/settings/application-limit')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(getResponse.body.globalApplicationLimit).toBe(1000);
    console.log('Global application limit set');
  }, 15000);

  it('should export users to CSV as admin', async () => {
    const response = await request(baseUrl)
      .get('/api/admin/users/export-csv')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(response.headers['content-type']).toBe('text/csv');
    expect(response.headers['content-disposition']).toMatch(/attachment; filename="users.csv"/);
    expect(response.text).toContain('User ID,Email,Username,Role,Status,Created At,Updated At');
    console.log('Users exported to CSV');
  }, 15000);

  it('should notify job seekers as admin', async () => {
    const newJobResponse = await request(baseUrl)
      .post('/api/job-posts')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Notify Test Job',
        description: 'Test for notification',
        location: 'Remote',
        salary: 45000,
        job_type: 'Part-time',
        category_id: categoryId,
      })
      .expect(201);
    const notifyJobId = newJobResponse.body.id;
    cleanupIds.jobs.push(notifyJobId);
    await request(baseUrl)
      .post(`/api/admin/job-posts/${notifyJobId}/approve`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    const response = await request(baseUrl)
      .post(`/api/admin/job-posts/${notifyJobId}/notify-candidates`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .set('Content-Type', 'application/json')
      .send({ limit: 10, orderBy: 'random' })
      .expect(200);
    expect(response.body).toHaveProperty('total');
    expect(response.body).toHaveProperty('sent');
    expect(response.body.jobPostId).toBe(notifyJobId);
    console.log('Job seekers notified');
  }, 15000);

  it('should get online user status as admin', async () => {
    const response = await request(baseUrl)
      .get(`/api/users/${jobseekerId}/online`)
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(response.body).toHaveProperty('isOnline');
    console.log('Online user status retrieved');
  }, 15000);

  it('should get top jobseekers by applications as admin', async () => {
    const response = await request(baseUrl)
      .get('/api/admin/leaderboards/top-jobseekers')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .query({ limit: 5 })
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    console.log('Top jobseekers retrieved');
  }, 15000);

  it('should get top employers by posts as admin', async () => {
    const response = await request(baseUrl)
      .get('/api/admin/leaderboards/top-employers-by-posts')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .query({ limit: 5 })
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    console.log('Top employers retrieved');
  }, 15000);

  it('should get recent registrations as admin', async () => {
    const response = await request(baseUrl)
      .get('/api/admin/analytics/recent-registrations')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .query({ limit: 5 })
      .expect(200);
    expect(response.body).toHaveProperty('jobseekers');
    expect(response.body).toHaveProperty('employers');
    console.log('Recent registrations retrieved');
  }, 15000);

  it('should get geographic distribution as admin', async () => {
    const response = await request(baseUrl)
      .get('/api/admin/analytics/geographic-distribution')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty('country');
    expect(response.body[0]).toHaveProperty('count');
    expect(response.body[0]).toHaveProperty('percentage');
    console.log('Geographic distribution retrieved');
  }, 15000);

  it('should block and unblock country as admin', async () => {
    const blockResponse = await request(baseUrl)
      .post('/api/admin/blocked-countries')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .set('Content-Type', 'application/json')
      .send({ countryCode: 'IN' })
      .expect(201);
    expect(blockResponse.body.country_code).toBe('IN');
    const getResponse = await request(baseUrl)
      .get('/api/admin/blocked-countries')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    expect(getResponse.body.some((c: any) => c.country_code === 'IN')).toBe(true);
    await request(baseUrl)
      .delete('/api/admin/blocked-countries/IN')
      .set('Authorization', `Bearer ${await getAdminToken()}`)
      .expect(200);
    console.log('Country blocked and unblocked');
  }, 15000);
});