import request from 'supertest';

const BASE_URL = 'https://staging.jobforge.net';

const CREDS = {
  ADMIN_EMAIL: 'roman.bukshak@jobforge.net',
  ADMIN_PASSWORD: 'X9$kM2#vP7nL&5jQw',
  EMPLOYER_EMAIL: 'petrwoodler@gmail.com',
  EMPLOYER_PASSWORD: 'Qwerty1234!',
  JOBSEEKER_EMAIL: 'romanbukshak@mail.ru',
  JOBSEEKER_PASSWORD: 'Qwerty123!',
} as const;

// --- Утилиты ---
const http = request(BASE_URL);

async function login(email: string, password: string) {
  const res = await http.post('/api/auth/login').send({ email, password, rememberMe: true });
  expect(res.status).toBe(201);
  expect(res.body).toHaveProperty('accessToken');
  return res.body.accessToken as string;
}

function bearer(token: string) {
  return {
    get: (url: string) => http.get(url).set('Authorization', `Bearer ${token}`),
    post: (url: string) => http.post(url).set('Authorization', `Bearer ${token}`),
    put: (url: string) => http.put(url).set('Authorization', `Bearer ${token}`),
    delete: (url: string) => http.delete(url).set('Authorization', `Bearer ${token}`),
  };
}

// --- Тесты ---
describe('Integration Tests (staging)', () => {
  // 1) Публичные ручки
  describe('Public', () => {
    it('GET /api/categories -> 200, array', async () => {
      const res = await http.get('/api/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/categories?includeCounts=true -> 200, optional jobs_count', async () => {
      const res = await http.get('/api/categories?includeCounts=true');
      expect(res.status).toBe(200);
      if (Array.isArray(res.body) && res.body[0]) {
        expect(res.body[0]).toHaveProperty('name');
      }
    });

    it('POST /api/auth/resend-verification -> 200/201 generic message', async () => {
      const res = await http.post('/api/auth/resend-verification').send({ email: 'someone@example.com' });
      expect([200, 201]).toContain(res.status);
      // текст может отличаться, но обычно generic:
      // "If the account exists" / "Verification email sent"
      expect(typeof res.body?.message === 'string' || res.text).toBeTruthy();
    });
  });

  // 2) Логины
  describe('Auth logins (ready accounts)', () => {
    it('Jobseeker can login -> 201 + token', async () => {
      const token = await login(CREDS.JOBSEEKER_EMAIL, CREDS.JOBSEEKER_PASSWORD);
      expect(token).toBeTruthy();
    });

    it('Employer can login -> 201 + token', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      expect(token).toBeTruthy();
    });

    it('Admin can login -> 201 + token', async () => {
      const token = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      expect(token).toBeTruthy();
    });

    it('Wrong password -> 401', async () => {
      const res = await http.post('/api/auth/login').send({ email: CREDS.JOBSEEKER_EMAIL, password: 'wrong' });
      expect([400, 401]).toContain(res.status); // допускаем разные реализации ошибки
    });
  });

  // 3) Профиль (по доке /api/profile/myprofile, /api/profile) — только для jobseeker/employer
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

    it('Jobseeker: PUT /api/profile -> 200, updates echoed back', async () => {
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
      // поля могут быть опциональны — проверим то, что точно должно вернуться
      if (res.body?.experience) expect(res.body.experience).toBe('3 years');
      if (res.body?.currency) expect(res.body.currency).toBe('EUR');
    });
  });

  // 4) Работодатель: безопасные проверки без создания/удаления
  describe('Employer area (safe reads)', () => {
    it('GET /api/job-posts/my-posts -> 200, array', async () => {
      const token = await login(CREDS.EMPLOYER_EMAIL, CREDS.EMPLOYER_PASSWORD);
      const res = await bearer(token).get('/api/job-posts/my-posts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // 5) Админ: безопасные чтения
  describe('Admin area (safe reads)', () => {
    it('GET /api/admin/categories -> 200, array', async () => {
      const token = await login(CREDS.ADMIN_EMAIL, CREDS.ADMIN_PASSWORD);
      const res = await bearer(token).get('/api/admin/categories');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
