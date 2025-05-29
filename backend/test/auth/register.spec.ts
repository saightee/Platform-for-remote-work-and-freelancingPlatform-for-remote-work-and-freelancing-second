import * as request from 'supertest';

describe('Auth (e2e)', () => {
  const baseUrl = process.env.BASE_URL || 'https://jobforge.net';

  it('should register a jobseeker', async () => {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const email = `jobseeker${timestamp}@example.com`;
    const response = await request(baseUrl)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .set('X-Forwarded-For', '99.79.0.2') // Как в локальных тестах
      .set('X-Fingerprint', `test-fingerprint-${timestamp}`) // Для антифрода
      .send({
        email,
        password: 'jobseeker123',
        username: `jobseeker${timestamp}`,
        role: 'jobseeker',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('accessToken');

    // Проверяем, есть ли данные пользователя
    if (response.body.email) {
      expect(response.body.email).toBe(email);
    }
    if (response.body.user) {
      expect(response.body.user.email).toBe(email);
    }
  }, 10000);
});