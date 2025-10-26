import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { register, getCategories, searchCategories, getRegistrationAvatarRequired } from '../services/api';
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
const STORAGE_KEY = useMemo(() => `reg_draft_${role || 'unknown'}`, [role]);
  // common
  const [username, setUsername] = useState('');
 
// Avatar state
const [avatarFile, setAvatarFile] = useState<File | null>(null);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
const [avatarErr, setAvatarErr] = useState<string | null>(null);
const fileInputResumeRef = useRef<HTMLInputElement | null>(null);
const [isResumeDragOver, setIsResumeDragOver] = useState(false);
const fileInputRef = useRef<HTMLInputElement | null>(null);           // ← avatar input
const [isAvatarDragOver, setIsAvatarDragOver] = useState(false);      // ← avatar dnd


const processResumeFile = (f: File | null) => {
  if (!f) { setResumeFile(null); return; }

  const mb10 = 10 * 1024 * 1024;
  if (f.size > mb10) { alert('Max resume size is 10 MB'); return; }

  const okTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  if (f.type && !okTypes.includes(f.type)) {
    toast.error('Allowed file types: PDF, DOC, DOCX');
    return;
  }

  setResumeFile(f);
};

const processAvatarFile = (f: File | null) => {
  setAvatarErr(null);
  setAvatarFile(null);
  if (avatarPreview) { URL.revokeObjectURL(avatarPreview); setAvatarPreview(null); }
  if (!f) return;

  const MB10 = 10 * 1024 * 1024;
  if (f.size > MB10) { setAvatarErr('Avatar size must be up to 10 MB.'); return; }

  const ok = ['image/jpeg','image/png','image/webp'];
  if (f.type && !ok.includes(f.type)) {
    setAvatarErr('Avatar must be JPG/PNG/WEBP.');
    return;
  }

  setAvatarFile(f);
  setAvatarPreview(URL.createObjectURL(f));
};

// “обязателен ли аватар”
const [avatarRequired, setAvatarRequired] = useState<boolean | null>(null);

  const [email, setEmail]       = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [seePass, setSeePass]   = useState(false);
  const [seeConf, setSeeConf]   = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  // NEW: must accept Terms & Privacy to register
const [agree, setAgree] = useState(false);


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

   useEffect(() => {
  if (!role) return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);

    // заполняем только безопасные поля
    setUsername(d.username ?? '');
    setEmail(d.email ?? '');
    setConfirmEmail(d.confirmEmail ?? '');

    if (role === 'jobseeker') {
      setExperience(d.experience ?? '');
      setCountry(d.country ?? '');
      setLanguages(Array.isArray(d.languages) ? d.languages : []);
      setResumeLink(d.resumeLink ?? '');
      setLinkedin(d.linkedin ?? '');
      setInstagram(d.instagram ?? '');
      setFacebook(d.facebook ?? '');
      setWhatsapp(d.whatsapp ?? '');
      setTelegram(d.telegram ?? '');
      setAbout(d.about ?? '');
      setSelectedSkills(Array.isArray(d.selectedSkills) ? d.selectedSkills : []);
    }

    // пароли и файл не восстанавливаем по соображениям безопасности
  } catch { /* ignore */ }
}, [role, STORAGE_KEY]);

