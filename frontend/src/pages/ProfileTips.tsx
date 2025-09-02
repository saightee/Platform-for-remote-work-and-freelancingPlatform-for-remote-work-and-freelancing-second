import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import {
  FaClock,
  FaLanguage,
  FaShieldAlt,
  FaUserCircle,
  FaPen,
  FaCamera,
  FaFileAlt,
  FaCertificate,
  FaVideo,
  FaGlobeAmericas,
  FaStar,
  FaLink,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';

import '../styles/profile-tips.css';
import { Helmet } from 'react-helmet-async';

const ProfileTips: React.FC = () => {
  return (
    <div className="pt-root">
      <Helmet>
  <title>Profile Tips for Jobseekers | Jobforge</title>
  <meta name="description" content="How to complete your Jobforge profile, add a strong bio, skills, and portfolio." />
  <link rel="canonical" href="https://jobforge.net/profile-tips" />
</Helmet>

      <Header />

      {/* HERO */}
      <section className="pt-hero">
        <div className="pt-shell">
          <div className="pt-card pt-hero-card">
            <div className="pt-hero-head">
              <h1 className="pt-title">Profile Tips for Jobseekers</h1>
              <p className="pt-sub">
                Make your profile stand out and increase your chances of getting hired on JobForge.
                Follow this quick checklist and use our examples to polish your profile today.
              </p>

              <div className="pt-chips">
                <span className="pt-chip"><FaClock /> 10–15 min</span>
                <span className="pt-chip"><FaLanguage /> English</span>
                <span className="pt-chip"><FaShieldAlt /> Best practices</span>
              </div>

              <div className="pt-actions">
                <Link to="/profile" className="pt-btn pt-btn--primary">
                  Open my profile
                </Link>
                <Link to="/skill-test" className="pt-btn pt-btn--ghost">
                  Take a skill test
                </Link>
              </div>
            </div>

            <div className="pt-hero-grid">
              {/* Checklist */}
              <div className="pt-box">
                <h3 className="pt-h3"><FaUserCircle /> Quick checklist</h3>
                <ul className="pt-list">
                  <li><FaCheckCircle className="ok" /> Add a clear, friendly <strong>avatar</strong> (no filters, good lighting).</li>
                  <li><FaCheckCircle className="ok" /> Write a sharp <strong>headline</strong> (Role + Niche + Outcome).</li>
                  <li><FaCheckCircle className="ok" /> Complete your <strong>About/Bio</strong> with 4–6 short sentences.</li>
                  <li><FaCheckCircle className="ok" /> List 6–12 <strong>skills</strong> and your <strong>tools/stack</strong>.</li>
                  <li><FaCheckCircle className="ok" /> Add 2–5 <strong>portfolio links</strong> (GitHub, Behance, Notion, etc.).</li>
                  <li><FaCheckCircle className="ok" /> Set <strong>availability</strong>, <strong>timezone</strong>, and <strong>work mode</strong>.</li>
                  <li><FaCheckCircle className="ok" /> Specify <strong>expected rate</strong> (hourly/monthly) & currency.</li>
                  <li><FaCheckCircle className="ok" /> Add <strong>languages</strong> with levels (e.g., EN — C1).</li>
                  <li><FaCheckCircle className="ok" /> Upload <strong>certificates</strong> and pass a <strong>skill test</strong>.</li>
                  <li><FaCheckCircle className="ok" /> Include 1–3 <strong>testimonials</strong> or references (optional).</li>
                </ul>
              </div>

              {/* Examples */}
              <div className="pt-box">
                <h3 className="pt-h3"><FaPen /> Examples that work</h3>

                <div className="pt-examples">
                  <div className="pt-example">
                    <div className="pt-badge pt-badge--good"><FaStar /> Strong headline</div>
                    <pre className="pt-code">
Senior Bilingual VA (EN/ES) · E-commerce & CRM · Reduces ops workload by 30%
                    </pre>
                  </div>

                  <div className="pt-example">
                    <div className="pt-badge pt-badge--bad"><FaTimesCircle /> Weak headline</div>
                    <pre className="pt-code pt-code--bad">
Virtual assistant looking for job
                    </pre>
                  </div>

                  <div className="pt-example">
                    <div className="pt-badge pt-badge--good"><FaStar /> Summary snippet</div>
                    <div className="pt-note">
                      Bilingual VA with 4+ years supporting US startups. Expert in Shopify, Klaviyo, HubSpot and G-Suite. Streamlined inboxes, built SOPs and cut support response time from 12h to 2h. Available 30–40 hrs/week, PST overlap.
                    </div>
                  </div>

                  <div className="pt-example">
                    <div className="pt-badge"><FaLink /> Portfolio links (any 2–5)</div>
                    <ul className="pt-mini">
                      <li>• GitHub/Behance/Dribbble</li>
                      <li>• Notion/Google Drive case study</li>
                      <li>• Personal website/LinkedIn</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>{/* /grid */}
          </div>
        </div>
      </section>

      {/* ESSENTIALS */}
      <section className="pt-essentials">
        <div className="pt-shell">
          <h2 className="pt-h2">Essential sections to complete</h2>

          <div className="pt-cards">
            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaCamera /></div>
              <h4>Avatar</h4>
              <p>Neutral background, shoulders up, natural light. Smile helps. PNG/JPG, at least 400×400.</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaPen /></div>
              <h4>Headline</h4>
              <p>Role + Niche + Outcome. Keep it under ~80 characters so it looks great in search results.</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaFileAlt /></div>
              <h4>About/Bio</h4>
              <p>Short paragraph (4–6 sentences). Mention stack, wins/metrics, collaboration style, availability.</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaLink /></div>
              <h4>Portfolio</h4>
              <p>Share 2–5 links that prove your results. Even Google Docs with screenshots count.</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaGlobeAmericas /></div>
              <h4>Timezone & Languages</h4>
              <p>State overlap with client time (e.g., “4–6h PST overlap”). Add language levels (A2–C2).</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaCertificate /></div>
              <h4>Certifications</h4>
              <p>Upload certificates (HubSpot, Google, Meta, Scrum, etc.). They increase trust quickly.</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaVideo /></div>
              <h4>Video intro (optional)</h4>
              <p>60–90s: who you are, what you do best, favorite tools, a quick win, your availability.</p>
            </div>

            <div className="pt-card pt-feature">
              <div className="pt-ico"><FaStar /></div>
              <h4>Rates & Availability</h4>
              <p>Be clear about hours/week and rate (hourly or monthly). You can say “open to discuss”.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DOs & DON'Ts */}
      <section className="pt-dos">
        <div className="pt-shell">
          <h2 className="pt-h2">Do this — avoid that</h2>

          <div className="pt-two">
            <div className="pt-card pt-do">
              <h3>Do</h3>
              <ul className="pt-list">
                <li><FaCheckCircle className="ok" /> Use a professional photo and your real name.</li>
                <li><FaCheckCircle className="ok" /> Show measurable results (“reduced churn 12%”, “closed 25 tickets/day”).</li>
                <li><FaCheckCircle className="ok" /> Tailor your headline/summary to the roles you want.</li>
                <li><FaCheckCircle className="ok" /> Keep sections concise and skimmable.</li>
              </ul>
            </div>

            <div className="pt-card pt-dont">
              <h3>Don’t</h3>
              <ul className="pt-list">
                <li><FaTimesCircle className="no" /> Use low-res selfies, heavy filters or group photos.</li>
                <li><FaTimesCircle className="no" /> Copy-paste a generic bio without specifics or tools.</li>
                <li><FaTimesCircle className="no" /> Hide your rate/availability — it slows down hiring.</li>
                <li><FaTimesCircle className="no" /> Leave empty sections. Complete 100% for best ranking.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pt-cta">
        <div className="pt-shell pt-cta-inner">
          <div className="pt-cta-text">
            <span className="pt-cta-eyebrow">You’re one update away</span>
            <h3>Publish a complete profile and start applying today</h3>
            <p>Great profiles get discovered more and receive faster replies from employers.</p>
          </div>
          <div className="pt-cta-actions">
            <Link to="/profile" className="pt-btn pt-btn--inverse">Update my profile</Link>
            <Link to="/find-job" className="pt-btn pt-btn--ghost">Browse jobs</Link>
          </div>
        </div>
      </section>

      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfileTips;
