// src/routes/RequireAuth.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import Loader from '../components/Loader';

// добавили 'affiliate' в список допустимых ролей
type Props = {
  allowed?: Array<'employer' | 'jobseeker' | 'admin' | 'moderator' | 'affiliate'>;
  fallback?: React.ReactNode;
};

const hasToken = () => {
  try { return !!localStorage.getItem('token'); } catch { return false; }
};

export default function RequireAuth({ allowed, fallback }: Props) {
  const { isLoading, currentRole } = useRole();
  const location = useLocation();

  if (isLoading && hasToken()) {
    return (fallback ?? <Loader />);
  }

  if (!currentRole) {
    const nextUrl = location.pathname + (location.search || '');
    // дублируем в sessionStorage — на случай, если state потеряется
    sessionStorage.setItem('postLoginRedirect', nextUrl);

    return (
      <Navigate
        to="/login"
        replace
        state={{ from: nextUrl }}
      />
    );
  }

  if (allowed && !allowed.includes(currentRole)) {
    const safeHome =
      currentRole === 'employer'  ? '/employer-dashboard'  :
      currentRole === 'jobseeker' ? '/jobseeker-dashboard' :
      currentRole === 'admin'     ? '/admin'               :
      currentRole === 'moderator' ? '/moderator'           :
      '/';
    return <Navigate to={safeHome} replace />;
  }

  return <Outlet />;
}
