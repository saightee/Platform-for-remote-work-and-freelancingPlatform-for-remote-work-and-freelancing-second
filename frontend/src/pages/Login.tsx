import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
const [cooldown, setCooldown] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRefreshing) return;
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Email and password cannot be empty.');
      return;
    }
    try {
      setIsRefreshing(true);
      setErrorMessage(null);
      console.log('Attempting login with:', { email, rememberMe });
      const response = await login({ email, password, rememberMe });
      console.log('Login response:', response);
      localStorage.setItem('token', response.accessToken);
      console.log('Token stored:', response.accessToken);
      await refreshProfile();
      setIsAuthenticated(true);
} catch (error: any) {
  const msg = error.response?.data?.message || '';
  if (error.response?.status === 401 && /confirm your email/i.test(msg)) {
    // раньше было: navigate('/check-email', { state: { email } });
    setUnverifiedEmail(email);                       // <-- показываем баннер
    localStorage.setItem('pendingEmail', email);     // <-- пригодится для callback'а
    setErrorMessage('Please confirm your email before logging in.');
    return;
  }
  setErrorMessage(msg || 'Login failed. Please try again.');
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
  console.log(
    'Login useEffect, isAuthenticated:',
    isAuthenticated,
    'profile:', profile,
    'currentRole:', currentRole
  );

  if (!isAuthenticated) return;

  // подстрахуемся, если currentRole ещё не проставлен
  const role = currentRole || profile?.role;
  if (!role) return;

  const go = (path: string) => navigate(path, { replace: true });

  if (role === 'admin') {
    go('/admin');
  } else if (role === 'moderator') {
    go('/moderator');
  } else if (role === 'employer') {
    go('/employer-dashboard');       // <-- сюда отправляем работодателя
  } else if (role === 'jobseeker') {
    go('/jobseeker-dashboard');      // опционально: дашборд соискателя
  } else {
    go('/');
  }
}, [isAuthenticated, currentRole, profile?.role, navigate]);


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
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Enter your email"
  autoComplete="username"
  inputMode="email"
  autoCapitalize="none"
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
  <button type="submit" className="login-button">Sign In</button>
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