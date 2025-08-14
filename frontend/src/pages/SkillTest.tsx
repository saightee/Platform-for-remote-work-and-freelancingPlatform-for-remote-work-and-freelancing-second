import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { FaClock, FaCheckCircle, FaTimesCircle, FaStar, FaShieldAlt, FaGlobe, FaEnvelope } from 'react-icons/fa';
import '../styles/skill-test.css';

// ====== Типы
type QType = 'single' | 'multi';
type Option = { id: string; label: string };
type Question = {
  id: string;
  type: QType;
  category: 'Communication' | 'Timezone' | 'Search' | 'Sheets' | 'Ops';
  title: string;
  options: Option[];
  correct: string[]; // массив даже для single
  note?: string;
};
type Answers = Record<string, string[]>;
type Practical = { q21: string; q22: string };

// ====== Данные теста (20 автопроверяемых + 2 практики для ручной оценки)
const QUESTIONS: Question[] = [
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

  // Search / Credibility
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
    correct: ['D'], // допущение: считаем "оба корректны" как итоговый верный вариант
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

  // Ops (productivity / security / SLA / data)
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

const CATEGORIES: Question['category'][] = ['Communication', 'Timezone', 'Search', 'Sheets', 'Ops'];

const SkillTest: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [practical, setPractical] = useState<Practical>({ q21: '', q22: '' });
  const [submitted, setSubmitted] = useState(false);

  const total = QUESTIONS.length;

  const progress = useMemo(() => {
    const answeredCount = QUESTIONS.reduce((n, q) => (answers[q.id]?.length ? n + 1 : n), 0);
    return Math.round((answeredCount / total) * 100);
  }, [answers, total]);

  const onSingle = (qid: string, opt: string) => {
    setAnswers((s) => ({ ...s, [qid]: [opt] }));
  };

  const onMulti = (qid: string, opt: string) => {
    setAnswers((s) => {
      const prev = new Set(s[qid] || []);
      if (prev.has(opt)) prev.delete(opt);
      else prev.add(opt);
      return { ...s, [qid]: Array.from(prev) };
    });
  };

  const go = (dir: -1 | 1) => {
    setCurrent((i) => Math.min(Math.max(0, i + dir), total - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const computeScore = () => {
    let score = 0;
    const perCat: Record<Question['category'], { ok: number; all: number }> = {
      Communication: { ok: 0, all: 0 },
      Timezone: { ok: 0, all: 0 },
      Search: { ok: 0, all: 0 },
      Sheets: { ok: 0, all: 0 },
      Ops: { ok: 0, all: 0 },
    };

    for (const q of QUESTIONS) {
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
    // Разрешаем сдачу даже если что-то не отмечено — но предупредим
    const unanswered = QUESTIONS.filter((q) => !(answers[q.id] && answers[q.id].length)).length;
    if (unanswered > 0) {
      const ok = window.confirm(
        `You have ${unanswered} unanswered question(s). Submit anyway?`
      );
      if (!ok) return;
    }
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ====== Рендер
  const q = QUESTIONS[current];
  const currentValue = answers[q?.id] || [];

  return (
    <div className="stx-page">
      <Header />

      <div className="stx-shell">
        <div className="stx-card">
          {!started ? (
            <div className="stx-intro">
              <h1 className="stx-title">General VA Skill Test</h1>
              <p className="stx-subtitle">20 auto-graded questions + 2 short practicals (manual review).</p>

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

              {/* Практика (не влияет на автосчёт) */}
              <div className="stx-practical">
                <h4 className="stx-pr-title">Optional practical (manual review)</h4>
                <div className="stx-row">
                  <label className="stx-label">Q21. Two-sentence status update</label>
                  <textarea
                    className="stx-textarea"
                    placeholder="Write 1–2 sentences…"
                    rows={3}
                    value={practical.q21}
                    onChange={(e) => setPractical((p) => ({ ...p, q21: e.target.value }))}
                  />
                </div>
                <div className="stx-row">
                  <label className="stx-label">Q22. SOP micro-checklist (4–6 steps)</label>
                  <textarea
                    className="stx-textarea"
                    placeholder="List 4–6 steps…"
                    rows={4}
                    value={practical.q22}
                    onChange={(e) => setPractical((p) => ({ ...p, q22: e.target.value }))}
                  />
                </div>
                <p className="stx-hint">These answers won’t affect the auto-grade, but you can review them manually.</p>
              </div>
            </>
          ) : (
            // ====== Результаты
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
                  <div className="stx-res-sub">
                    Passing: 16/20 (80%) on the auto-graded part
                  </div>
                </div>
              </div>

              {/* Категории */}
              <div className="stx-cats">
                {CATEGORIES.map((cat) => {
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

              {/* “Скиловое” описание */}
              <div className="stx-summary">
                <h3>What this result says about you</h3>
                <ul>
                  <li>You can communicate clearly and concisely with clients and teammates.</li>
                  <li>You handle time-zone coordination and remote scheduling reliably.</li>
                  <li>You know how to search, validate sources, and share clean links.</li>
                  <li>You’re comfortable with Google Sheets/Excel basics (filters, unique, lookups).</li>
                  <li>You prioritize critical tasks, understand SLAs, and follow security best practices.</li>
                </ul>
                <p className="stx-note2">
                  Want to improve? Focus on any category below 80% and retake the test.
                </p>
              </div>

              {/* Практика — просто показываем, что сохранено локально */}
              {(practical.q21.trim() || practical.q22.trim()) && (
                <div className="stx-pr-out">
                  <h4>Your practical answers (saved locally)</h4>
                  {practical.q21.trim() && (
                    <div className="stx-pr-out__block">
                      <div className="stx-pr-label">Q21</div>
                      <p>{practical.q21}</p>
                    </div>
                  )}
                  {practical.q22.trim() && (
                    <div className="stx-pr-out__block">
                      <div className="stx-pr-label">Q22</div>
                      <pre className="stx-pre">{practical.q22}</pre>
                    </div>
                  )}
                </div>
              )}

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
                    setPractical({ q21: '', q22: '' });
                    setSubmitted(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Retake
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <Copyright />
    </div>
  );
};

export default SkillTest;
