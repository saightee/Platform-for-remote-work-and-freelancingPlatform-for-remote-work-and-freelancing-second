// AuthCallback.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import { useRole } from '../context/RoleContext';
import { getJobPost } from '../services/api';
import { brand } from '../brand';

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
      document.cookie = `${brand.id}.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

      localStorage.setItem('token', token);
      // тянем профиль (заполнит useRole.profile)
      refreshProfile().catch(() => {
        localStorage.removeItem('token');
        document.cookie = `${brand.id}.sid=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;

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
  const refJobId = localStorage.getItem('referralJobId');            // кейс: человек заходил на /jobs/:id?ref=...
  const afterVerifyReturn = localStorage.getItem('afterVerifyReturn'); // кейс: человек пришёл с LP (/job/:slug) и мы сохранили return
  const hasRef = Boolean(localStorage.getItem('referralCode') || document.cookie.includes('jf_ref='));
  const safe = (p?: string | null) => (p && p.startsWith('/') && !p.startsWith('//')) ? p : null;

  // 1) приоритет — точный jobId из job-страницы с ?ref
  if (refJobId) {
    try {
      await getJobPost(refJobId); // опциональная проверка доступности вакансии
      localStorage.removeItem('referralJobId');
      localStorage.removeItem('afterVerifyReturn');
      navigate(`/jobs/${refJobId}`, { replace: true });
      return;
    } catch (e) {
      console.warn('Referral job invalid, fallback', e);
      localStorage.removeItem('referralJobId');
      // пойдём дальше — вдруг есть валидный return
    }
  }

  // 2) если человек пришёл по рефке с LP — уважаем сохранённый безопасный return
  if (hasRef) {
    const dest = safe(afterVerifyReturn);
    if (dest) {
      localStorage.removeItem('afterVerifyReturn');
      navigate(dest, { replace: true }); // например, /vacancy/:slug
      return;
    }
  }

  // 3) дефолт
  navigate('/jobseeker-dashboard', { replace: true });
  return;
}


    if (profile.role === 'employer') {
      navigate('/employer-dashboard', { replace: true });
      return;
    }

      if (profile.role === 'affiliate') {
      navigate('/affiliate/dashboard', { replace: true });
      return;
    }

    navigate('/', { replace: true });
  };

  void doRedirect();
}, [profile, token, verified, navigate]);

  return <Loader />;
};

export default AuthCallback;