// NEW: persist draft (except passwords & files)
useEffect(() => {
  if (!role) return;
  const draft: any = {
    username,
    email,
    confirmEmail,
  };

  if (role === 'jobseeker') {
    draft.experience   = experience;
    draft.country      = country;
    draft.languages    = languages;
    draft.resumeLink   = resumeLink;
    draft.linkedin     = linkedin;
    draft.instagram    = instagram;
    draft.facebook     = facebook;
    draft.whatsapp     = whatsapp;
    draft.telegram     = telegram;
    draft.about        = about;
    draft.selectedSkills = selectedSkills; // храним как есть (id+name)
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch { /* storage quota? ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  role,
  username, email, confirmEmail,
  experience, country, languages, resumeLink,
  linkedin, instagram, facebook, whatsapp, telegram,
  about, selectedSkills
]);

useEffect(() => {
  if (role !== 'jobseeker') { setAvatarRequired(false); return; }

  const KEY = 'reg_avatar_required_v1';
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const { required, ts } = JSON.parse(raw);
      const TTL_MS = 60_000; // 1 минута
if (Date.now() - ts < TTL_MS) {
        setAvatarRequired(!!required);
        return;
      }
    }
  } catch {}

  (async () => {
    try {
      const res = await getRegistrationAvatarRequired(); // { required: boolean }
      setAvatarRequired(!!res?.required);
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ required: !!res?.required, ts: Date.now() }));
      } catch {}
    } catch {
      // фоллбек: не блокируем регистрацию; сервер сам провалидирует
      setAvatarRequired(false);
    }
  })();
}, [role]);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!role) return;

  if (!agree) {
    toast.info('Please read and agree to the Terms of Service and Privacy Policy.');
    return;
  }

  // нормализация
  const normEmail = email.trim().toLowerCase();
  const normConfirmEmail = confirmEmail.trim().toLowerCase();
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // валидации
  if (!username.trim()) { setErr('Username is required.'); return; }
  if (!normEmail || !emailRe.test(normEmail)) { setErr('Valid email is required.'); return; }
  if (!normConfirmEmail || !emailRe.test(normConfirmEmail)) { setErr('Please re-enter a valid email.'); return; }
  if (normEmail !== normConfirmEmail) { setErr('Emails do not match.'); return; }

  if (!password) { setErr('Password is required.'); return; }
  if (password !== confirm) { setErr('Passwords do not match.'); return; }
  if (!isStrongPassword(password)) { setErr('Password does not meet security requirements.'); return; }
  if (role === 'jobseeker' && !experience) { setErr('Please select your experience.'); return; }

  // аватар обязателен, если флаг true
  if (role === 'jobseeker' && avatarRequired && !avatarFile) {
    setErr('Please upload an avatar.');
    return;
  }
  if (avatarErr) { setErr(avatarErr); return; }

  // URL-поля
  const urlErrors: string[] = [];
  const check = (val: string, label: string) => { if (val && !urlOk(val)) urlErrors.push(`${label} URL is invalid (use https://...)`); };
  check(resumeLink, 'Resume');
  check(linkedin, 'LinkedIn');
  check(instagram, 'Instagram');
  check(facebook, 'Facebook');
  if (urlErrors.length) { setErr(urlErrors[0]); return; }

  try {
    setBusy(true);
    setErr(null);

    // единоразово считаем refCode
    const urlRef = new URLSearchParams(window.location.search).get('ref') || undefined;
    const lsRef  = localStorage.getItem('referralCode') || undefined;
    const ckRef  = getCookie('jf_ref') || undefined;
    const refCode = urlRef || lsRef || ckRef || undefined;

    // решаем, нужен ли FormData
    const needsFD = role === 'jobseeker' && (resumeFile || avatarFile);

    let payload: FormData | Record<string, any>;

    if (needsFD) {
      const fd = new FormData();
      fd.append('username', username);
      fd.append('email', normEmail);
      fd.append('password', password);
      fd.append('role', role);

      if (resumeFile) fd.append('resume_file', resumeFile);
      if (avatarFile) fd.append('avatar', avatarFile); // имя поля под свой бэк

      if (role === 'jobseeker') {
        if (experience)            fd.append('experience', experience);
        if (selectedSkills.length) selectedSkills.forEach(s => fd.append('skills[]', String(s.id)));
        if (resumeLink.trim())     fd.append('resume', resumeLink.trim());
        if (linkedin.trim())       fd.append('linkedin', linkedin.trim());
        if (instagram.trim())      fd.append('instagram', instagram.trim());
        if (facebook.trim())       fd.append('facebook', facebook.trim());
        if (whatsapp.trim())       fd.append('whatsapp', whatsapp.trim());
        if (telegram.trim())       fd.append('telegram', telegram.trim());
        if (about.trim())          fd.append('about', about.trim());
        if (country.trim())        fd.append('country', country.trim().toUpperCase());
        if (languages.length)      languages.forEach(l => fd.append('languages[]', l));
      }

      if (refCode) fd.append('ref', refCode);
      payload = fd;
    } else {
      payload = {
        username,
        email: normEmail,
        password,
        role,
        ...(role === 'jobseeker' ? {
          ...(experience ? { experience } : {}),
          ...(selectedSkills.length ? { skills: selectedSkills.map(s => String(s.id)) } : {}),
          ...(resumeLink.trim() ? { resume: resumeLink.trim() } : {}),
          ...(linkedin.trim() ? { linkedin: linkedin.trim() } : {}),
          ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
          ...(facebook.trim() ? { facebook: facebook.trim() } : {}),
          ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
          ...(telegram.trim() ? { telegram: telegram.trim() } : {}),
          ...(about.trim() ? { about: about.trim() } : {}),
          ...(country.trim() ? { country: country.trim().toUpperCase() } : {}),
          ...(languages.length ? { languages } : {}),
        } : {})
      };
      if (refCode) (payload as any).ref = refCode;
    }

    await register(payload);

    // cleanup + redirect
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    localStorage.setItem('pendingEmail', normEmail);
    localStorage.setItem('pendingRole', role);

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

{/* NEW: Avatar (required? depends on flag) */}
<div className="reg2-field reg2-span2">
  <label className="reg2-label">
    Avatar {avatarRequired ? <span className="reg2-opt" style={{color:'#b91c1c'}}>(required)</span> : <span className="reg2-opt">(optional)</span>}
  </label>

  <div
  onDragEnter={(e) => { e.preventDefault(); setIsAvatarDragOver(true); }}
  onDragOver={(e) => { e.preventDefault(); setIsAvatarDragOver(true); }}
  onDragLeave={(e) => { e.preventDefault(); setIsAvatarDragOver(false); }}
  onDrop={(e) => {
    e.preventDefault();
    setIsAvatarDragOver(false);
    const f = e.dataTransfer.files?.[0] || null;
    processAvatarFile(f);
  }}
  onClick={() => fileInputRef.current?.click()}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
  style={{
    border: '2px dashed #d1d5db',
    borderColor: isAvatarDragOver ? '#6b7280' : '#d1d5db',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
    background: isAvatarDragOver ? '#f9fafb' : 'transparent'
  }}
>
    {avatarPreview ? (
      <>
        <img
          src={avatarPreview}
          alt="Avatar preview"
          style={{width:84, height:84, objectFit:'cover', borderRadius:12, border:'1px solid #e5e7eb'}}
        />
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          <div className="reg2-note">Click to replace or drop a new image.</div>
          <div style={{display:'flex', gap:8}}>
            <button
              type="button"
              className="reg2-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                setAvatarPreview(null);
                setAvatarFile(null);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      </>
    ) : (
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        <div className="reg2-note" style={{fontWeight:600}}>
          Drop image here or click to upload
        </div>
        <div className="reg2-note">JPG/PNG/WEBP, up to 10 MB.</div>
      </div>
    )}

    {/* скрытый input для «клика» */}
    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
      style={{ display: 'none' }}
      onChange={(e) => processAvatarFile(e.target.files?.[0] || null)}
    />
  </div>

  {/* ошибки и подсказки */}
  {avatarErr && <div className="reg2-hint reg2-hint--err" role="alert">{avatarErr}</div>}
  {avatarRequired && !avatarFile && (
    <div className="reg2-hint">Please upload an avatar to complete your registration.</div>
  )}
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
  <label className="reg2-label">
    Resume File <span className="reg2-opt">(optional)</span>
  </label>

  <div
    onDragEnter={(e) => { e.preventDefault(); setIsResumeDragOver(true); }}
    onDragOver={(e) => { e.preventDefault(); setIsResumeDragOver(true); }}
    onDragLeave={(e) => { e.preventDefault(); setIsResumeDragOver(false); }}
    onDrop={(e) => {
      e.preventDefault();
      setIsResumeDragOver(false);
      const f = e.dataTransfer.files?.[0] || null;
      processResumeFile(f);
    }}
    onClick={() => fileInputResumeRef.current?.click()}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputResumeRef.current?.click(); }}
    style={{
      border: '2px dashed #d1d5db',
      borderColor: isResumeDragOver ? '#6b7280' : '#d1d5db',
      borderRadius: 12,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      cursor: 'pointer',
      background: isResumeDragOver ? '#f9fafb' : 'transparent'
    }}
  >
    <div style={{display:'flex', flexDirection:'column', gap:6}}>
      {resumeFile ? (
        <>
          <div className="reg2-note" style={{fontWeight:600}}>
            {resumeFile.name}
          </div>
          <div className="reg2-note">Click to replace or drop a new file.</div>
        </>
      ) : (
        <>
          <div className="reg2-note" style={{fontWeight:600}}>
            Drop file here or click to upload
          </div>
          <div className="reg2-note">PDF/DOC/DOCX, up to 10 MB.</div>
        </>
      )}
    </div>

    {resumeFile && (
      <button
        type="button"
        className="reg2-btn"
        onClick={(e) => {
          e.stopPropagation();
          setResumeFile(null);
          if (fileInputResumeRef.current) fileInputResumeRef.current.value = '';
        }}
      >
        Remove
      </button>
    )}

    {/* скрытый input под клик */}
    <input
      ref={fileInputResumeRef}
      type="file"
      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      style={{ display: 'none' }}
      onChange={(e) => processResumeFile(e.target.files?.[0] || null)}
    />
  </div>
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
{/* NEW: consent checkbox */}
<div className="reg2-consent reg2-span2">
  <input
    id="agree"
    type="checkbox"
    checked={agree}
    onChange={(e) => setAgree(e.target.checked)}
  />
  <label htmlFor="agree">
    I have read and agree to the{' '}
    <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer">
      Terms of Service
    </Link>{' '}
    and the{' '}
    <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">
      Privacy Policy
    </Link>.
  </label>
</div>

{/* submit + links */}
<div className="reg2-actions reg2-span2">
  <button
    className="reg2-btn"
    type="submit"
    disabled={busy || emailsMismatch || !agree} // NEW: disabled until agreed
  >
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
