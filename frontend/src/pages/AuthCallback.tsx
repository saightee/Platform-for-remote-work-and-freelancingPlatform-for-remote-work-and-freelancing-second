// AuthCallback.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useRole } from '../context/RoleContext';
import { getJobPost } from '../services/api';

const AuthCallback: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { refreshProfile, profile } = useRole(); // берём profile, чтобы дождаться обновления контекста

  const params = new URLSearchParams(search);
  const token = params.get('token');
  const verified = params.get('verified');
  const error = params.get('error');
  const email = params.get('email') || localStorage.getItem('pendingEmail') || '';

  // 1) если успех — сохраняем токен и инициируем обновление профиля
  useEffect(() => {
    if (token && verified === 'true') {
      // подчистим старую сессию из cookie, как и было
      document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      localStorage.setItem('token', token);
      // тянем профиль (заполнит useRole.profile)
      refreshProfile().catch(() => {
        localStorage.removeItem('token');
        document.cookie = 'jobforge.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        navigate('/login', { replace: true });
      });
      return;
    }

    // любой фэйл — уводим на check-email
    navigate('/check-email', { replace: true, state: { email } });
  }, [token, verified, email, navigate, refreshProfile]);

  // 2) как только профиль загрузился — решаем, куда вести
useEffect(() => {
  if (!(token && verified === 'true')) return;
  if (!profile) return; // ждём профиль

  const doRedirect = async () => {
    if (profile.role === 'jobseeker') {
      const refJobId = localStorage.getItem('referralJobId');

      if (refJobId) {
        try {
          // проверяем, что вакансия существует (по желанию — ещё и активна)
          const job = await getJobPost(refJobId);
          // необязательно, но можно перепроверить статус
          // if (job?.status !== 'Active') throw new Error('Job not active');

          localStorage.removeItem('referralJobId'); // чтобы не зацикливаться в будущем
          navigate(`/jobs/${refJobId}`, { replace: true });
          return;
        } catch (e) {
          console.warn('Referral job invalid, fallback to dashboard', e);
          localStorage.removeItem('referralJobId'); // чистим битую ссылку
          navigate('/jobseeker-dashboard', { replace: true });
          return;
        }
      }

      navigate('/jobseeker-dashboard', { replace: true });
      return;
    }

    if (profile.role === 'employer') {
      navigate('/employer-dashboard', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  void doRedirect();
}, [profile, token, verified, navigate]);

  return <Loader />;
};

export default AuthCallback;
