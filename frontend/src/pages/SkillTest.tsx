import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaStar,
  FaShieldAlt,
  FaGlobe,
  FaEnvelope,
  FaUserCheck,
} from 'react-icons/fa';
import '../styles/skill-test.css';
import { Helmet } from 'react-helmet-async';

/* =====================================================================================
   PAGE WRAPPER: two tests on one page with a simple toggle (tabs-like)
===================================================================================== */

const SkillTest: React.FC = () => {
  const [tab, setTab] = useState<'va' | 'workstyle'>('va');

  return (
    <div className="stx-page">
      <Helmet>
  <title>Skill Tests for VAs & Jobseekers | Jobforge</title>
  <meta name="description" content="Prove your skills with Jobforge tests and showcase results on your profile." />
  <link rel="canonical" href="https://jobforge.net/skill-test" />
</Helmet>

      <Header />

      <div className="stx-shell">
        <div className="stx-card">
          {/* Top switcher */}
          <div className="stx-topbar" style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="stx-button"
                onClick={() => setTab('va')}
                style={{
                  background: tab === 'va' ? 'var(--stx-accent)' : 'transparent',
                  color: tab === 'va' ? '#fff' : 'var(--stx-text)',
                  border: tab === 'va' ? 'none' : '1px solid var(--stx-border)',
                  boxShadow: tab === 'va' ? '0 4px 14px rgba(78,116,200,.25)' : 'none',
                }}
              >
                General VA Skill Test
              </button>
              <button
                className="stx-button"
                onClick={() => setTab('workstyle')}
                style={{
                  background: tab === 'workstyle' ? 'var(--stx-accent)' : 'transparent',
                  color: tab === 'workstyle' ? '#fff' : 'var(--stx-text)',
                  border: tab === 'workstyle' ? 'none' : '1px solid var(--stx-border)',
                  boxShadow: tab === 'workstyle' ? '0 4px 14px rgba(78,116,200,.25)' : 'none',
                }}
              >
                Jobseeker Workstyle Test
              </button>
            </div>
          </div>

          {/* Test content (without extra card wrappers) */}
          {tab === 'va' ? <GeneralVATest /> : <WorkstyleTest />}
        </div>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default SkillTest;

/* =====================================================================================
   TEST 1: General VA Skill Test (20 auto-graded questions; NO practical block)
===================================================================================== */

type VA_QType = 'single' | 'multi';
type VA_Option = { id: string; label: string };
type VA_Question = {
  id: string;
  type: VA_QType;
  category: 'Communication' | 'Timezone' | 'Search' | 'Sheets' | 'Ops';
  title: string;
  options: VA_Option[];
  correct: string[];
  note?: string;
};
type VA_Answers = Record<string, string[]>;

const VA_QUESTIONS: VA_Question[] = [
  // Communication
  {
    id: 'Q1',
    type: 'single',
    category: 'Communication',
    title: 'Which email subject is clearest for a client asking for last week’s numbers?',
    options: [
      { id: 'A', label: 'Hello' },
      { id: 'B', label: 'Report' },
      { id: 'C', label: 'Weekly Metrics – Feb 10–16 (Draft v1)' },
      { id: 'D', label: 'Numbers pls' },
    ],
    correct: ['C'],
  },
  {
    id: 'Q2',
    type: 'multi',
    category: 'Communication',
    title: 'When is BCC appropriate? (Select all that apply)',
    options: [
      { id: 'A', label: 'To secretly loop in your manager for feedback on a thread' },
      { id: 'B', label: 'Sending an announcement to many recipients to protect privacy' },
      { id: 'C', label: 'Moving someone off a thread while keeping a record of the final send' },
      { id: 'D', label: 'For urgent questions that need fast replies' },
    ],
    correct: ['B', 'C'],
    note: 'Multiple answers',
  },
  {
    id: 'Q3',
    type: 'single',
    category: 'Communication',
    title: 'In asynchronous comms, EOD usually means:',
    options: [
      { id: 'A', label: 'End of duty' },
      { id: 'B', label: 'End of day' },
      { id: 'C', label: 'End of document' },
      { id: 'D', label: 'End of discussion' },
    ],
    correct: ['B'],
  },
  {
    id: 'Q5',
    type: 'single',
    category: 'Communication',
    title: 'Choose the sentence without errors:',
    options: [
      { id: 'A', label: 'Its important that we’re on the same page.' },
      { id: 'B', label: 'It’s important that we’re on the same page.' },
      { id: 'C', label: 'Its important that were on the same page.' },
      { id: 'D', label: 'It’s important that were on the same page.' },
    ],
    correct: ['B'],
  },
  {
    id: 'Q6',
    type: 'single',
    category: 'Communication',
    title: 'Best concise rewrite:',
    options: [
      { id: 'A', label: 'I’m emailing you to let you know that I will send the file later.' },
      { id: 'B', label: 'I’ll send the file later today.' },
      { id: 'C', label: 'Per my last email I will send the file in due course.' },
      { id: 'D', label: 'Kindly be advised that the file will be sent by me at a later time.' },
    ],
    correct: ['B'],
  },
  {
    id: 'Q17',
    type: 'single',
    category: 'Communication',
    title: 'Best first line to an angry customer:',
    options: [
      { id: 'A', label: 'Calm down so I can help.' },
      { id: 'B', label: 'I’m sorry about the frustration here — I’ll help get this resolved.' },
      { id: 'C', label: 'This isn’t our fault.' },
      { id: 'D', label: 'Please read the FAQ.' },
    ],
    correct: ['B'],
  },

  // Timezone
  {
    id: 'Q4',
    type: 'single',
    category: 'Timezone',
    title: '10:00 AM PST equals:',
    options: [
      { id: 'A', label: '15:00 UTC' },
      { id: 'B', label: '16:00 UTC' },
      { id: 'C', label: '17:00 UTC' },
      { id: 'D', label: '18:00 UTC' },
    ],
    correct: ['D'],
  },
  {
    id: 'Q16',
    type: 'single',
    category: 'Timezone',
    title:
      'A client in UTC asks for a 30-min call between 17:00–19:00 UTC. Your local time is UTC+2. Which slot fits?',
    options: [
      { id: 'A', label: '15:30 local' },
      { id: 'B', label: '19:30 local' },
      { id: 'C', label: '20:30 local' },
      { id: 'D', label: '14:30 local' },
    ],
    correct: ['B'],
  },

  // Search
  {
    id: 'Q7',
    type: 'single',
    category: 'Search',
    title: 'To find PDF guides for “customer retention”, which query works best?',
    options: [
      { id: 'A', label: 'customer retention ext:pdf' },
      { id: 'B', label: '"customer retention" filetype:pdf' },
      { id: 'C', label: 'customer retention type=pdf' },
      { id: 'D', label: 'pdf:"customer retention"' },
    ],
    correct: ['B'],
  },
  {
    id: 'Q8',
    type: 'single',
    category: 'Search',
    title: 'Which source is most credible for a statistic you’ll cite?',
    options: [
      { id: 'A', label: 'Personal blog post' },
      { id: 'B', label: 'Company marketing landing page' },
      { id: 'C', label: 'Government or peer-reviewed publication (.gov/.edu/.org research)' },
      { id: 'D', label: 'Reddit thread' },
    ],
    correct: ['C'],
  },
  {
    id: 'Q9',
    type: 'single',
    category: 'Search',
    title: 'You should usually remove which when sharing links externally?',
    options: [
      { id: 'A', label: 'Anchor fragments (#)' },
      { id: 'B', label: 'UTM parameters (e.g., utm_source, utm_campaign)' },
      { id: 'C', label: 'The domain' },
      { id: 'D', label: 'HTTPS' },
    ],
    correct: ['B'],
  },

  // Sheets / Excel
  {
    id: 'Q10',
    type: 'multi',
    category: 'Sheets',
    title: 'Sum A2:A10 when B2:B10 = "Paid":',
    options: [
      { id: 'A', label: '=SUM(A2:A10,"Paid")' },
      { id: 'B', label: '=SUMIF(B2:B10,"Paid",A2:A10)' },
      { id: 'C', label: '=SUMIFS(A2:A10,B2:B10,"Paid")' },
      { id: 'D', label: 'Both B and C are valid' },
    ],
    correct: ['D'],
    note: 'Multiple answers concept',
  },
  {
    id: 'Q11',
    type: 'single',
    category: 'Sheets',
    title: 'Convert text date in A2 ("2025-03-05") to a real date:',
    options: [
      { id: 'A', label: '=TEXT(A2,"yyyy-mm-dd")' },
      { id: 'B', label: '=DATEVALUE(A2)' },
      { id: 'C', label: '=PARSEDATE(A2)' },
      { id: 'D', label: '=TO_DATE(A2,"YYYY-MM-DD")' },
    ],
    correct: ['B'],
  },
  {
    id: 'Q12',
    type: 'single',
    category: 'Sheets',
    title: 'Freeze header row (Google Sheets):',
    options: [
      { id: 'A', label: 'View → Freeze → 1 row' },
      { id: 'B', label: 'View → Lock → Top row' },
      { id: 'C', label: 'Data → Filter views' },
      { id: 'D', label: 'View → Split → 1' },
    ],
    correct: ['A'],
  },
  {
    id: 'Q13',
    type: 'single',
    category: 'Sheets',
    title: 'Return unique values from A2:A100:',
    options: [
      { id: 'A', label: '=DISTINCT(A2:A100)' },
      { id: 'B', label: '=UNIQUE(A2:A100)' },
      { id: 'C', label: '=ONLY(A2:A100)' },
      { id: 'D', label: '=SINGULAR(A2:A100)' },
    ],
    correct: ['B'],
  },
  {
    id: 'Q14',
    type: 'single',
    category: 'Sheets',
    title: 'Which is true?',
    options: [
      { id: 'A', label: 'VLOOKUP can look left and right' },
      { id: 'B', label: 'XLOOKUP can search left/right and return exact matches by default' },
      { id: 'C', label: 'INDEX/MATCH requires sorted data' },
      { id: 'D', label: 'VLOOKUP is always faster than XLOOKUP' },
    ],
    correct: ['B'],
  },

  // Ops
  {
    id: 'Q15',
    type: 'single',
    category: 'Ops',
    title:
      'You have: 1) Payroll due in 2 hours; 2) Draft blog due next week; 3) Slack pings about lunch; 4) Inbox zero. What’s first?',
    options: [
      { id: 'A', label: 'Slack pings' },
      { id: 'B', label: 'Inbox zero' },
      { id: 'C', label: 'Run payroll' },
      { id: 'D', label: 'Draft blog' },
    ],
    correct: ['C'],
  },
  {
    id: 'Q18',
    type: 'single',
    category: 'Ops',
    title: '“SLA first response time: 2h” means:',
    options: [
      { id: 'A', label: 'A human responds within 2 hours' },
      { id: 'B', label: 'Issue fully resolved within 2 hours' },
      { id: 'C', label: 'Ticket auto-closed in 2 hours' },
      { id: 'D', label: 'Bot replies in 2 hours' },
    ],
    correct: ['A'],
  },
  {
    id: 'Q19',
    type: 'multi',
    category: 'Ops',
    title: 'Red flags for phishing: (Select all that apply)',
    options: [
      { id: 'A', label: 'Sender domain slightly misspelled' },
      { id: 'B', label: 'Unexpected attachment from unknown contact' },
      { id: 'C', label: 'Urgent ask for passwords or codes' },
      { id: 'D', label: 'Message from a known ticketing system domain you frequently use' },
    ],
    correct: ['A', 'B', 'C'],
    note: 'Multiple answers',
  },
  {
    id: 'Q20',
    type: 'single',
    category: 'Ops',
    title: 'Which is best practice for handling client data?',
    options: [
      { id: 'A', label: 'Export customer data to personal Drive for convenience' },
      { id: 'B', label: 'Email CSVs of PII to your personal inbox' },
      { id: 'C', label: 'Use client-approved tools, least-privilege access, and secure links' },
      { id: 'D', label: 'Store all copies indefinitely for “future needs”' },
    ],
    correct: ['C'],
  },
];

const VA_CATEGORIES: VA_Question['category'][] = ['Communication', 'Timezone', 'Search', 'Sheets', 'Ops'];

const GeneralVATest: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<VA_Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const total = VA_QUESTIONS.length;

  const progress = useMemo(() => {
    const answeredCount = VA_QUESTIONS.reduce((n, q) => (answers[q.id]?.length ? n + 1 : n), 0);
    return Math.round((answeredCount / total) * 100);
  }, [answers, total]);

  const onSingle = (qid: string, opt: string) => setAnswers((s) => ({ ...s, [qid]: [opt] }));
  const onMulti = (qid: string, opt: string) =>
    setAnswers((s) => {
      const prev = new Set(s[qid] || []);
      prev.has(opt) ? prev.delete(opt) : prev.add(opt);
      return { ...s, [qid]: Array.from(prev) };
    });

  const go = (dir: -1 | 1) => {
    setCurrent((i) => Math.min(Math.max(0, i + dir), total - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const computeScore = () => {
    let score = 0;
    const perCat: Record<VA_Question['category'], { ok: number; all: number }> = {
      Communication: { ok: 0, all: 0 },
      Timezone: { ok: 0, all: 0 },
      Search: { ok: 0, all: 0 },
      Sheets: { ok: 0, all: 0 },
      Ops: { ok: 0, all: 0 },
    };

    for (const q of VA_QUESTIONS) {
      perCat[q.category].all++;
      const user = new Set(answers[q.id] || []);
      const correct = new Set(q.correct);
      const isCorrect = user.size === correct.size && [...user].every((x) => correct.has(x));
      if (isCorrect) {
        score++;
        perCat[q.category].ok++;
      }
    }
    return { score, perCat, pct: Math.round((score / total) * 100) };
  };

  const result = useMemo(() => (submitted ? computeScore() : null), [submitted, answers]);

  const capabilityLine = (label: string, pct: number) => {
    if (pct >= 80) return `${label}: strong`;
    if (pct >= 50) return `${label}: solid`;
    return `${label}: needs improvement`;
  };

  const handleSubmit = () => {
    const unanswered = VA_QUESTIONS.filter((q) => !(answers[q.id] && answers[q.id].length)).length;
    if (unanswered > 0) {
      const ok = window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
      if (!ok) return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const q = VA_QUESTIONS[current];
  const currentValue = answers[q?.id] || [];

  return (
    <>
      {!started ? (
        <div className="stx-intro">
          <h1 className="stx-title">General VA Skill Test</h1>
          <p className="stx-subtitle">20 auto-graded multiple-choice questions.</p>

          <div className="stx-meta">
            <div className="stx-chip"><FaClock /> ~30 min</div>
            <div className="stx-chip"><FaEnvelope /> Asynchronous</div>
            <div className="stx-chip"><FaGlobe /> English</div>
            <div className="stx-chip"><FaShieldAlt /> No external tools required</div>
          </div>

          <ul className="stx-guidelines">
            <li>Single choice unless marked “Select all that apply”.</li>
            <li>PST = UTC-8 (standard time).</li>
            <li>Passing: 80% (16/20) on the auto-graded part.</li>
          </ul>

          <button className="stx-button" onClick={() => setStarted(true)}>Start the test</button>
        </div>
      ) : !submitted ? (
        <>
          <div className="stx-topbar">
            <div className="stx-topbar__left">
              <div className="stx-progress">
                <div className="stx-progress__bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="stx-progress__text">{progress}% completed</div>
            </div>
            <div className="stx-topbar__right">
              <span className="stx-count">Question {current + 1} / {total}</span>
            </div>
          </div>

          <div className="stx-qcard" role="group" aria-labelledby={`q-${q.id}`}>
            <div className="stx-qhead">
              <span className={`stx-cat stx-cat--${q.category.toLowerCase()}`}>{q.category}</span>
              {q.type === 'multi' && <span className="stx-note">Select all that apply</span>}
            </div>
            <h3 id={`q-${q.id}`} className="stx-qtitle">{q.title}</h3>

            <div className="stx-options">
              {q.options.map((op) => {
                const checked = currentValue.includes(op.id);
                const inputProps =
                  q.type === 'single'
                    ? { type: 'radio' as const, name: q.id, checked, onChange: () => onSingle(q.id, op.id) }
                    : { type: 'checkbox' as const, name: `${q.id}-${op.id}`, checked, onChange: () => onMulti(q.id, op.id) };

                return (
                  <label key={op.id} className={`stx-opt ${checked ? 'is-checked' : ''}`}>
                    <input {...inputProps} />
                    <span className="stx-opt__fake" />
                    <span className="stx-opt__text">{op.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="stx-nav">
              <button className="stx-button stx-ghost" onClick={() => go(-1)} disabled={current === 0}>
                Prev
              </button>
              {current < total - 1 ? (
                <button className="stx-button" onClick={() => go(1)}>Next</button>
              ) : (
                <button className="stx-button stx-success" onClick={handleSubmit}>Submit</button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="stx-result">
          <div className="stx-rescore">
            {result && result.pct >= 80 ? (
              <FaCheckCircle className="stx-res-ico ok" />
            ) : (
              <FaTimesCircle className="stx-res-ico bad" />
            )}
            <div className="stx-resline">
              <div className="stx-res-main">
                Score: <strong>{result?.score}/{total}</strong> ({result?.pct}%)
              </div>
              <div className="stx-res-sub">Passing: 16/20 (80%) on the auto-graded part</div>
            </div>
          </div>

          <div className="stx-cats">
            {VA_CATEGORIES.map((cat) => {
              const c = result!.perCat[cat];
              const pct = Math.round((c.ok / c.all) * 100);
              return (
                <div key={cat} className="stx-catline">
                  <div className="stx-catline__head">
                    <span className={`stx-cat stx-cat--${cat.toLowerCase()}`}>{cat}</span>
                    <span className="stx-catline__pct">{pct}%</span>
                  </div>
                  <div className="stx-catline__bar">
                    <div className="stx-catline__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="stx-capability">
                    {capabilityLine(cat, pct)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="stx-summary">
            <h3>What this result says about you</h3>
            <ul>
              <li>You can communicate clearly and concisely with clients and teammates.</li>
              <li>You handle time-zone coordination and remote scheduling reliably.</li>
              <li>You know how to search, validate sources, and share clean links.</li>
              <li>You’re comfortable with Google Sheets/Excel basics.</li>
              <li>You prioritize critical tasks, understand SLAs, and follow security best practices.</li>
            </ul>
            <p className="stx-note2">Focus on any category below 80% and retake the test.</p>
          </div>

          <div className="stx-actions">
            <button className="stx-button stx-ghost" onClick={() => { setSubmitted(false); setCurrent(0); }}>
              Review answers
            </button>
            <button
              className="stx-button"
              onClick={() => {
                setStarted(false);
                setCurrent(0);
                setAnswers({});
                setSubmitted(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/* =====================================================================================
   TEST 2: Jobseeker Workstyle Test (12 single-choice questions, profiling)
===================================================================================== */

type WS_Trait = 'Planner' | 'Doer' | 'Communicator' | 'Analyst' | 'Creator';
type WS_Option = { id: string; label: string; trait: WS_Trait };
type WS_Question = { id: string; title: string; options: WS_Option[] };
type WS_Answers = Record<string, string>;

const WS_QUESTIONS: WS_Question[] = [
  {
    id: 'W1',
    title: 'A new project lands on your desk. What do you do first?',
    options: [
      { id: 'A', label: 'Draft a quick timeline and milestones', trait: 'Planner' },
      { id: 'B', label: 'Start tackling the first actionable task', trait: 'Doer' },
      { id: 'C', label: 'Ping stakeholders to clarify expectations', trait: 'Communicator' },
      { id: 'D', label: 'Outline unknowns and research them', trait: 'Analyst' },
    ],
  },
  {
    id: 'W2',
    title: 'Your manager gives you a vague goal.',
    options: [
      { id: 'A', label: 'Ask questions and turn it into a clear brief', trait: 'Communicator' },
      { id: 'B', label: 'Break it into a checklist and get moving', trait: 'Doer' },
      { id: 'C', label: 'Map risks, dependencies, and success metrics', trait: 'Planner' },
      { id: 'D', label: 'Collect examples and benchmark options', trait: 'Analyst' },
    ],
  },
  {
    id: 'W3',
    title: 'Your favorite type of task is…',
    options: [
      { id: 'A', label: 'Shipping things and closing loops', trait: 'Doer' },
      { id: 'B', label: 'Designing visuals or writing copy', trait: 'Creator' },
      { id: 'C', label: 'Creating systems and SOPs', trait: 'Planner' },
      { id: 'D', label: 'Finding insights in data', trait: 'Analyst' },
    ],
  },
  {
    id: 'W4',
    title: 'A teammate missed a deadline.',
    options: [
      { id: 'A', label: 'Coordinate a quick call and reset expectations', trait: 'Communicator' },
      { id: 'B', label: 'Replan timeline with contingencies', trait: 'Planner' },
      { id: 'C', label: 'Jump in and help finish the task', trait: 'Doer' },
      { id: 'D', label: 'Analyze the root cause to prevent repeats', trait: 'Analyst' },
    ],
  },
  {
    id: 'W5',
    title: 'Which tool do you enjoy most?',
    options: [
      { id: 'A', label: 'Trello/Asana/ClickUp', trait: 'Planner' },
      { id: 'B', label: 'Canva/Figma/GDocs', trait: 'Creator' },
      { id: 'C', label: 'Sheets/Excel/Looker', trait: 'Analyst' },
      { id: 'D', label: 'Slack/Email/CRM', trait: 'Communicator' },
    ],
  },
  {
    id: 'W6',
    title: 'Feedback from others most often says you are…',
    options: [
      { id: 'A', label: 'Organized and reliable', trait: 'Planner' },
      { id: 'B', label: 'Clear and empathetic', trait: 'Communicator' },
      { id: 'C', label: 'Fast and hands-on', trait: 'Doer' },
      { id: 'D', label: 'Insightful and logical', trait: 'Analyst' },
    ],
  },
  {
    id: 'W7',
    title: 'You’re given a blank page task.',
    options: [
      { id: 'A', label: 'Sketch an outline and iterate visually', trait: 'Creator' },
      { id: 'B', label: 'Define scope and acceptance criteria', trait: 'Planner' },
      { id: 'C', label: 'Draft the first version to get feedback', trait: 'Doer' },
      { id: 'D', label: 'Research prior art and patterns', trait: 'Analyst' },
    ],
  },
  {
    id: 'W8',
    title: 'How do you prefer to communicate progress?',
    options: [
      { id: 'A', label: 'Short async updates with blockers + next steps', trait: 'Communicator' },
      { id: 'B', label: 'Dashboard/metrics that auto-update', trait: 'Analyst' },
      { id: 'C', label: 'A simple plan with dates and owners', trait: 'Planner' },
      { id: 'D', label: 'A demo or mockup people can see', trait: 'Creator' },
    ],
  },
  {
    id: 'W9',
    title: 'What motivates you most?',
    options: [
      { id: 'A', label: 'Seeing things shipped and users happy', trait: 'Doer' },
      { id: 'B', label: 'Solving hard problems elegantly', trait: 'Analyst' },
      { id: 'C', label: 'Turning ideas into something tangible', trait: 'Creator' },
      { id: 'D', label: 'Keeping everyone aligned and calm', trait: 'Communicator' },
    ],
  },
  {
    id: 'W10',
    title: 'Your desk vibe is…',
    options: [
      { id: 'A', label: 'Neat folders and calendars', trait: 'Planner' },
      { id: 'B', label: 'Post-its and quick notes', trait: 'Doer' },
      { id: 'C', label: 'Moodboards and sketches', trait: 'Creator' },
      { id: 'D', label: 'Charts and queries', trait: 'Analyst' },
    ],
  },
  {
    id: 'W11',
    title: 'When priorities clash, you…',
    options: [
      { id: 'A', label: 'Clarify trade-offs with stakeholders', trait: 'Communicator' },
      { id: 'B', label: 'Reprioritize with a new plan', trait: 'Planner' },
      { id: 'C', label: 'Knock out the quickest wins first', trait: 'Doer' },
      { id: 'D', label: 'Evaluate impact using data', trait: 'Analyst' },
    ],
  },
  {
    id: 'W12',
    title: 'Pick the statement that fits you best:',
    options: [
      { id: 'A', label: 'I love structure', trait: 'Planner' },
      { id: 'B', label: 'I love momentum', trait: 'Doer' },
      { id: 'C', label: 'I love clarity', trait: 'Communicator' },
      { id: 'D', label: 'I love patterns', trait: 'Analyst' },
    ],
  },
];

const WS_DESCRIPTIONS: Record<
  WS_Trait,
  { title: string; text: string; suggested: string[] }
> = {
  Planner: {
    title: 'Planner',
    text:
      'You bring order and predictability. You break work into clear steps, define owners and dates, and prevent surprises.',
    suggested: ['Project Coordinator', 'Operations Specialist', 'PM Assistant'],
  },
  Doer: {
    title: 'Doer',
    text: 'You create momentum. You like to ship, close loops, and turn ideas into reality fast.',
    suggested: ['Virtual Assistant', 'Implementation Specialist', 'Support Ops'],
  },
  Communicator: {
    title: 'Communicator',
    text:
      'You keep people aligned. You clarify expectations, write clearly, and handle stakeholders with empathy.',
    suggested: ['Account Coordinator', 'Customer Success', 'Community Manager'],
  },
  Analyst: {
    title: 'Analyst',
    text: 'You discover signal in noise. You love spreadsheets, metrics, and testing assumptions.',
    suggested: ['Data Assistant', 'Ops Analyst', 'Research Assistant'],
  },
  Creator: {
    title: 'Creator',
    text:
      'You turn stories into visuals or words. You enjoy mockups, copy, and making things feel polished.',
    suggested: ['Content Specialist', 'Design Assistant', 'Marketing VA'],
  },
};

const WorkstyleTest: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<WS_Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const total = WS_QUESTIONS.length;

  const progress = useMemo(() => {
    const answered = Object.keys(answers).length;
    return Math.round((answered / total) * 100);
  }, [answers, total]);

  const select = (qid: string, optId: string) => setAnswers((s) => ({ ...s, [qid]: optId }));
  const go = (dir: -1 | 1) => {
    setCurrent((i) => Math.min(Math.max(0, i + dir), total - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const computeProfile = () => {
    const counts: Record<WS_Trait, number> = {
      Planner: 0,
      Doer: 0,
      Communicator: 0,
      Analyst: 0,
      Creator: 0,
    };
    for (const q of WS_QUESTIONS) {
      const picked = answers[q.id];
      const op = q.options.find((o) => o.id === picked);
      if (op) counts[op.trait] += 1;
    }
    const sorted = (Object.keys(counts) as WS_Trait[]).sort((a, b) => counts[b] - counts[a]);
    const totalPicks = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return { counts, sorted, totalPicks };
  };

  const result = useMemo(() => (submitted ? computeProfile() : null), [submitted, answers]);

  const q = WS_QUESTIONS[current];
  const picked = answers[q?.id];

  return (
    <>
      {!started ? (
        <div className="stx-intro">
          <h1 className="stx-title">Jobseeker Workstyle Test</h1>
          <p className="stx-subtitle">12 quick single-choice questions to reveal your primary working style.</p>

          <div className="stx-meta">
            <div className="stx-chip"><FaClock /> ~7 min</div>
            <div className="stx-chip"><FaGlobe /> English</div>
            <div className="stx-chip"><FaShieldAlt /> No external tools</div>
          </div>

          <ul className="stx-guidelines">
            <li>Choose the option that fits you best — there are no “right” or “wrong” answers.</li>
            <li>At the end you’ll see your top styles and role ideas.</li>
          </ul>

          <button className="stx-button" onClick={() => setStarted(true)}>Start</button>
        </div>
      ) : !submitted ? (
        <>
          <div className="stx-topbar">
            <div className="stx-topbar__left">
              <div className="stx-progress">
                <div className="stx-progress__bar" style={{ width: `${progress}%` }} />
              </div>
              <div className="stx-progress__text">{progress}% completed</div>
            </div>
            <div className="stx-topbar__right">
              <span className="stx-count">Question {current + 1} / {total}</span>
            </div>
          </div>

          <div className="stx-qcard" role="group" aria-labelledby={`wq-${q.id}`}>
            <div className="stx-qhead">
              <span className="stx-cat">Workstyle</span>
            </div>
            <h3 id={`wq-${q.id}`} className="stx-qtitle">{q.title}</h3>

            <div className="stx-options">
              {q.options.map((op) => {
                const checked = picked === op.id;
                return (
                  <label key={op.id} className={`stx-opt ${checked ? 'is-checked' : ''}`}>
                    <input
                      type="radio"
                      name={q.id}
                      checked={checked}
                      onChange={() => select(q.id, op.id)}
                    />
                    <span className="stx-opt__fake" />
                    <span className="stx-opt__text">{op.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="stx-nav">
              <button className="stx-button stx-ghost" onClick={() => go(-1)} disabled={current === 0}>
                Prev
              </button>
              {current < total - 1 ? (
                <button className="stx-button" onClick={() => go(1)}>Next</button>
              ) : (
                <button
                  className="stx-button"
                  onClick={() => {
                    const unanswered = WS_QUESTIONS.filter((q) => !answers[q.id]).length;
                    if (unanswered > 0) {
                      const ok = window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`);
                      if (!ok) return;
                    }
                    setSubmitted(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  See my result
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="stx-result">
          <div className="stx-rescore">
            <FaUserCheck className="stx-res-ico ok" />
            <div className="stx-resline">
              <div className="stx-res-main">
                Your primary style: <strong>{result!.sorted[0]}</strong>
              </div>
              <div className="stx-res-sub">
                Secondary: {result!.sorted[1]} • Tertiary: {result!.sorted[2]}
              </div>
            </div>
          </div>

          <div className="stx-cats">
            {result!.sorted.map((t) => {
              const pct = Math.round((result!.counts[t] / result!.totalPicks) * 100);
              return (
                <div key={t} className="stx-catline">
                  <div className="stx-catline__head">
                    <span className="stx-cat">{t}</span>
                    <span className="stx-catline__pct">{pct}%</span>
                  </div>
                  <div className="stx-catline__bar">
                    <div className="stx-catline__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="stx-capability">{WS_DESCRIPTIONS[t].text}</div>
                </div>
              );
            })}
          </div>

          <div className="stx-summary">
            <h3>Suggested roles to explore</h3>
            <ul>
              {[result!.sorted[0], result!.sorted[1]].map((t) => (
                <li key={t}>
                  <strong>{WS_DESCRIPTIONS[t].title}:</strong> {WS_DESCRIPTIONS[t].suggested.join(', ')}
                </li>
              ))}
            </ul>
            <p className="stx-note2">
              Use your style in your profile headline (e.g., “{result!.sorted[0]} {result!.sorted[1]} — ready to help your team move faster”).
            </p>
          </div>

          <div className="stx-actions">
            <button className="stx-button stx-ghost" onClick={() => { setSubmitted(false); setCurrent(0); }}>
              Review answers
            </button>
            <button
              className="stx-button"
              onClick={() => {
                setStarted(false);
                setCurrent(0);
                setAnswers({});
                setSubmitted(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Retake
            </button>
          </div>
        </div>
      )}
    </>
  );
};
