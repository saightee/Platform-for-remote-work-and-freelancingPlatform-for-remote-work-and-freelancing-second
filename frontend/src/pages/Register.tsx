import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { register, getCategories, searchCategories } from '../services/api';
import { Category } from '@types';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

import '../styles/register-v2.css';

const urlOk = (v: string) => /^https?:\/\/\S+$/i.test(v.trim());

const Register: React.FC = () => {
  const { role } = useParams<{ role: 'employer' | 'jobseeker' }>();
  const navigate = useNavigate();

  // common
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [seePass, setSeePass]   = useState(false);
  const [seeConf, setSeeConf]   = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);

  // jobseeker specifics
  const [experience, setExperience] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [linkedin, setLinkedin]     = useState('');
  const [instagram, setInstagram]   = useState('');
  const [facebook, setFacebook]     = useState('');
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
    if (password !== confirm) { setErr('Passwords do not match.'); return; }

    // URL validation (only if filled)
    const urlErrors: string[] = [];
    const check = (val: string, label: string) => { if (val && !urlOk(val)) urlErrors.push(`${label} URL is invalid (use https://...)`); };
    check(resumeLink, 'Resume');
    check(linkedin, 'LinkedIn');
    check(instagram, 'Instagram');
    check(facebook, 'Facebook');
    if (urlErrors.length) { setErr(urlErrors[0]); return; }

    try {
      setBusy(true); setErr(null);

      const refCode = localStorage.getItem('referralCode') || undefined;
      const payload: any = {
        username,
        email,
        password,
        role,
      };

      if (role === 'jobseeker') {
        if (experience) payload.experience = experience;
        if (selectedSkills.length) payload.skills = selectedSkills.map(s => String(s.id));
        if (resumeLink.trim()) payload.resume = resumeLink.trim();

        // optional socials — send only if filled
        if (linkedin.trim())  payload.linkedin  = linkedin.trim();
        if (instagram.trim()) payload.instagram = instagram.trim();
        if (facebook.trim())  payload.facebook  = facebook.trim();

        if (about.trim())     payload.about     = about.trim(); // soft limit; back will trim
      }

      if (refCode) payload.ref = refCode;

      await register(payload);

      localStorage.setItem('pendingEmail', email);
      if (refCode) localStorage.removeItem('referralCode');
      navigate('/check-email', { state: { email } });
    } catch (error: any) {
      console.error('Register error', error);
      const msg = error?.response?.data?.message;
      if (msg?.includes('Account exists but not verified')) {
        navigate('/check-email', { state: { email } });
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

        <form onSubmit={handleSubmit} className={`reg2-form ${isJobseeker ? 'is-two' : ''}`} noValidate>
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
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
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
                <label className="reg2-label">Experience</label>
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
            <button className="reg2-btn" type="submit" disabled={busy}>
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
