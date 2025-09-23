import request from 'supertest';
import path from 'path';
import fs from 'fs';

jest.setTimeout(60000);
if ((jest as any).retryTimes) {
  (jest as any).retryTimes(1, { logErrorsBeforeRetry: true });
}

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

// ---------- helpers ----------
function bearer(token: string) {
  return {
    get: (url: string) => http.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => http.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => http.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => http.delete(url).set('Authorization', `Bearer ${token}`),
  };
}

async function login(email: string, password: string) {
  // /api/auth/login -> 201 + {accessToken}
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

function expectStatus(res: { status: number }, allowed: number[] | number) {
  const arr = Array.isArray(allowed) ? allowed : [allowed];
  expect(arr).toContain(res.status);
}

// файл для проверки фильтра форматов резюме (ожидаем 400/415)
const BAD_FILE = path.join(__dirname, 'tmp-e2e.txt');
beforeAll(() => { try { fs.writeFileSync(BAD_FILE, 'dummy'); } catch {} });
afterAll(() => { try { fs.unlinkSync(BAD_FILE); } catch {} });

// ---------- tests ----------
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

  // 2) Аутентификация и почтовые флоу (без чтения реальной почты)
  describe('Auth + email flows (no inbox)', () => {
    it('Resend verification: POST /api/auth/resend-verification -> 200/201 generic', async () => {
      const res = await http.post('/api/auth/resend-verification').send({ email: 'someone@example.com' });
      expectStatus(res, [200, 201]);
      expect(typeof res.body?.message === 'string' || res.text).toBeTruthy();
    });

    it('Register validation: missing fingerprint -> 400 (требуется x-fingerprint)', async () => {
      const res = await http
        .post('/api/auth/register')
        .send({ email: uniqueEmail('nofp'), password: 'StrongP@ssw0rd', username: 'nofp', role: 'jobseeker' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body).toLowerCase()).toContain('fingerprint');
    });

    it('Register validation: wrong resume file type -> 400/415 (только pdf/doc/docx разрешены)', async () => {
      const res = await http
        .post('/api/auth/register')
        .set(fpHeaders())
        .field('email', uniqueEmail('badfile'))
        .field('password', 'StrongP@ssw0rd')
        .field('username', 'badfile')
        .field('role', 'jobseeker')
        .attach('resume_file', BAD_FILE);
      expectStatus(res, [400, 415]);
    });

    it('Register minimal: 200/201 + текст про подтверждение email', async () => {
      const res = await http
        .post('/api/auth/register')
        .set(fpHeaders())
        .send({
          email: uniqueEmail('okreg'),
          password: 'StrongP@ssw0rd',
          username: 'okreg',
          role: 'jobseeker',
        });
      expectStatus(res, [200, 201]);
      const text = JSON.stringify(res.body).toLowerCase();
      expect(text.includes('confirm') || text.includes('verification')).toBe(true);
    });

    it('Login valid accounts: jobseeker/employer/admin -> 201 + tokens', async () => {
      const t1 = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const t2 = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const t3 = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      expect(Boolean(t1 && t2 && t3)).toBe(true);
    });

    it('Login wrong password -> 400/401', async () => {
      const res = await http.post('/api/auth/login').send({ email: CREDS.JOBSEEKER_EMAIL, password: 'wrong' });
      expectStatus(res, [400, 401]);
    });

    it('Forgot password (jobseeker): POST /api/auth/forgot-password -> 200/201 generic "sent"', async () => {
      const res = await http.post('/api/auth/forgot-password').send({ email: CREDS.JOBSEEKER_EMAIL });
      expectStatus(res, [200, 201]);
    });

    it('Forgot password (admin): 400/401 (reset запрещён для admin/mod)', async () => {
      const res = await http.post('/api/auth/forgot-password').send({ email: CREDS.ADMIN_EMAIL });
      expectStatus(res, [400, 401]);
    });

    it('Reset password: invalid token -> 400', async () => {
      const res = await http.post('/api/auth/reset-password').send({ token: 'invalid', newPassword: 'NewP@ss1!' });
      expect(res.status).toBe(400);
    });

    it('Verify email: invalid token -> 302 /auth/callback?error=... (или 400 JSON)', async () => {
      const res = await http.get('/api/auth/verify-email?token=invalid').redirects(0);
      expectStatus(res, [302, 400]);
      if (res.status === 302) {
        expect(res.headers.location).toContain('/auth/callback');
      }
    });

    it('Logout: POST /api/auth/logout -> 200/201 "Logout successful"', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await http.post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
      expectStatus(res, [200, 201]);
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

    it('Public profile by id (no auth): GET /api/profile/:id -> 200', async () => {
      const empToken = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const me = await bearer(empToken).get('/api/profile/myprofile');
      const res = await http.get(`/api/profile/${me.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', me.body.id);
      expect(res.body).toHaveProperty('role');
    });

    it('Jobseeker: PUT /api/profile -> 200 (echo updates)', async () => {
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

  // 4) Вакансии работодателя (создание/чтение/апдейт/список + by-slug-or-id + закрытие)
  describe('Job Posts (employer flow)', () => {
    it('Create -> Get -> Update -> My posts -> Get by slug_or_id (negotiable ok)', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);

      // Create (salary_type=negotiable — salary можно опустить)
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
      expectStatus(create, [200, 201]);
      const jobId = create.body?.id;
      const slugId = create.body?.slug_id;
      expect(jobId).toBeDefined();

      // Get by id
      const get = await bearer(token).get(`/api/job-posts/${jobId}`);
      expect(get.status).toBe(200);
      if (get.body?.salary_type === 'negotiable') {
        expect(get.body?.salary == null).toBe(true);
      }

      // Update → теперь per month + salary
      const update = await bearer(token).put(`/api/job-posts/${jobId}`).send({
        title: title1 + ' UPDATED',
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
      expectStatus(update, [200, 201]);
      expect(update.body?.salary).toBe(1234);

      // My posts
      const my = await bearer(token).get('/api/job-posts/my-posts');
      expect(my.status).toBe(200);
      expect(Array.isArray(my.body)).toBe(true);

      // Get by slug-or-id (если slug_id пришёл)
      if (slugId) {
        const bySlug = await http.get(`/api/job-posts/by-slug-or-id/${encodeURIComponent(slugId)}`);
        expect([200, 404]).toContain(bySlug.status);
        if (bySlug.status === 200) expect(bySlug.body?.id).toBe(jobId);
      }
    }, 30000); // локальный таймаут 30с для длинной цепочки

    it('Close job post: first close -> 200/201; second close -> 400/200/201', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const create = await bearer(token).post('/api/job-posts').send({
        title: 'E2E CLOSE ' + Date.now(),
        description: 'close me',
        location: 'Remote',
        salary_type: 'negotiable',
        status: 'Active',
        category_id: null,
        aiBrief: 'N/A',
        job_type: 'Full-time',
        excluded_locations: [],
      });
      expectStatus(create, [200, 201]);
      const jobId = create.body.id;

      const first = await bearer(token).post(`/api/job-posts/${jobId}/close`);
      expect([200, 201]).toContain(first.status);

      const second = await bearer(token).post(`/api/job-posts/${jobId}/close`);
      expect([400, 200, 201]).toContain(second.status);
    });

    it('Generate description (AI): POST /api/job-posts/generate-description -> 200/429/500', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const res = await bearer(token).post('/api/job-posts/generate-description').send({
        aiBrief: 'Need Python dev with 3y exp; Django, SQL',
        title: 'Python Developer',
        salary_type: 'negotiable',
      });
      expect([200, 429, 500]).toContain(res.status);
    }, 30000); // ИИ-ручка может отвечать дольше
  });

  // 5) Отклики на вакансию: успех или ожидаемые ограничения
  describe('Job Applications (apply & my list)', () => {
    it('Jobseeker applies OR получает валидную 400 по лимитам/дублям/локациям/периоду/Job full', async () => {
      // создаём вакансию от имени employer
      const empToken = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const create = await bearer(empToken).post('/api/job-posts').send({
        title: 'E2E APPLY ' + Date.now(),
        description: 'Apply flow',
        location: 'Remote',
        salary_type: 'negotiable',
        status: 'Active',
        category_id: null,
        aiBrief: 'N/A',
        job_type: 'Full-time',
        excluded_locations: [],
      });
      expectStatus(create, [200, 201]);
      const jobId = create.body?.id;

      // аплай как соискатель
      const seekerToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const apply = await bearer(seekerToken).post('/api/job-applications').send({
        job_post_id: jobId,
        cover_letter: 'I am interested',
        full_name: 'QA Tester',
        referred_by: 'E2E',
      });

      // правильный порядок: массив допустимых кодов содержит фактический статус
      expect([200, 400]).toContain(apply.status);
      if (apply.status === 400) {
        const msg = (apply.body?.message || '').toString();
        const allowed = [
          'Daily application limit reached',
          'Job full',
          'You have already applied to this job post',
          'Applicants from your location are not allowed',
          'Application period has ended',
          'Cannot apply to a job post that is not active',
          'No application limits defined',
        ];
        expect(allowed.some(a => msg.includes(a))).toBe(true);
      }

      const myApps = await bearer(seekerToken).get('/api/job-applications/my-applications');
      expect(myApps.status).toBe(200);
      expect(Array.isArray(myApps.body)).toBe(true);
    });
  });

  // 6) Жалобы (complaints): jobseeker жалуется на job_post
  describe('Complaints', () => {
    it('Jobseeker can create complaint on a job post -> 200/201 (или 400 при доп. валидации)', async () => {
      // подготовим свежую вакансию
      const empToken = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const created = await bearer(empToken).post('/api/job-posts').send({
        title: 'E2E COMPLAINT ' + Date.now(),
        description: 'to complain',
        location: 'Remote',
        salary_type: 'negotiable',
        status: 'Active',
        category_id: null,
        aiBrief: 'N/A',
        job_type: 'Full-time',
        excluded_locations: [],
      });
      expectStatus(created, [200, 201]);
      const jobId = created.body.id;

      // как соискатель отправляем жалобу на job_post
      const jsToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const complaint = await bearer(jsToken).post('/api/complaints').send({
        job_post_id: jobId,
        reason: 'Spam/scam job post (E2E)',
      });
      expect([200, 201, 400]).toContain(complaint.status);
    });
  });

  // 7) Тех. фидбек от пользователя (jobseeker/employer)
  describe('Tech Feedback', () => {
    it('Jobseeker submits feedback -> 200/201', async () => {
      const jsToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const fb = await bearer(jsToken).post('/api/feedback').send({
        category: 'Bug',
        summary: 'E2E: submit feedback path broken?',
        steps_to_reproduce: 'Open page, click button',
        expected_result: 'See content',
        actual_result: 'Error appears',
      });
      expect([200, 201]).toContain(fb.status);
      expect(fb.body).toHaveProperty('id');
    });
  });

  // 8) Контактная форма (Optional JWT + троттлинг, 202 Accepted)
  describe('Contact form', () => {
    it('Logged-in user: POST /api/contact -> 202 "Message accepted" (или 429 при rate limit)', async () => {
      const jsToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await bearer(jsToken).post('/api/contact').send({
        name: 'QA User',
        email: 'qa@example.com',
        message: 'Hello team, everything is great!',
      });
      expect([202, 429]).toContain(res.status);
    });

    it('Rejects links in message -> 400/422', async () => {
      const jsToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await bearer(jsToken).post('/api/contact').send({
        name: 'Spammer',
        email: 'spam@example.com',
        message: 'check this http://spam.example.com amazing offer',
      });
      expect([400, 422]).toContain(res.status);
    });
  });

  // 9) Public Stats (статистика без токена)
  describe('Public Stats', () => {
    it('GET /api/stats -> 200 + keys present', async () => {
      const res = await http.get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalResumes');
      expect(res.body).toHaveProperty('totalJobPosts');
      expect(res.body).toHaveProperty('totalEmployers');
    });

    it('GET /api/stats/job-posts-by-main-categories -> 200 array', async () => {
      const res = await http.get('/api/stats/job-posts-by-main-categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/stats/job-posts-by-subcategories -> 200 array', async () => {
      const res = await http.get('/api/stats/job-posts-by-subcategories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 10) Talents search (валидные и невалидные параметры)
  describe('Talents search', () => {
    it('GET /api/talents basic -> 200 array', async () => {
      const res = await http.get('/api/talents?limit=5&page=1&sort_by=profile_views&sort_order=DESC');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body?.data || res.body)).toBeTruthy(); // допустим разный формат
    });

    it('GET /api/talents invalid rating -> 400', async () => {
      const res = await http.get('/api/talents?rating=99');
      expect([400, 422]).toContain(res.status);
    });

    it('GET /api/talents invalid paging -> 400', async () => {
      const res = await http.get('/api/talents?page=0&limit=-1');
      expect([400, 422]).toContain(res.status);
    });
  });

  // 11) Platform Feedback (истории успеха)
  describe('Platform Feedback', () => {
    it('Jobseeker can submit platform feedback -> 200/201', async () => {
      const jsToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await bearer(jsToken).post('/api/platform-feedback').send({
        headline: 'E2E success',
        story: 'Found a great job through JobForge!',
        rating: 5,
        allow_publish: true,
        company: 'ACME',
        country: 'SE',
      });
      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('id');
    });

    it('Public list: GET /api/platform-feedback -> 200', async () => {
      const res = await http.get('/api/platform-feedback?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
