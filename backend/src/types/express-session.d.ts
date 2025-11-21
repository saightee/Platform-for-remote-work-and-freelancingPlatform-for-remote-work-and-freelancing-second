import { Session } from 'express-session';

declare module 'express-session' {
  interface Session {
    user?: {
      id: string;
      email: string;
      role: 'jobseeker' | 'employer' | 'admin' | 'moderator' | 'affiliate';
    };
  }
}
