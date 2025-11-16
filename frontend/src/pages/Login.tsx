import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login, resendVerification } from '../services/api';
import { useRole } from '../context/RoleContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';




const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { profile, currentRole, refreshProfile } = useRole();
  const [isRefreshing, setIsRefreshing] = useState(false);
const [submitCooldown, setSubmitCooldown] = useState(0);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
const [cooldown, setCooldown] = useState(0);
const location = useLocation();
const intended = (location.state as any)?.from as string | undefined;

const isAllowedForRole = (path: string, role: string) => {
  if (!path) return false;
  if (role === 'employer') return path.startsWith('/employer-dashboard');
  if (role === 'jobseeker') return path.startsWith('/jobseeker-dashboard');
  if (role === 'admin') return path.startsWith('/admin');
  if (role === 'moderator') return path.startsWith('/moderator');
  return false;
};

const defaultForRole = (role: string) => {
  switch (role) {
    case 'employer': return '/employer-dashboard';
    case 'jobseeker': return '/jobseeker-dashboard';
    case 'admin': return '/admin';
    case 'moderator': return '/moderator';
    default: return '/';
  }
};
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (isRefreshing || submitCooldown > 0) return;

    if (!email.trim() || !password.trim()) {
    setErrorMessage('Email and password cannot be empty.');
    return;
  }
  // короткий дебаунс 2 сек
  setSubmitCooldown(2);

  try {
    setIsRefreshing(true);
    setErrorMessage(null);
    const response = await login({ email, password, rememberMe });
    localStorage.setItem('token', response.accessToken);
    await refreshProfile();
    setIsAuthenticated(true);
  } catch (error: any) {
    const status = error?.response?.status;
    const raw = String(error?.response?.data?.message || '');
    const msg = raw.toLowerCase();

    if (status === 401) {
      if (msg.includes('confirm your email') || msg.includes('verify')) {
        const em = email.trim().toLowerCase();
        setUnverifiedEmail(em);
        localStorage.setItem('pendingEmail', em);
        setErrorMessage('Please confirm your email before logging in.');
        return;
      }
      setErrorMessage('Invalid email or password.');
      return;
    }
    setErrorMessage(raw || 'Login failed. Please try again.');
  } finally {
    setIsRefreshing(false);
  }
};

  // useEffect(() => {
  //   console.log('Login useEffect, isAuthenticated:', isAuthenticated, 'profile:', profile, 'currentRole:', currentRole);
  //   if (isAuthenticated && currentRole) {
  //     if (currentRole === 'admin') {
  //       navigate('/admin');
  //     } else if (currentRole === 'moderator') {
  //       navigate('/moderator');
  //     } else {
  //       navigate('/');
  //     }
  //   }
  // }, [isAuthenticated, currentRole, navigate]);

 useEffect(() => {
  if (!isAuthenticated) return;

  const role = currentRole || profile?.role;
  if (!role) return;

  const go = (path: string) => navigate(path, { replace: true });

  // источники intended-URL
  const fromState  = intended;
  const params     = new URLSearchParams(window.location.search);
  const fromQuery  = params.get('redirect') || params.get('next') || undefined;
  const fromStore  = sessionStorage.getItem('postLoginRedirect') || undefined;

  const candidate = [fromState, fromQuery, fromStore].find(Boolean) as string | undefined;

  // очистим, чтобы не залипало на следующий логин
  if (fromStore) sessionStorage.removeItem('postLoginRedirect');

  const isRelativeSafe = (p?: string) => !!p && p.startsWith('/');
  const allowedForRole = (p?: string) => !!p && isAllowedForRole(p, role);

  if (isRelativeSafe(candidate) && allowedForRole(candidate)) {
    go(candidate!);
    return;
  }

  go(defaultForRole(role));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isAuthenticated, currentRole, profile?.role]);




useEffect(() => {
  if (!submitCooldown) return;
  const id = setInterval(() => setSubmitCooldown(s => (s > 0 ? s - 1 : 0)), 1000);
  return () => clearInterval(id);
}, [submitCooldown]);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
  if (!cooldown) return;
  const id = setInterval(() => setCooldown(s => s > 0 ? s - 1 : 0), 1000);
  return () => clearInterval(id);
}, [cooldown]);

const onResendFromLogin = async () => {
  if (!unverifiedEmail) return;
  try {
    await resendVerification(unverifiedEmail);
    // нейтральный тост
    alert('If the account exists and is not verified, we sent a new link.');
    setCooldown(300);
  } catch (e: any) {
    if (e?.response?.status === 429) {
      const retry = parseInt(e.response.headers?.['retry-after'] || '', 10);
      setCooldown(Number.isFinite(retry) ? retry : 300);
      alert('Please wait before requesting another verification email.');
    } else {
      alert(e?.response?.data?.message || 'Failed to resend verification email.');
    }
  }
};

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Sign In</h2>
        {errorMessage && <p style={{ color: 'red', textAlign: 'center' }}>{errorMessage}</p>}
<form onSubmit={handleSubmit} className="login-form">
  <div className="login-form-group">
    <label>Email</label>
<input
  type="email"
  id="login-email"
  name="email"
  value={email}
  onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
  placeholder="Enter your email"
  autoComplete="email"
  inputMode="email"
  autoCapitalize="off"
  spellCheck={false}
  required
/>

  </div>
  <div className="login-form-group login-password-container">
    <label>Password</label>
    <div className="login-password-input-wrapper">
 <input
  type={showPassword ? 'text' : 'password'}
  id="login-password"
  name="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Enter your password"
  autoComplete="current-password"
  required
/>
      <span className="login-password-toggle-icon" onClick={togglePasswordVisibility}>
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </span>
    </div>
  </div>
  <div className="login-form-group login-checkbox-group">
    <input
      type="checkbox"
      id="login-remember-me"
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
    />
    <label htmlFor="login-remember-me">Remember Me</label>
  </div>
  <button type="submit" className="login-button" disabled={isRefreshing || submitCooldown > 0}>
  {submitCooldown > 0 ? 'Please wait…' : 'Sign In'}
</button>
<div className="login-form-links">
  <p>
    Forgotten your password? <Link to="/forgot-password">Reset</Link>
  </p>
  <p>
    Don’t have an account? <Link to="/role-selection">Register</Link>
  </p>
  <p>
    Didn’t get the verification email?{' '}
    <Link to="/check-email" state={{ email }}>
      Resend verification
    </Link>
  </p>
  <p>
    <Link to="/">Go to Home</Link>
  </p>
</div>
</form>

{unverifiedEmail && (
  <div className="banner warning" style={{ marginTop: 12 }}>
    Please confirm your email before logging in.
    <button
      onClick={onResendFromLogin}
      disabled={cooldown > 0}
      style={{ marginLeft: 8 }}
    >
      {cooldown ? `Resend in ${Math.floor(cooldown/60)}:${(cooldown%60).toString().padStart(2,'0')}` : 'Resend email'}
    </button>
  </div>
)}
      </div>
    </div>
  );
};

export default Login;