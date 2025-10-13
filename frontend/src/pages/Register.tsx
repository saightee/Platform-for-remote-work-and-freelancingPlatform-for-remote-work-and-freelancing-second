import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { register, getCategories, searchCategories } from '../services/api';
import { Category } from '@types';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import PasswordStrength, { isStrongPassword } from '../components/PasswordStrength';
import '../styles/register-v2.css';
import { toast } from '../utils/toast';
import CountrySelect from '../components/inputs/CountrySelect';
import LanguagesInput from '../components/inputs/LanguagesInput';
import '../styles/country-langs.css';

const urlOk = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());
const getCookie = (name: string): string | undefined => {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : undefined;
};


const Register: React.FC = () => {
  const { role } = useParams<{ role: 'employer' | 'jobseeker' }>();
  const navigate = useNavigate();

  // common
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [seePass, setSeePass]   = useState(false);
  const [seeConf, setSeeConf]   = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);

  const emailsMismatch =
    !!confirmEmail &&
    confirmEmail.trim().toLowerCase() !== email.trim().toLowerCase();
// jobseeker specifics …
const [country, setCountry]     = useState('');
const [languages, setLanguages] = useState<string[]>([]);

  // jobseeker specifics
  const [experience, setExperience] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [linkedin, setLinkedin]     = useState('');
  const [instagram, setInstagram]   = useState('');
  const [facebook, setFacebook]     = useState('');
  const [whatsapp, setWhatsapp]     = useState('');   
  const [telegram, setTelegram]     = useState('');   
  const [about, setAbout]           = useState('');
  // skills (jobseeker)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Category[]>([]);
  const [skillQuery, setSkillQuery] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<Category[]>([]);
  const [openDrop, setOpenDrop] = useState(false);

  useEffect(() => {
    if (!role || !['employer', 'jobseeker'].includes(role)) {
      navigate('/role-selection');
      return;
    }
    if (role === 'jobseeker') {
      (async () => {
        try {
          const cats = await getCategories();
          setCategories((cats || []).sort((a, b) => a.name.localeCompare(b.name)));
        } catch (e) {
          console.error('getCategories error', e);
        }
      })();
    }
  }, [role, navigate]);

  useEffect(() => {
    if (role !== 'jobseeker') return;
    if (!skillQuery.trim()) {
      setFilteredSkills([]); setOpenDrop(false);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchCategories(skillQuery);
        setFilteredSkills(res || []);
        setOpenDrop(true);
      } catch (e) {
        console.error('searchCategories error', e);
        setFilteredSkills([]); setOpenDrop(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [skillQuery, role]);

  const wordCount = useMemo(() => {
    const words = about.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [about]);

  const addSkill = (s: Category) => {
    if (!selectedSkills.find(x => x.id === s.id)) {
      setSelectedSkills(prev => [...prev, s]);
    }
    setSkillQuery('');
    setOpenDrop(false);
  };
  const removeSkill = (id: string | number) =>
    setSelectedSkills(prev => prev.filter(s => s.id !== id));

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!role) return;

  // нормализуем перед проверками (на случай, если где-то не сработал trim/lowercase)
  const normEmail = email.trim().toLowerCase();
  const normConfirmEmail = confirmEmail.trim().toLowerCase();

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!username.trim()) { setErr('Username is required.'); return; }
  if (!normEmail || !emailRe.test(normEmail)) { setErr('Valid email is required.'); return; }
  if (!normConfirmEmail || !emailRe.test(normConfirmEmail)) { setErr('Please re-enter a valid email.'); return; }
  if (normEmail !== normConfirmEmail) { setErr('Emails do not match.'); return; }

  if (!password) { setErr('Password is required.'); return; }
  if (password !== confirm) { setErr('Passwords do not match.'); return; }
  if (!isStrongPassword(password)) { setErr('Password does not meet security requirements.'); return; }
  if (role === 'jobseeker' && !experience) { setErr('Please select your experience.'); return; }

  const urlErrors: string[] = [];
  const check = (val: string, label: string) => { if (val && !urlOk(val)) urlErrors.push(`${label} URL is invalid (use https://...)`); };
  check(resumeLink, 'Resume');
  check(linkedin, 'LinkedIn');
  check(instagram, 'Instagram');
  check(facebook, 'Facebook');
  if (urlErrors.length) { setErr(urlErrors[0]); return; }

  try {
    setBusy(true); setErr(null);

    // используем нормализованный email дальше в пайлоаде и в localStorage
    let payload: any;

    if (role === 'jobseeker' && resumeFile) {
      const fd = new FormData();
      fd.append('username', username);
      fd.append('email', normEmail);               // заменили на нормализованный
      fd.append('password', password);
      fd.append('role', role);
      fd.append('resume_file', resumeFile);

      if (experience)            fd.append('experience', experience);
      if (selectedSkills.length) selectedSkills.forEach(s => fd.append('skills[]', String(s.id)));
      if (resumeLink.trim())     fd.append('resume', resumeLink.trim());
      if (linkedin.trim())       fd.append('linkedin', linkedin.trim());
      if (instagram.trim())      fd.append('instagram', instagram.trim());
      if (facebook.trim())       fd.append('facebook', facebook.trim());
      if (whatsapp.trim())       fd.append('whatsapp', whatsapp.trim());
      if (telegram.trim())       fd.append('telegram', telegram.trim());
      if (about.trim())          fd.append('about', about.trim());
      if (getCookie('jf_ref'))   fd.append('ref', getCookie('jf_ref')!);
      if (country.trim())         fd.append('country', country.trim().toUpperCase());
      if (languages.length)       languages.forEach(l => fd.append('languages[]', l));


      payload = fd;
    } else {
      payload = { username, email: normEmail, password, role }; // email → normEmail
      if (role === 'jobseeker') {
        if (experience)            payload.experience = experience;
        if (selectedSkills.length) payload.skills     = selectedSkills.map(s => String(s.id));
        if (resumeLink.trim())     payload.resume     = resumeLink.trim();
        if (linkedin.trim())       payload.linkedin   = linkedin.trim();
        if (instagram.trim())      payload.instagram  = instagram.trim();
        if (facebook.trim())       payload.facebook   = facebook.trim();
        if (whatsapp.trim())       payload.whatsapp   = whatsapp.trim();
        if (telegram.trim())       payload.telegram   = telegram.trim();
        if (about.trim())          payload.about      = about.trim();
        if (country.trim())        payload.country    = country.trim().toUpperCase();
        if (languages.length)      payload.languages  = languages;
      }
      const urlRef = new URLSearchParams(window.location.search).get('ref') || undefined;
      const lsRef  = localStorage.getItem('referralCode') || undefined;
      const ckRef  = getCookie('jf_ref') || undefined;
      const refCode = urlRef || lsRef || ckRef || undefined;
      if (refCode) payload.ref = refCode;
    }

    await register(payload);

    localStorage.setItem('pendingEmail', normEmail);  // сохраняем нормализованную
    localStorage.setItem('pendingRole', role);

    const urlRef = new URLSearchParams(window.location.search).get('ref') || undefined;
    const lsRef  = localStorage.getItem('referralCode') || undefined;
    const ckRef  = getCookie('jf_ref') || undefined;
    const refCode = urlRef || lsRef || ckRef || undefined;

    const rawReturn = new URLSearchParams(window.location.search).get('return') || '';
    const safeReturn = rawReturn.startsWith('/') && !rawReturn.startsWith('//') ? rawReturn : undefined;

    if (role === 'jobseeker' && refCode && safeReturn) {
      localStorage.setItem('afterVerifyReturn', safeReturn);
    } else {
      localStorage.removeItem('afterVerifyReturn');
    }

    if (refCode) { try { localStorage.removeItem('referralCode'); } catch {} }

    navigate('/registration-pending', { state: { email: normEmail } });
  } catch (error: any) {
    console.error('Register error', error);
    const msg = error?.response?.data?.message;
    if (msg?.includes('Account exists but not verified')) {
      navigate('/registration-pending', { state: { email: normEmail } });
      return;
    }
    if (error?.response?.status === 403 && msg === 'Registration is not allowed from your country') {
      setErr('Registration is not allowed from your country.');
    } else {
      setErr(msg || 'Registration failed. Please try again.');
    }
  } finally {
    setBusy(false);
  }
};



  if (!role) return null;

  const isJobseeker = role === 'jobseeker';

  return (
    <div className="reg2-shell">
      <div className="reg2-card">
        <h1 className="reg2-title">Sign Up</h1>

        {err && <div className="reg2-alert reg2-alert--err">{err}</div>}

        <form onSubmit={handleSubmit} className={`reg2-form ${isJobseeker ? 'is-two' : ''}`}>
          {/* left column */}
          <div className="reg2-field">
            <label className="reg2-label">Username</label>
            <input
              className="reg2-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>

          <div className="reg2-field">
            <label className="reg2-label">Email</label>
      <input
  className="reg2-input"
  type="email"
  value={email}
  onChange={e => setEmail(e.target.value.trim().toLowerCase())}
  placeholder="Enter your email"
  autoComplete="email"
  inputMode="email"
  autoCapitalize="off"
  spellCheck={false}
  required
/>

          </div>

          
<div className="reg2-field">
  <label className="reg2-label">Confirm Email</label>
  <input
    className="reg2-input"
    type="email"
    value={confirmEmail}
    onChange={e => setConfirmEmail(e.target.value.trim().toLowerCase())}
    placeholder="Re-enter your email"
    autoComplete="off"               // запрет автозаполнения
    name="confirm-email"             // нетипичное имя снижает шанс автоподстановок
    inputMode="email"
    autoCapitalize="off"
    spellCheck={false}
    required
    aria-invalid={emailsMismatch ? true : undefined}
    data-invalid={emailsMismatch || undefined}  // ← добавили дата-атрибут для CSS-подсветки
    onPaste={(e) => e.preventDefault()}         // запрет вставки
    onCopy={(e) => e.preventDefault()}          // запрет копирования
    onCut={(e) => e.preventDefault()}           // запрет вырезания
    onDrop={(e) => e.preventDefault()}          // запрет перетаскивания текста
    onContextMenu={(e) => e.preventDefault()}   // запрет контекстного меню
  />

  {/* Визуальная подпись об ошибке (показывается только при несовпадении) */}
  {emailsMismatch && (
    <div className="reg2-hint reg2-hint--err" role="alert">
      Emails do not match.
    </div>
  )}
</div>



<div className="reg2-field">
  <label className="reg2-label">Password</label>
  <div className="reg2-passwrap">
    <input
      className="reg2-input"
      type={seePass ? 'text' : 'password'}
      value={password}
      onChange={e => setPassword(e.target.value)}
      placeholder="Enter your password"
      autoComplete="new-password"
      required
    />
    <button type="button" className="reg2-eye" onClick={() => setSeePass(s => !s)} aria-label="Toggle password">
      {seePass ? <FaEyeSlash /> : <FaEye />}
    </button>
  </div>
  {/* визуальный индикатор */}
  <PasswordStrength value={password} />
</div>

          <div className="reg2-field">
            <label className="reg2-label">Confirm Password</label>
            <div className="reg2-passwrap">
              <input
                className="reg2-input"
                type={seeConf ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                required
              />
              <button type="button" className="reg2-eye" onClick={() => setSeeConf(s => !s)} aria-label="Toggle password">
                {seeConf ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {/* right column (jobseeker extras) */}
          {isJobseeker && (
            <>
              <div className="reg2-field">
                <label className="reg2-label">Online Work Experience</label>
                <select
                  className="reg2-input"
                  value={experience}
                  onChange={e => setExperience(e.target.value)}
                  required
                >
                  <option value="" disabled>Select experience level</option>
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-2 years">1-2 years</option>
                  <option value="2-3 years">2-3 years</option>
                  <option value="3-6 years">3-6 years</option>
                  <option value="6+ years">6+ years</option>
                </select>
              </div>
              {/* NEW: Country & Languages */}
<div className="reg2-field">
  <CountrySelect value={country} onChange={(code) => setCountry(code || '')} />
</div>

<div className="reg2-span2">
  <LanguagesInput value={languages} onChange={setLanguages} />
</div>



        <div className="reg2-field">
  <label className="reg2-label">
    Resume Link <span className="reg2-opt">(optional)</span>
  </label>
  <input
    className="reg2-input"
    type="url"
    value={resumeLink}
    onChange={e => setResumeLink(e.target.value)}
    placeholder="https://example.com/resume.pdf"
  />
  <div className="reg2-note">You can upload a file after registration.</div>
</div>
<div className="reg2-field">
  <label className="reg2-label">Resume File <span className="reg2-opt">(optional)</span></label>
  <input
    className="reg2-input"
    type="file"
    accept=".pdf,.doc,.docx"
onChange={(e) => {
  const f = e.target.files?.[0] || null;
  if (!f) { setResumeFile(null); return; }

  const mb10 = 10 * 1024 * 1024;
  if (f.size > mb10) { alert('Max resume size is 10 MB'); return; }

  const okTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (f.type && !okTypes.includes(f.type)) {
    toast.error('Allowed file types: PDF, DOC, DOCX');
    return;
  }

  setResumeFile(f);
}}

  />
  <div className="reg2-note">PDF/DOC/DOCX, up to 10 MB.</div>
</div>

              <div className="reg2-field reg2-span2">
                <label className="reg2-label">Talents/Skills</label>
                <div className="reg2-auto">
                  <input
                    className="reg2-input"
                    type="text"
                    value={skillQuery}
                    onChange={e => setSkillQuery(e.target.value)}
                    placeholder="Start typing to search skills…"
                    onFocus={() => skillQuery.trim() && setOpenDrop(true)}
                    onBlur={() => setTimeout(() => setOpenDrop(false), 200)}
                  />
                  {openDrop && filteredSkills.length > 0 && (
                    <ul className="reg2-dd">
                      {filteredSkills.map(s => (
                        <li
                          key={s.id}
                          className="reg2-dd__item"
                          onMouseDown={() => addSkill(s)}
                        >
                          {s.parent_id
                            ? `${categories.find(c => c.id === s.parent_id)?.name || 'Category'} > ${s.name}`
                            : s.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {selectedSkills.length > 0 && (
                  <div className="reg2-tags">
                    {selectedSkills.map(s => (
                      <span className="reg2-tag" key={s.id}>
                        {s.name}
                        <button type="button" className="reg2-tag__x" onClick={() => removeSkill(s.id)}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional socials */}
              <div className="reg2-divider reg2-span2">Optional</div>

              <div className="reg2-field">
                <label className="reg2-label">
                  LinkedIn <span className="reg2-opt">(optional)</span>
                </label>
                <input
                  className="reg2-input"
                  type="url"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  placeholder="https://www.linkedin.com/in/username"
                />
              </div>

              <div className="reg2-field">
                <label className="reg2-label">
                  Instagram <span className="reg2-opt">(optional)</span>
                </label>
                <input
                  className="reg2-input"
                  type="url"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  placeholder="https://www.instagram.com/username"
                />
              </div>

              <div className="reg2-field">
                <label className="reg2-label">
                  Facebook <span className="reg2-opt">(optional)</span>
                </label>
                <input
                  className="reg2-input"
                  type="url"
                  value={facebook}
                  onChange={e => setFacebook(e.target.value)}
                  placeholder="https://www.facebook.com/username"
                />
              </div>

              <div className="reg2-field">
  <label className="reg2-label">
    WhatsApp <span className="reg2-opt">(optional)</span>
  </label>
  <input
    className="reg2-input"
    type="text"
    value={whatsapp}
    onChange={e => setWhatsapp(e.target.value)}
    placeholder="+12025550123 or link"
  />
</div>

{/* NEW: Telegram */}
<div className="reg2-field">
  <label className="reg2-label">
    Telegram <span className="reg2-opt">(optional)</span>
  </label>
  <input
    className="reg2-input"
    type="text"
    value={telegram}
    onChange={e => setTelegram(e.target.value)}
    placeholder="@username or https://t.me/username"
  />
</div>

              <div className="reg2-field reg2-span2">
                <label className="reg2-label">
                  About me <span className="reg2-opt">(up to 150 words)</span>
                </label>
                <textarea
                  className="reg2-textarea"
                  rows={4}
                  value={about}
                  onChange={e => setAbout(e.target.value)}
                  placeholder="Tell briefly about your experience, strengths and what roles you're seeking…"
                />
                <div className={`reg2-counter ${wordCount > 150 ? 'is-over' : ''}`}>
                  {wordCount} / 150 words
                </div>
              </div>
            </>
          )}

          {/* submit + links */}
        <div className="reg2-actions reg2-span2">
  <button className="reg2-btn" type="submit" disabled={busy || emailsMismatch}>
    {busy ? 'Signing up…' : `Sign Up as ${role === 'employer' ? 'Employer' : 'Jobseeker'}`}
  </button>
</div>


          <div className="reg2-links reg2-span2">
            <span>Already have an account? <Link to="/login">Login</Link></span>
            <span><Link to="/">Go to Home</Link></span>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
