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

// bad file for resume type validation
const BAD_FILE = path.join(__dirname, 'tmp-e2e.txt');
beforeAll(() => { try { fs.writeFileSync(BAD_FILE, 'dummy'); } catch {} });
afterAll(() => { try { fs.unlinkSync(BAD_FILE); } catch {} });

// ---------- tests ----------
describe('Integration Tests (staging)', () => {
  // 1) Public
  describe('Public endpoints', () => {
    it('Categories tree: GET /api/categories -> 200 array', async () => {
      const res = await http.get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('Categories with counts: GET /api/categories?includeCounts=true -> 200', async () => {
      const res = await http.get('/api/categories?includeCounts=true');
      expect(res.status).toBe(200);
      if (Array.isArray(res.body) && res.body[0]) {
        expect(res.body[0]).toHaveProperty('name');
      }
    });
  });

  // 2) Auth + email flows (no inbox)
  describe('Auth + email flows (no inbox)', () => {
    it('Resend verification -> 200/201 generic', async () => {
      const res = await http.post('/api/auth/resend-verification').send({ email: 'someone@example.com' });
      expectStatus(res, [200, 201]);
      expect(typeof res.body?.message === 'string' || res.text).toBeTruthy();
    });

    it('Register validation: missing fingerprint -> 400', async () => {
      const res = await http
        .post('/api/auth/register')
        .send({ email: uniqueEmail('nofp'), password: 'StrongP@ssw0rd', username: 'nofp', role: 'jobseeker' });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body).toLowerCase()).toContain('fingerprint');
    });

    it('Register validation: wrong resume file type -> 400/415', async () => {
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

    it('Register minimal -> 200/201 + hint to email verify', async () => {
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

    it('Login valid accounts -> tokens', async () => {
      const t1 = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const t2 = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const t3 = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      expect(Boolean(t1 && t2 && t3)).toBe(true);
    });

    it('Login wrong password -> 400/401', async () => {
      const res = await http.post('/api/auth/login').send({ email: CREDS.JOBSEEKER_EMAIL, password: 'wrong' });
      expectStatus(res, [400, 401]);
    });

    it('Forgot password (jobseeker) -> 200/201', async () => {
      const res = await http.post('/api/auth/forgot-password').send({ email: CREDS.JOBSEEKER_EMAIL });
      expectStatus(res, [200, 201]);
    });

    it('Forgot password (admin) -> 400/401 (disallowed)', async () => {
      const res = await http.post('/api/auth/forgot-password').send({ email: CREDS.ADMIN_EMAIL });
      expectStatus(res, [400, 401]);
    });

    it('Reset password invalid token -> 400', async () => {
      const res = await http.post('/api/auth/reset-password').send({ token: 'invalid', newPassword: 'NewP@ss1!' });
      expect(res.status).toBe(400);
    });

    it('Verify email invalid token -> 302/400', async () => {
      const res = await http.get('/api/auth/verify-email?token=invalid').redirects(0);
      expectStatus(res, [302, 400]);
      if (res.status === 302) expect(res.headers.location).toContain('/auth/callback');
    });

    it('Logout -> 200/201', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await http.post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
      expectStatus(res, [200, 201]);
      const msg = (res.body?.message || '').toLowerCase();
      expect(msg.includes('logout')).toBe(true);
    });
  });

  // 3) Profile
  describe('Profile', () => {
    it('Jobseeker myprofile -> 200 + role=jobseeker', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const res = await bearer(token).get('/api/profile/myprofile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role', 'jobseeker');
    });

    it('Employer myprofile -> 200 + role=employer', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const res = await bearer(token).get('/api/profile/myprofile');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('role', 'employer');
    });

    it('Public profile by id -> 200', async () => {
      const empToken = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const me = await bearer(empToken).get('/api/profile/myprofile');
      const res = await http.get(`/api/profile/${me.body.id}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', me.body.id);
    });

    it('Jobseeker update -> 200 echo', async () => {
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

  // 4) Job Posts (employer flow)
  describe('Job Posts (employer flow)', () => {
    it('Create -> Get -> Update -> My posts -> Get by slug_or_id', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);

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

      const get = await bearer(token).get(`/api/job-posts/${jobId}`);
      expect(get.status).toBe(200);
      if (get.body?.salary_type === 'negotiable') {
        expect(get.body?.salary == null).toBe(true);
      }

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

      const my = await bearer(token).get('/api/job-posts/my-posts');
      expect(my.status).toBe(200);
      expect(Array.isArray(my.body)).toBe(true);

      if (slugId) {
        const bySlug = await http.get(`/api/job-posts/by-slug-or-id/${encodeURIComponent(slugId)}`);
        expect([200, 404]).toContain(bySlug.status);
        if (bySlug.status === 200) expect(bySlug.body?.id).toBe(jobId);
      }
    }, 30000);

    it('Close job post (idempotent-ish)', async () => {
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

    it('Generate description (AI) -> 200/429/500', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const res = await bearer(token).post('/api/job-posts/generate-description').send({
        aiBrief: 'Need Python dev with 3y exp; Django, SQL',
        title: 'Python Developer',
        salary_type: 'negotiable',
      });
      expect([200, 429, 500]).toContain(res.status);
    }, 30000);
  });

  // 5) Job Applications
  describe('Job Applications (apply & my list)', () => {
    it('Apply OR valid 400 (limits/duplicate/location/period/full)', async () => {
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

      const seekerToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const apply = await bearer(seekerToken).post('/api/job-applications').send({
        job_post_id: jobId,
        cover_letter: 'I am interested',
        full_name: 'QA Tester',
        referred_by: 'E2E',
      });

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

  // 6) Complaints
  describe('Complaints', () => {
    it('Create complaint by jobseeker -> 200/201/400', async () => {
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

      const jsToken = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      const complaint = await bearer(jsToken).post('/api/complaints').send({
        job_post_id: jobId,
        reason: 'Spam/scam job post (E2E)',
      });
      expect([200, 201, 400]).toContain(complaint.status);
    });
  });

  // 7) Tech Feedback
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

  // 8) Contact form
  describe('Contact form', () => {
    it('Logged-in POST /api/contact -> 202/429', async () => {
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

  // 9) Public Stats
  describe('Public Stats', () => {
    it('GET /api/stats -> 200 + keys', async () => {
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

  // 10) Talents search
  describe('Talents search', () => {
    it('GET /api/talents basic -> 200', async () => {
      const res = await http.get('/api/talents?limit=5&page=1&sort_by=profile_views&sort_order=DESC');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body?.data || res.body)).toBeTruthy();
    });

    it('GET /api/talents invalid rating -> 400/422', async () => {
      const res = await http.get('/api/talents?rating=99');
      expect([400, 422]).toContain(res.status);
    });

    it('GET /api/talents invalid paging -> 400/422', async () => {
      const res = await http.get('/api/talents?page=0&limit=-1');
      expect([400, 422]).toContain(res.status);
    });
  });

  // 11) Platform Feedback (public + submit)
  describe('Platform Feedback', () => {
    it('Public list -> 200', async () => {
      const res = await http.get('/api/platform-feedback?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Jobseeker submit -> 200/201', async () => {
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
  });

  // 12) SEO
  describe('SEO endpoints', () => {
    it('GET /sitemap.xml -> 200/204', async () => {
      const res = await http.get('/sitemap.xml');
      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect(res.headers['content-type'] || '').toContain('xml');
        expect(typeof res.text === 'string').toBe(true);
      }
    });

    it('GET /robots.txt -> 200/204', async () => {
      const res = await http.get('/robots.txt');
      expect([200, 204]).toContain(res.status);
      if (res.status === 200) {
        expect((res.headers['content-type'] || '')).toContain('text/plain');
        expect(typeof res.text === 'string').toBe(true);
      }
    });
  });

  // 13) Categories search
  describe('Categories search', () => {
    it('GET /api/categories/search?term=dev -> 200 array', async () => {
      const res = await http.get('/api/categories/search?term=dev');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/categories/search w/o term -> 400/422', async () => {
      const res = await http.get('/api/categories/search');
      expect([400, 422]).toContain(res.status);
    });
  });

  // 14) Referrals (public)
  describe('Referrals', () => {
    it('POST /ref/track w/o ref -> 400/422', async () => {
      const res = await http.post('/ref/track').send({});
      expect([400, 422]).toContain(res.status);
    });

    it('POST /ref/track with dummy ref -> 200/404/500', async () => {
      const res = await http.post('/ref/track').send({ ref: 'dummy-ref-' + Date.now() });
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  // 15) ADMIN (safe suite). Работает только своим ресурсом — создаёт вакансию и управляет ею.
  describe('Admin (safe suite)', () => {
    it('Admin can list users, filter, export CSV (headers), and get analytics', async () => {
      const admin = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      const u1 = await bearer(admin).get('/api/admin/users?limit=3&page=1');
      expect(u1.status).toBe(200);
      expect(u1.body).toHaveProperty('data');

      const uBad = await bearer(admin).get('/api/admin/users?page=0&limit=-1');
      expect([400, 422]).toContain(uBad.status);

      const csv = await bearer(admin).get('/api/admin/users/export-csv?limit=5');
      expect([200]).toContain(csv.status);
      const ct = (csv.headers['content-type'] || '').toLowerCase();
      expect(ct.includes('text/csv')).toBe(true);

      const an = await bearer(admin).get('/api/admin/analytics');
      expect(an.status).toBe(200);
      expect(an.body).toHaveProperty('totalUsers');
    });

    it('Admin can read job posts list with filters (no side effects)', async () => {
      const admin = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      const list = await bearer(admin).get('/api/admin/job-posts?status=Active&limit=5&page=1');
      expect(list.status).toBe(200);
      expect(list.body).toHaveProperty('data');
    });

    it('Admin full flow on dedicated post: approve/flag/update/email-stats/referrals/delete', async () => {
      // создаём пост как работодатель (ресурс только для этого теста)
      const emp = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const create = await bearer(emp).post('/api/job-posts').send({
        title: 'E2E ADMIN ' + Date.now(),
        description: 'admin flow',
        location: 'Remote',
        salary_type: 'per month',
        salary: 777,
        status: 'Active',
        category_id: null,
        aiBrief: 'N/A',
        job_type: 'Full-time',
        excluded_locations: [],
      });
      expect([200, 201]).toContain(create.status);
      const postId = create.body?.id;
      expect(postId).toBeDefined();

      const admin = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);

      // approve → flag (переключение pending_review)
      const approve = await bearer(admin).post(`/api/admin/job-posts/${postId}/approve`);
      expect([200, 201]).toContain(approve.status);

      const flag = await bearer(admin).post(`/api/admin/job-posts/${postId}/flag`);
      expect([200, 201]).toContain(flag.status);

      // update от админа
      const upd = await bearer(admin).put(`/api/admin/job-posts/${postId}`).send({
        title: 'E2E ADMIN UPDATED',
        salary_type: 'per month',
        salary: 888,
        status: 'Active',
      });
      expect([200, 201]).toContain(upd.status);
      expect(upd.body?.salary).toBe(888);

      // email stats по посту
      const es = await bearer(admin).get(`/api/admin/job-posts/${postId}/email-stats`);
      expect([200, 204]).toContain(es.status);

      // referral links CRUD (безопасно для нашего поста)
      const rlCreate = await bearer(admin).post(`/api/admin/job-posts/${postId}/referral-links`).send({ description: 'e2e link' });
      expect([200, 201]).toContain(rlCreate.status);
      const linkId = rlCreate.body?.id;

      const rlListByJob = await bearer(admin).get(`/api/admin/job-posts/${postId}/referral-links`);
      expect(rlListByJob.status).toBe(200);

      if (linkId) {
        const rlUpd = await bearer(admin).put(`/api/admin/referral-links/${linkId}`).send({ description: 'e2e link updated' });
        expect([200, 201]).toContain(rlUpd.status);

        const rlDel = await bearer(admin).delete(`/api/admin/referral-links/${linkId}`);
        expect([200, 204]).toContain(rlDel.status);
      }

      // общий список ссылок по фильтрам (необязателен, но безвреден)
      const rlAll = await bearer(admin).get(`/api/admin/referral-links?jobId=${encodeURIComponent(postId)}`);
      expect([200]).toContain(rlAll.status);

      // delete пост (clean-up)
      const del = await bearer(admin).delete(`/api/admin/job-posts/${postId}`);
      expect([200, 204]).toContain(del.status);
    }, 30000);

    it('Admin: reviews list, complaints list, leaderboards, email stats (all read-only)', async () => {
      const admin = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);

      const rv = await bearer(admin).get('/api/admin/reviews');
      expect([200]).toContain(rv.status);

      const cp = await bearer(admin).get('/api/admin/complaints');
      expect([200]).toContain(cp.status);

      const lb = await bearer(admin).get('/api/admin/leaderboards/top-jobseekers-by-views?limit=3');
      expect([200]).toContain(lb.status);

      const allEmails = await bearer(admin).get('/api/admin/email-stats?limit=5');
      expect([200]).toContain(allEmails.status);
    });

    it('Admin analytics endpoints (registrations & geo distribution)', async () => {
      const admin = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);

      // даты берем «безопасно»: от месяца назад до сегодня
      const end = new Date();
      const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000);
      const iso = (d: Date) => d.toISOString().slice(0, 10);

      const reg = await bearer(admin).get(`/api/admin/analytics/registrations?startDate=${iso(start)}&endDate=${iso(end)}&interval=day&role=all`);
      expect([200]).toContain(reg.status);

      const geo = await bearer(admin).get(`/api/admin/analytics/geographic-distribution?role=all&startDate=${iso(start)}&endDate=${iso(end)}`);
      expect([200]).toContain(geo.status);

      const growth = await bearer(admin).get(`/api/admin/analytics/growth-trends?period=7d`);
      expect([200]).toContain(growth.status);

      const recent = await bearer(admin).get(`/api/admin/analytics/recent-registrations?limit=3`);
      expect([200]).toContain(recent.status);

      const online = await bearer(admin).get(`/api/admin/analytics/online-users`);
      expect([200]).toContain(online.status);

      const postsWithApps = await bearer(admin).get(`/api/admin/job-posts/applications?limit=3`);
      expect([200]).toContain(postsWithApps.status);
    });

    it('Admin categories (read & search) + platform feedback moderation endpoints (smoke)', async () => {
      const admin = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);

      const cats = await bearer(admin).get('/api/admin/categories');
      expect([200]).toContain(cats.status);

      const search = await bearer(admin).get('/api/admin/categories/search?term=dev');
      expect([200]).toContain(search.status);

      // платформенный фидбек — только чтение (модерацию не трогаем без отдельной сущности)
      const pf = await bearer(admin).get('/api/admin/platform-feedback?page=1&limit=5');
      expect([200]).toContain(pf.status);
    });
  });
});
