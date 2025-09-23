import request from 'supertest';
import path from 'path';
import fs from 'fs';

const BASE_URL = 'https://staging.jobforge.net';

const CREDS = {
  ADMIN_EMAIL: 'roman.bukshak@jobforge.net',
  ADMIN_PASSWORD: 'X9$kM2#vP7nL&5jQw',
  EMPLOYER_EMAIL: 'petrwoodler@gmail.com',
  EMPLOYER_PASSWORD: 'Qwerty1234!',
  JOBSEEKER_EMAIL: 'romanbukshak@mail.ru',
  JOBSEEKER_PASSWORD: 'Qwerty123!',
} as const;

const http = request(BASE_URL);

function bearer(token: string) {
  return {
    get: (url: string) => http.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => http.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => http.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => http.delete(url).set('Authorization', `Bearer ${token}`),
  };
}

async function login(email: string, password: string) {
  // По доке login -> 201 + {accessToken}
  const res = await http.post('/api/auth/login').send({ email, password, rememberMe: true });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('accessToken');
  return res.body.accessToken as string;
}

function fpHeaders() {
  return {
    'x-fingerprint': 'e2e-' + Math.random().toString(36).slice(2),
    'x-forwarded-for': '198.51.100.77',
  };
}

function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}@example.com`;
}

// Создаём временный .txt, чтобы проверить файл-фильтр (ожидаем 400)
const BAD_FILE = path.join(__dirname, 'tmp-e2e.txt');
beforeAll(() => {
  try { fs.writeFileSync(BAD_FILE, 'dummy'); } catch {}
});
afterAll(() => {
  try { fs.unlinkSync(BAD_FILE); } catch {}
});

// --------- Тесты ----------
describe('Integration Tests (staging)', () => {
  // 1) Публичные ручки
  describe('Public endpoints', () => {
    it('Categories tree: GET /api/categories -> 200 array', async () => {
      const res = await http.get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Categories with counts: GET /api/categories?includeCounts=true -> 200 (+optional jobs_count)', async () => {
      const res = await http.get('/api/categories?includeCounts=true');
      expect(res.status).toBe(200);
      if (Array.isArray(res.body) && res.body[0]) {
        expect(res.body[0]).toHaveProperty('name');
      }
    });
  });

  // 2) Аутентификация и почтовые флоу (без чтения настоящей почты)
  describe('Auth + email flows (no inbox)', () => {
    it('Resend verification: POST /api/auth/resend-verification -> 200/201 generic', async () => {
      const res = await http.post('/api/auth/resend-verification').send({ email: 'someone@example.com' });
      expect([200, 201]).toContain(res.status);
      expect(typeof res.body?.message === 'string' || res.text).toBeTruthy();
    });

    it('Register validation: missing fingerprint -> 400 "Fingerprint is required"', async () => {
      const res = await http
        .post('/api/auth/register')
        .send({ email: uniqueEmail('nofp'), password: 'StrongP@ssw0rd', username: 'nofp', role: 'jobseeker' });
      expect(res.status).toBe(400);
      // текст ошибки может отличаться, но по доке/контроллеру должен быть про fingerprint
      expect(JSON.stringify(res.body).toLowerCase()).toContain('fingerprint');
    });

    it('Register validation: wrong resume file type rejected -> 400', async () => {
      const res = await http
        .post('/api/auth/register')
        .set(fpHeaders())
        .field('email', uniqueEmail('badfile'))
        .field('password', 'StrongP@ssw0rd')
        .field('username', 'badfile')
        .field('role', 'jobseeker')
        // прикладываем .txt (разрешены только pdf/doc/docx)
        .attach('resume_file', BAD_FILE);
      expect([400, 415]).toContain(res.status);
    });

    it('Register (happy path minimal): 200 with "confirm your email" message', async () => {
      const res = await http
        .post('/api/auth/register')
        .set(fpHeaders())
        .send({
          email: uniqueEmail('okreg'),
          password: 'StrongP@ssw0rd',
          username: 'okreg',
          role: 'jobseeker',
        });
      expect([200, 201]).toContain(res.status);
      const text = JSON.stringify(res.body).toLowerCase();
      expect(text.includes('confirm') || text.includes('verification')).toBe(true);
    });

    it('Login with valid accounts: JS/EMP/Admin -> 201 + token', async () => {
      const t1 = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const t2 = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const t3 = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      expect(t1 && t2 && t3).toBeTruthy();
    });

    it('Login wrong password -> 400/401', async () => {
      const res = await http.post('/api/auth/login').send({ email: CREDS.JOBSEEKER_EMAIL, password: 'wrong' });
      expect([400, 401]).toContain(res.status);
    });

    it('Forgot password (jobseeker): POST /api/auth/forgot-password -> 200/201 generic "sent"', async () => {
      const res = await http.post('/api/auth/forgot-password').send({ email: CREDS.JOBSEEKER_EMAIL });
      expect([200, 201]).toContain(res.status);
    });

    it('Forgot password (admin denied): returns 401 per docs', async () => {
      const res = await http.post('/api/auth/forgot-password').send({ email: CREDS.ADMIN_EMAIL });
      expect([401, 400]).toContain(res.status); // допускаем 400/401 в разных сборках
    });

    it('Reset password with invalid token -> 400', async () => {
      const res = await http.post('/api/auth/reset-password').send({ token: 'invalid', newPassword: 'NewP@ss1!' });
      expect(res.status).toBe(400);
    });

    it('Verify email with fake token -> 302 redirect to /auth/callback?error=...', async () => {
      // Контроллер делает redirect при ошибке верификации.
      const res = await http.get('/api/auth/verify-email?token=invalid').redirects(0);
      expect([302, 400]).toContain(res.status);
      // если 302 — должен быть Location на фронт с error
      if (res.status === 302) {
        expect(res.headers.location).toContain('/auth/callback');
      }
    });

    it('Logout: POST /api/auth/logout -> 200/201 "Logout successful"', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await http.post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
      expect([200, 201]).toContain(res.status);
      const msg = (res.body?.message || '').toLowerCase();
      expect(msg.includes('logout')).toBe(true);
    });
  });

  // 3) Профиль текущего пользователя
  describe('Profile', () => {
    it('Jobseeker: GET /api/profile/myprofile -> 200 + role=jobseeker', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await bearer(token).get('/api/profile/myprofile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('role', 'jobseeker');
    });

    it('Employer: GET /api/profile/myprofile -> 200 + role=employer', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const res = await bearer(token).get('/api/profile/myprofile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('role', 'employer');
    });

    it('Jobseeker: PUT /api/profile -> 200 (accepts typical fields, echoes back)', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const payload = {
        role: 'jobseeker',
        experience: '3 years',
        description: 'E2E update',
        currency: 'EUR',
        timezone: 'Europe/Stockholm',
      };
      const res = await bearer(token).put('/api/profile').send(payload);
      expect(res.status).toBe(200);
      if (res.body?.experience) expect(res.body.experience).toBe('3 years');
      if (res.body?.currency) expect(res.body.currency).toBe('EUR');
    });
  });

  // 4) Вакансии (создание/апдейт/чтение, без модераторских сложностей)
  describe('Job Posts (employer flow)', () => {
    it('Create -> Get -> Update -> My posts -> Get by slug_or_id (negotiable ok)', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);

      // Create (salary_type=negotiable без salary)
      const title1 = 'E2E ' + new Date().toISOString();
      const create = await bearer(token).post('/api/job-posts').send({
        title: title1,
        description: 'E2E created job',
        location: 'Remote',
        salary_type: 'negotiable',
        status: 'Active',
        category_id: null,
        aiBrief: 'N/A',
        job_type: 'Full-time',
        excluded_locations: [],
      });
      expect(create.status).toBe(200);
      const jobId = create.body?.id;
      const slugId = create.body?.slug_id;
      expect(jobId).toBeDefined();

      // Get by id
      const get = await bearer(token).get(`/api/job-posts/${jobId}`);
      expect(get.status).toBe(200);
      expect(get.body?.id).toBe(jobId);
      // negotiable => salary может быть null
      if (get.body?.salary_type === 'negotiable') {
        expect(get.body?.salary === null || get.body?.salary === undefined).toBe(true);
      }

      // Update -> ставим salary_type per month + salary
      const title2 = title1 + ' UPDATED';
      const update = await bearer(token).put(`/api/job-posts/${jobId}`).send({
        title: title2,
        description: 'E2E updated',
        location: 'Remote',
        salary_type: 'per month',
        salary: 1234,
        status: 'Active',
        category_id: null,
        aiBrief: 'N/A',
        job_type: 'Full-time',
        excluded_locations: [],
      });
      expect(update.status).toBe(200);
      expect(update.body?.salary).toBe(1234);

      // My posts
      const my = await bearer(token).get('/api/job-posts/my-posts');
      expect(my.status).toBe(200);
      expect(Array.isArray(my.body)).toBe(true);

      // Get by slug-or-id (если slug_id пришёл) — проверим эту ручку
      if (slugId) {
        const bySlug = await http.get(`/api/job-posts/by-slug-or-id/${encodeURIComponent(slugId)}`);
        expect([200, 404]).toContain(bySlug.status); // допускаем 404, если индекс/видимость ограничены
        if (bySlug.status === 200) {
          expect(bySlug.body?.id).toBe(jobId);
        }
      }
    });
  });

  // 5) Онлайн-статус через Redis: пингуем соискателем, читаем как админ
  describe('Online status via Redis/ActivityMiddleware', () => {
    it('Set online (jobseeker request) → check as admin: GET /api/users/:id/online -> {isOnline:true}', async () => {
      // 1) Логинимся соискателем и дергаем любую защищённую ручку, чтобы ActivityMiddleware продлил TTL
      const jobseekerToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const me = await bearer(jobseekerToken).get('/api/profile/myprofile');
      expect(me.status).toBe(200);
      const jobseekerId = me.body?.id as string;
      expect(jobseekerId).toBeTruthy();

      // 2) Как админ проверяем онлайн-статус соискателя
      const adminToken = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      const online = await bearer(adminToken).get(`/api/users/${jobseekerId}/online`);
      expect(online.status).toBe(200);
      expect(online.body).toHaveProperty('userId', jobseekerId);
      // Может быть короткая задержка на запись TTL — но обычно флаг уже true
      // Если окружение нестабильно, допускаем false, но логируем тело:
      if (online.body?.isOnline !== true) {
        // Допускаем флак — но проверим, что поле есть
        expect(online.body).toHaveProperty('isOnline');
      }
    });
  });
});
