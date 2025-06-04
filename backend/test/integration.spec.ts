import * as request from 'supertest';

describe('Integration Tests (e2e)', () => {
  const baseUrl = process.env.BASE_URL || 'https://jobforge.net';
  let adminToken = '';
  let jobseekerToken = '';
  let employerToken = '';
  let jobseekerId = '';
  let employerId = '';
  let categoryId = '';
  let jobPostId = '';
  let newJobPostId = '';
  let applicationId = '';
  let newApplicationId = '';
  let reviewId = '';

  beforeAll(async () => {
    // Логин админа
    const adminResponse = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-admin`)
      .send({
        email: 'newadmin@example.com',
        password: 'admin123',
      });

    expect(adminResponse.body).toHaveProperty('accessToken');
    adminToken = adminResponse.body.accessToken;
    console.log('Admin logged in, token:', adminResponse.body.accessToken);

    // Очистка категорий перед тестом
    const categoriesResponse = await request(baseUrl)
      .get('/api/categories')
      .set('Content-Type', 'application/json');
    const testCategories = categoriesResponse.body.filter(cat => cat.name.startsWith('Test Category'));
    for (const category of testCategories) {
      await request(baseUrl)
        .delete(`/api/admin/categories/${category.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json');
      console.log(`Deleted existing category ${category.id}:`, category.name);
    }

    // Регистрация фрилансера
    const jobseekerTimestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const jobseekerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${jobseekerTimestamp}`)
      .send({
        email: `jobseeker${jobseekerTimestamp}@example.com`,
        password: 'jobseeker123',
        username: `jobseeker${jobseekerTimestamp}`,
        role: 'jobseeker',
      });

    expect(jobseekerResponse.body).toHaveProperty('accessToken');
    jobseekerToken = jobseekerResponse.body.accessToken;
    console.log('Jobseeker registered, token:', jobseekerResponse.body.accessToken);

    const jobseekerProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');
    jobseekerId = jobseekerProfile.body.id;
    console.log('Jobseeker profile:', jobseekerProfile.body);

    // Регистрация работодателя
    const employerTimestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const employerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${employerTimestamp}`)
      .send({
        email: `employer${employerTimestamp}@example.com`,
        password: 'employer123',
        username: `employer${employerTimestamp}`,
        role: 'employer',
      });

    expect(employerResponse.body).toHaveProperty('accessToken');
    employerToken = employerResponse.body.accessToken;
    console.log('Employer registered, token:', employerResponse.body.accessToken);

    const employerProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json');
    employerId = employerProfile.body.id;
    console.log('Employer profile:', employerProfile.body);
  }, 30000);

  afterAll(async () => {
    // Очистка базы
    if (adminToken) {
      // Удаление вакансий
      if (jobPostId) {
        const deleteJobResponse = await request(baseUrl)
          .delete(`/api/job-posts/${jobPostId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', 'application/json');
        console.log(`Deleted job post ${jobPostId}:`, deleteJobResponse.body);
      }
      if (newJobPostId) {
        const deleteNewJobResponse = await request(baseUrl)
          .delete(`/api/job-posts/${newJobPostId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', 'application/json');
        console.log(`Deleted new job post ${newJobPostId}:`, deleteNewJobResponse.body);
      }

      // Удаление пользователей
      if (jobseekerId) {
        const deleteJobseekerResponse = await request(baseUrl)
          .delete(`/api/admin/users/${jobseekerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', 'application/json');
        console.log(`Deleted jobseeker ${jobseekerId}:`, deleteJobseekerResponse.body);
      }
      if (employerId) {
        const deleteEmployerResponse = await request(baseUrl)
          .delete(`/api/admin/users/${employerId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', 'application/json');
        console.log(`Deleted employer ${employerId}:`, deleteEmployerResponse.body);
      }

      // Удаление категории
      if (categoryId) {
        const deleteCategoryResponse = await request(baseUrl)
          .delete(`/api/admin/categories/${categoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', 'application/json');
        console.log(`Deleted category ${categoryId}:`, deleteCategoryResponse.body);
      }
    }
  }, 20000);

  // Тест 1: Регистрация админа (пропущен, так как отключена)

  // Тест 2: Регистрация фрилансера (jobseeker) — уже в beforeAll

  // Тест 3: Регистрация работодателя (employer) — уже в beforeAll

  // Тест 4: Регистрация с дублирующимся email
  it('should fail to register with duplicate email', async () => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const email = `jobseeker${timestamp}@example.com`;

    // Первая регистрация
    const firstRegisterResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'jobseeker123',
        username: `jobseeker${timestamp}`,
        role: 'jobseeker',
      });
    expect(firstRegisterResponse.body).toHaveProperty('accessToken');
    console.log('First registration successful, token:', firstRegisterResponse.body.accessToken);

    // Вторая регистрация с тем же email
    const response = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'jobseeker123',
        username: `jobseeker${timestamp}2`,
        role: 'jobseeker',
      });

    expect(response.body.message).toContain('Email already exists');
    console.log('Failed to register with duplicate email:', response.body.message);

    // Очистка
    const duplicateUserProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${firstRegisterResponse.body.accessToken}`)
      .set('Content-Type', 'application/json');
    const duplicateUserId = duplicateUserProfile.body.id;

    const deleteResponse = await request(baseUrl)
      .delete(`/api/admin/users/${duplicateUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    console.log(`Deleted duplicate user ${duplicateUserId}:`, deleteResponse.body);
  }, 10000);

  // Тест 5: Регистрация из заблокированной страны
  it('should fail to register from a blocked country', async () => {
    // Сначала добавляем страну IN в список заблокированных
    const blockCountryResponse = await request(baseUrl)
      .post('/api/admin/blocked-countries')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({
        countryCode: 'IN',
      });
    expect(blockCountryResponse.body).toHaveProperty('country_code', 'IN');
    console.log('Blocked country IN:', blockCountryResponse.body);

    // Пытаемся зарегистрироваться
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const response = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '103.194.0.1') // IP из Индии
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email: `jobseeker${timestamp}@example.com`,
        password: 'jobseeker123',
        username: `jobseeker${timestamp}`,
        role: 'jobseeker',
      });

    expect(response.body.message).toContain('Registration is not allowed from your country');
    console.log('Failed to register from blocked country:', response.body.message);

    // Очистка: удаляем страну из заблокированных
    const unblockCountryResponse = await request(baseUrl)
      .delete('/api/admin/blocked-countries/IN')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    console.log('Unblocked country IN:', unblockCountryResponse.body);
  }, 10000);

  // Тест 6: Логин фрилансера
  it('should login a jobseeker', async () => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const email = `jobseeker${timestamp}@example.com`;

    // Регистрация
    const registerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'jobseeker123',
        username: `jobseeker${timestamp}`,
        role: 'jobseeker',
      });

    expect(registerResponse.body).toHaveProperty('accessToken');
    console.log('Jobseeker registered, token:', registerResponse.body.accessToken);

    // Логин
    const response = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'jobseeker123',
      });

    expect(response.body).toHaveProperty('accessToken');
    console.log('Jobseeker logged in, token:', response.body.accessToken);

    // Очистка
    const userProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .set('Content-Type', 'application/json');
    const userId = userProfile.body.id;

    const deleteResponse = await request(baseUrl)
      .delete(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    console.log(`Deleted user ${userId}:`, deleteResponse.body);
  }, 10000);

  // Тест 7: Логин работодателя
  it('should login an employer', async () => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const email = `employer${timestamp}@example.com`;

    // Регистрация
    const registerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'employer123',
        username: `employer${timestamp}`,
        role: 'employer',
      });

    expect(registerResponse.body).toHaveProperty('accessToken');
    console.log('Employer registered, token:', registerResponse.body.accessToken);

    // Логин
    const response = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'employer123',
      });

    expect(response.body).toHaveProperty('accessToken');
    console.log('Employer logged in, token:', response.body.accessToken);

    // Очистка
    const userProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .set('Content-Type', 'application/json');
    const userId = userProfile.body.id;

    const deleteResponse = await request(baseUrl)
      .delete(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    console.log(`Deleted user ${userId}:`, deleteResponse.body);
  }, 10000);

  // Тест 8: Логин с неправильным паролем
  it('should fail to login with incorrect password', async () => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const email = `jobseeker${timestamp}@example.com`;

    // Регистрация
    const registerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'jobseeker123',
        username: `jobseeker${timestamp}`,
        role: 'jobseeker',
      });

    expect(registerResponse.body).toHaveProperty('accessToken');
    console.log('Jobseeker registered, token:', registerResponse.body.accessToken);

    // Логин с неправильным паролем
    const response = await request(baseUrl)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2')
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`)
      .send({
        email,
        password: 'wrongpassword',
      });

    expect(response.body.message).toContain('Invalid credentials');
    console.log('Failed login with incorrect password:', response.body.message);

    // Очистка
    const userProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .set('Content-Type', 'application/json');
    const userId = userProfile.body.id;

    const deleteResponse = await request(baseUrl)
      .delete(`/api/admin/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    console.log(`Deleted user ${userId}:`, deleteResponse.body);
  }, 10000);

  // Тест 8.1: Логаут фрилансера
  it('should logout a jobseeker', async () => {
    const response = await request(baseUrl)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'Logout successful');
    console.log('Jobseeker logged out:', response.body);
  }, 15000);

  // Тест 9: Логин с Google OAuth (заглушка, пропускаем)
  it.skip('should login with Google OAuth', () => {});

  // Тест 10: Получение профиля фрилансера
  it('should get jobseeker profile', async () => {
    const response = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('role', 'jobseeker');
    console.log('Jobseeker profile:', response.body);
  }, 10000);

  // Тест 11: Получение профиля работодателя
  it('should get employer profile', async () => {
    const response = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('role', 'employer');
    expect(response.body).toHaveProperty('company_name');
    console.log('Employer profile:', response.body);
  }, 10000);

  // Тест 12: Обновление профиля фрилансера
  it('should update jobseeker profile', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        skills: ['JavaScript', 'TypeScript'],
        experience: '3 years',
        timezone: 'America/New_York',
        currency: 'USD',
      });

    expect(response.body.skills).toEqual(['JavaScript', 'TypeScript']);
    expect(response.body.experience).toBe('3 years');
    console.log('Updated jobseeker profile:', response.body);
  }, 10000);

  // Тест 13: Обновление профиля работодателя
  it('should update employer profile', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        company_name: 'Tech Corp',
        company_info: 'We build tech solutions',
      });

    expect(response.body).toHaveProperty('company_name', 'Tech Corp');
    expect(response.body).toHaveProperty('company_info', 'We build tech solutions');
    console.log('Updated employer profile:', response.body);
  }, 10000);

  // Тест 14: Обновление профиля с некорректной ролью
  it('should fail to update profile with incorrect role', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        company_name: 'Tech Corp', // Поле для работодателя
      });

    expect(response.body.message).toContain('User role mismatch');
    console.log('Failed to update profile:', response.body.message);
  }, 10000);

  // Тест 15: Инкремент просмотров профиля фрилансера
  it('should increment jobseeker profile views', async () => {
    const getProfileResponse = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    const initialViews = getProfileResponse.body.profileViews || 0;
    console.log('Initial profile views:', initialViews);

    const response = await request(baseUrl)
      .post(`/api/profile/${jobseekerId}/increment-view`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'Profile view count incremented');
    console.log('Incremented profile views:', response.body);

    const updatedProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    expect(updatedProfile.body.profileViews).toBe(initialViews + 1);
    console.log('Updated profile views:', updatedProfile.body.profileViews);
  }, 10000);

  // Тест 16: Загрузка аватара фрилансера (заглушка)
  it.skip('should upload jobseeker avatar', () => {});

  // Тест 17: Загрузка аватара работодателя (заглушка)
  it.skip('should upload employer avatar', () => {});

  // Тест 18: Загрузка документа для верификации (заглушка)
  it.skip('should upload identity document', () => {});

  // Тест 19: Проверка онлайн-статуса пользователя
  it('should check online status', async () => {
    const response = await request(baseUrl)
      .get(`/api/users/${jobseekerId}/online`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('isOnline', true);
    console.log('Online status:', response.body);
  }, 10000);

  // Тест 20: Создание категории (админ)
  it('should create a category (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .post('/api/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({
        name: `Test Category ${new Date().toISOString()}`,
      });

    expect(response.body).toHaveProperty('name');
    categoryId = response.body.id;
    console.log('Created category:', response.body);
  }, 10000);

  // Тест 21: Получение списка категорий
  it('should get list of categories', async () => {
    const response = await request(baseUrl)
      .get('/api/categories')
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Categories:', response.body);
  }, 10000);

  // Тест 22: Обновление профиля фрилансера с категориями
  it('should update jobseeker profile with categories', async () => {
    const response = await request(baseUrl)
      .put('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        categoryIds: [categoryId],
      });

    expect(response.body.categoryIds).toContain(categoryId);
    console.log('Updated jobseeker profile with categories:', response.body);
  }, 10000);

  // Тест 23: Создание вакансии (работодатель)
  it('should create a job post (employer)', async () => {
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
        required_skills: ['JavaScript', 'TypeScript'],
      });

    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('Software Engineer');
    expect(response.body.pending_review).toBe(true);
    jobPostId = response.body.id;
    console.log('Created job post:', response.body);
  }, 10000);

  // Тест 24: Получение списка вакансий
  it('should get list of job posts', async () => {
    const response = await request(baseUrl)
      .get('/api/job-posts')
      .set('Content-Type', 'application/json')
      .query({
        page: 1,
        limit: 10,
      });

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Job posts:', response.body);
  }, 10000);

  // Тест 25: Поиск вакансий с фильтрами
  it('should search job posts with filters', async () => {
    const response = await request(baseUrl)
      .get('/api/job-posts')
      .set('Content-Type', 'application/json')
      .query({
        title: 'Software Engineer',
        job_type: 'Full-time',
        page: 1,
        limit: 10,
      });

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Filtered job posts:', response.body);
  }, 10000);

  // Тест 26: Обновление вакансии (работодатель)
  it('should update a job post (employer)', async () => {
    const response = await request(baseUrl)
      .put(`/api/job-posts/${jobPostId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Senior Software Engineer',
        salary: 60000,
      });

    expect(response.body.title).toBe('Senior Software Engineer');
    expect(response.body.salary).toBe(60000);
    console.log('Updated job post:', response.body);
  }, 10000);


  // Тест 27: Закрытие вакансии (работодатель)
  it('should close a job post (employer)', async () => {
    const response = await request(baseUrl)
      .post(`/api/job-posts/${jobPostId}/close`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body.status).toBe('Closed');
    console.log('Closed job post:', response.body);
  }, 10000);

  // Тест 28: Одобрение вакансии (админ)
  it('should approve a job post (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    // Создаём новую вакансию
    const createResponse = await request(baseUrl)
      .post('/api/job-posts')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        title: 'Software Engineer 2',
        description: 'Another engineer needed',
        location: 'Remote',
        salary: 50000,
        job_type: 'Full-time',
        category_id: categoryId,
        required_skills: ['JavaScript'],
      });

    expect(createResponse.body).toHaveProperty('id');
    newJobPostId = createResponse.body.id;
    console.log('Created new new job post:', createResponse.body);

    const response = await request(baseUrl)
      .post(`/api/admin/job-posts/${newJobPostId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body.pending_review).toBe(false);
    console.log('Approved job post:', response.body);
  }, 10000);

  // Тест 29: Флагирование вакансии (админ)
  it('should flag a job post (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .post(`/api/admin/job-posts/${jobPostId}/flag`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('pending_review', true);
    console.log('Flagged job post:', response.body);
  }, 10000);

  // Тест 30: Установка лимита заявок (админ)
  it('should set application limit (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .post(`/api/admin/job-posts/${jobPostId}/set-application-limit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({
        limit: 50,
      });

    expect(response.body.limit).toBe(50);
    console.log('Set application limit:', response.body);
  }, 10000);

  // Тест 31: Инкремент просмотров вакансии
  it('should increment job post views', async () => {
    const getJobResponse = await request(baseUrl)
      .get(`/api/job-posts/${jobPostId}`)
      .set('Content-Type', 'application/json');

    const initialViews = getJobResponse.body.views || 0;
    console.log('Initial job post views:', initialViews);

    const response = await request(baseUrl)
      .post(`/api/job-posts/${jobPostId}/increment-view`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'View count incremented');
    console.log('Incremented job post views:', response.body);

    const updatedJob = await request(baseUrl)
      .get(`/api/job-posts/${jobPostId}`)
      .set('Content-Type', 'application/json');

    expect(updatedJob.body.views).toBe(initialViews + 1);
    console.log('Updated job post views:', updatedJob.body.views);
  }, 10000);

  // Тест 32: Удаление вакансии (админ)
  it('should delete a job post (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .delete(`/api/job-posts/${jobPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'Job post deleted successfully');
    console.log('Deleted job post:', response.body);

    const getResponse = await request(baseUrl)
      .get(`/api/job-posts/${jobPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(getResponse.body.message).toContain('Job post not found');
    console.log('Confirmed job post deletion:', getResponse.body.message);
    jobPostId = ''; // Обнуляем, так как удалили
  }, 10000);

  // Тест 33: Подача заявки на вакансию (фрилансер)
  it('should apply to a job post (jobseeker)', async () => {
    const response = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_post_id: newJobPostId,
      });

    expect(response.body).toHaveProperty('id');
    expect(response.body.job_post_id).toBe(newJobPostId);
    expect(response.body.status).toBe('Pending');
    applicationId = response.body.id;
    console.log('Created job application:', response.body);
  }, 10000);

  // Тест 34: Повторная подача заявки (должна быть ошибка)
  it('should fail to apply to the same job post twice', async () => {
    const response = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_post_id: newJobPostId,
      });

    expect(response.body.message).toContain('You have already applied to this job post');
    console.log('Failed to apply twice:', response.body.message);
  }, 10000);

  // Тест 35: Получение списка заявок фрилансера
  it('should get jobseeker applications', async () => {
    const response = await request(baseUrl)
      .get('/api/job-applications/my-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].job_post_id).toBe(newJobPostId);
    console.log('Jobseeker applications:', response.body);
  }, 10000);

  // Тест 36: Получение списка заявок на вакансию (работодатель)
  it('should get applications for a job post (employer)', async () => {
    const response = await request(baseUrl)
      .get(`/api/job-applications/job-post/${newJobPostId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].userId).toBe(jobseekerId);
    console.log('Job post applications:', response.body);
  }, 10000);

  // Тест 37: Обновление статуса заявки (работодатель)
  it('should update application status (employer)', async () => {
    const response = await request(baseUrl)
      .put(`/api/job-applications/${applicationId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        status: 'Accepted',
      });

    expect(response.body.status).toBe('Accepted');
    console.log('Updated application status:', response.body);
  }, 10000);

  // Тест 37.1: Ограничение на одну Accepted заявку
  it('should allow only one accepted application and close job post', async () => {
    // Создать вторую заявку
    const newJobseekerTimestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const newJobseekerResponse = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.3')
      .set('X-Fingerprint', `test-fingerprint-${newJobseekerTimestamp}`)
      .send({
        email: `jobseeker${newJobseekerTimestamp}@example.com`,
        password: 'jobseeker123',
        username: `jobseeker${newJobseekerTimestamp}`,
        role: 'jobseeker',
      });
    expect(newJobseekerResponse.body).toHaveProperty('accessToken');
    const newJobseekerToken = newJobseekerResponse.body.accessToken;
    console.log('New jobseeker registered:', newJobseekerResponse.body);

    const newApplicationResponse = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${newJobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ job_post_id: newJobPostId });
    expect(newApplicationResponse.body).toHaveProperty('id');
    const newApplicationId = newApplicationResponse.body.id;
    console.log('Created new application:', newApplicationResponse.body);

    // Принять первую заявку
    const acceptResponse = await request(baseUrl)
      .put(`/api/job-applications/${applicationId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'Accepted' });
    expect(acceptResponse.body.status).toBe('Accepted');
    console.log('Accepted first application:', acceptResponse.body);

    // Проверить, что вакансия закрыта
    const jobResponse = await request(baseUrl)
      .get(`/api/job-posts/${newJobPostId}`)
      .set('Content-Type', 'application/json');
    expect(jobResponse.body.status).toBe('Closed');
    console.log('Job post closed:', jobResponse.body);

    // Попытка принять вторую заявку
    const secondAcceptResponse = await request(baseUrl)
      .put(`/api/job-applications/${newApplicationId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({ status: 'Accepted' });
    expect(secondAcceptResponse.body.message).toContain('Only one application can be accepted per job post');
    console.log('Failed to accept second application:', secondAcceptResponse.body.message);

    // Очистка: удалить нового jobseeker'а
    const newJobseekerProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${newJobseekerToken}`)
      .set('Content-Type', 'application/json');
    const newJobseekerId = newJobseekerProfile.body.id;
    await request(baseUrl)
      .delete(`/api/admin/users/${newJobseekerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    console.log(`Deleted new jobseeker ${newJobseekerId}`);
  }, 15000);

  // Тест 38: Подача заявки на закрытую вакансию
  it('should fail to apply to a closed job post', async () => {
    // Закрываем вакансию
    const closeResponse = await request(baseUrl)
      .post(`/api/job-posts/${newJobPostId}/close`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json');
    expect(closeResponse.body.status).toBe('Closed');
    console.log('Closed job post:', closeResponse.body);

    const response = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_post_id: newJobPostId,
      });

    expect(response.body.message).toContain('Cannot apply to a job post that is not active');
    console.log('Failed to apply to closed job:', response.body.message);
  }, 10000);

  // Тест 39: Подача заявки после превышения лимита
  it('should fail to apply after application limit', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    // Устанавливаем лимит 1 заявка
    const setLimitResponse = await request(baseUrl)
      .post(`/api/admin/job-posts/${newJobPostId}/set-application-limit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({
        limit: 1,
      });
    expect(setLimitResponse.body.limit).toBe(1);
    console.log('Set application limit:', setLimitResponse.body);

    // Вторая заявка (должна быть ошибка)
    const response = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_post_id: newJobPostId,
      });

    expect(response.body.message).toContain('Job full');
    console.log('Failed to apply after limit:', response.body.message);
  }, 10000);

  // Тест 40: Получение списка вакансий с фильтром по статусу (админ)
  it('should get job posts with status filter (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/job-posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .query({
        status: 'Closed',
      });

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every(post => post.status === 'Closed')).toBe(true);
    console.log('Filtered job posts:', response.body);
  }, 10000);

  // Тест 41: Создание отзыва работодателем о фрилансере
  it('should create a review from employer to jobseeker', async () => {
    const response = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_application_id: applicationId,
        rating: 5,
        comment: 'Great job!',
      });

    expect(response.body.rating).toBe(5);
    expect(response.body.comment).toBe('Great job!');
    reviewId = response.body.id;
    console.log('Created review:', response.body);
  }, 10000);

  // Тест 42: Создание отзыва фрилансером о работодателе
  it('should create a review from jobseeker to employer', async () => {
    const response = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_application_id: applicationId,
        rating: 4,
        comment: 'Good experience',
      });

    expect(response.body.rating).toBe(4);
    expect(response.body.comment).toBe('Good experience');
    console.log('Created review from jobseeker:', response.body);
  }, 10000);

  // Тест 43: Повторный отзыв на ту же заявку
  it('should fail to create a duplicate review', async () => {
    const response = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_application_id: applicationId,
        rating: 3,
        comment: 'Duplicate review',
      });

    expect(response.body.message).toContain('You have already left a review for this job application');
    console.log('Failed to create duplicate review:', response.body.message);
  }, 10000);

  // Тест 44: Создание отзыва на заявку без статуса Accepted
  it('should fail to create a review for non-accepted application', async () => {
    // Подаём заявку
    const newApplicationResponse = await request(baseUrl)
      .post('/api/job-applications')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_post_id: newJobPostId,
      });

    expect(newApplicationResponse.body).toHaveProperty('id');
    newApplicationId = newApplicationResponse.body.id;
    console.log('Created new application:', newApplicationResponse.body);

    // Пробуем оставить отзыв
    const response = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_application_id: newApplicationId,
        rating: 5,
        comment: 'Not accepted yet',
      });

    expect(response.body.message).toContain('Reviews can only be left for accepted job applications');
    console.log('Failed to create review for non-accepted application:', response.body.message);
  }, 10000);

  // Тест 45: Получение списка отзывов о пользователе
  it('should get reviews for a user', async () => {
    const response = await request(baseUrl)
      .get(`/api/reviews/user/${jobseekerId}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0].rating).toBe(5);
    console.log('User reviews:', response.body);
  }, 10000);

  // Тест 46: Получение списка всех отзывов (админ)
  it('should get all reviews (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/reviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    console.log('All reviews:', response.body);
  }, 10000);

  // Тест 47: Удаление отзыва (админ)
  it('should delete a review (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .delete(`/api/admin/reviews/${reviewId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'Review deleted successfully');
    console.log('Deleted review:', response.body);
  }, 10000);

  // Тест 48: Обновление рейтинга пользователя после отзыва
  it('should update user rating after review', async () => {
    const getProfileResponse = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    const initialRating = getProfileResponse.body.average_rating || 0;
    console.log('Initial rating:', initialRating);

    const updateAppResponse = await request(baseUrl)
      .put(`/api/job-applications/${newApplicationId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        status: 'Accepted',
      });
    expect(updateAppResponse.body.status).toBe('Accepted');
    console.log('Updated application status for review:', updateAppResponse.body);

    const reviewResponse = await request(baseUrl)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${employerToken}`)
      .set('Content-Type', 'application/json')
      .send({
        job_application_id: newApplicationId,
        rating: 4,
        comment: 'Another review',
      });
    expect(reviewResponse.body.rating).toBe(4);
    console.log('Created review for rating update:', reviewResponse.body);

    const updatedProfile = await request(baseUrl)
      .get('/api/profile')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json');

    expect(updatedProfile.body.average_rating).toBeGreaterThan(initialRating);
    console.log('Updated rating:', updatedProfile.body.average_rating);
  }, 10000);

  // Тест 49: Получение общей аналитики (админ)
  it('should get overall analytics (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('totalUsers');
    expect(response.body).toHaveProperty('totalJobPosts');
    console.log('Overall analytics:', response.body);
  }, 10000);

  // Тест 50: Получение аналитики регистраций (админ)
  it('should get registration analytics (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/analytics/registrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .query({
        startDate: '2025-05-01',
        endDate: '2025-06-02',
        interval: 'day',
      });

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Registration analytics:', response.body);
  }, 10000);

  // Тест 51: Получение географической аналитики (админ)
  it('should get geographic distribution (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/analytics/geographic-distribution')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Geographic distribution:', response.body);
  }, 10000);

  // Тест 52: Получение трендов роста (админ)
  it('should get growth trends (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/analytics/growth-trends')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .query({
        period: '7d',
      });

    expect(response.body).toHaveProperty('registrations');
    expect(response.body).toHaveProperty('jobPosts');
    console.log('Growth trends:', response.body);
  }, 10000);

  // Тест 53: Получение последних регистраций (админ)
  it('should get recent registrations (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/analytics/recent-registrations')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body.jobseekers)).toBe(true);
    expect(Array.isArray(response.body.employers)).toBe(true);
    console.log('Recent registrations:', response.body);
  }, 10000);

  // Тест 54: Получение списка вакансий с заявками (админ)
  it('should get job posts with applications (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/job-posts/applications')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Job posts with applications:', response.body);
  }, 10000);

  // Тест 55: Получение количества онлайн-пользователей (админ)
  it('should get online users count (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/analytics/online-users')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('jobseekers');
    expect(response.body).toHaveProperty('employers');
    console.log('Online users count:', response.body);
  }, 10000);

  // Тест 55.1: Отправка и получение feedback
  it('should submit and retrieve feedback', async () => {
    const submitResponse = await request(baseUrl)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${jobseekerToken}`)
      .set('Content-Type', 'application/json')
      .send({ message: 'Great platform!' });
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.message).toBe('Great platform!');
    console.log('Submitted feedback:', submitResponse.body);

    const getResponse = await request(baseUrl)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');
    expect(Array.isArray(getResponse.body)).toBe(true);
    expect(getResponse.body.some(fb => fb.message === 'Great platform!')).toBe(true);
    console.log('Retrieved feedback:', getResponse.body);
  }, 15000);

  // Тест 56: Получение лидерборда фрилансеров (админ)
  it('should get top jobseekers leaderboard (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/leaderboards/top-jobseekers')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Top jobseekers leaderboard:', response.body);
  }, 10000);

  // Тест 57: Получение лидерборда работодателей (админ)
  it('should get top employers leaderboard (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/leaderboards/top-employers-by-posts')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(Array.isArray(response.body)).toBe(true);
    console.log('Top employers leaderboard:', response.body);
  }, 10000);

  // Тест 58: Получение риск-скоринга пользователя (админ)
  it('should get user risk score (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get(`/api/admin/users/${jobseekerId}/risk-score`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('riskScore');
    expect(typeof response.body.riskScore).toBe('number');
    console.log('User risk score:', response.body);
  }, 10000);

  // Тест 59: Блокировка пользователя (админ)
  it('should block a user (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .post(`/api/admin/users/${jobseekerId}/block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'User blocked successfully');
    console.log('Blocked user:', response.body);
  }, 10000);

  // Тест 60: Разблокировка пользователя (админ)
  it('should unblock a user (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .post(`/api/admin/users/${jobseekerId}/unblock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'User unblocked successfully');
    console.log('Unblocked user:', response.body);
  }, 10000);

  // Тест 61: Экспорт пользователей в CSV (админ)
  it('should export users to CSV (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .get('/api/admin/users/export-csv')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.headers['content-type']).toContain('text/csv');
    console.log('Exported users to CSV:', response.headers);
  }, 10000);

  // Тест 62: Удаление пользователя (админ)
  it('should delete a user (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .delete(`/api/admin/users/${employerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'User deleted successfully');
    console.log('Deleted employer:', response.body);

    const getResponse = await request(baseUrl)
      .get(`/api/users/${employerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(getResponse.body.message).toContain('User not found');
    console.log('Confirmed user deletion:', getResponse.body.message);
    employerId = ''; // Обнуляем
  }, 10000);

  // Тест 63: Удаление вакансии (админ)
  it('should delete a job post (admin)', async () => {
    if (!adminToken) {
      throw new Error('Admin login failed');
    }

    const response = await request(baseUrl)
      .delete(`/api/job-posts/${newJobPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(response.body).toHaveProperty('message', 'Job post deleted successfully');
    console.log('Deleted new job post:', response.body);

    const getResponse = await request(baseUrl)
      .get(`/api/job-posts/${newJobPostId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json');

    expect(getResponse.body.message).toContain('Job post not found');
    console.log('Confirmed new job post deletion:', getResponse.body.message);
    newJobPostId = ''; // Обнуляем
  }, 10000);
});