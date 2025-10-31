import React, { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import {
  adminFindJobPostsByTitle,
  adminListApplicationsForJob,
  getAdminChatHistory,
} from '../services/api';
import '../styles/AdminChatTab.css'; // CSS с act-* классами
import Loader from '../components/Loader'; // если путь другой — поправь импорт

// localStorage keys
const LS_APP_ID = 'admin_chat_jobApplicationId';
const LS_JOB_ID = 'admin_chat_lastJobId';
const LS_TITLE = 'admin_chat_lastTitle';

// ===== Types (минимум, который используем тут) =====
type Role = 'jobseeker' | 'employer' | 'admin' | 'moderator' | string;

type UserMini = {
  id?: string;
  username?: string;
  email?: string;
  role?: Role;
} | null | undefined;

type Message = {
  id: string | number;
  content: string;
  created_at: string;
  sender_id?: string | number;
  sender?: UserMini;
  recipient?: UserMini;
};

type FoundJob = {
  id: string;
  title: string;
  employer?: { username?: string; email?: string } | null;
};

// ===== Utils =====
const pad = (n: number) => String(n).padStart(2, '0');
const formatTs = (iso: string) => {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

// ===== Component =====
const AdminChatTab: React.FC = () => {
  // ----- Шаг 1: Поиск вакансии -----
  const [titleQuery, setTitleQuery] = useState<string>(() => {
    try { return localStorage.getItem(LS_TITLE) || ''; } catch { return ''; }
  });
  const [jobs, setJobs] = useState<Array<FoundJob>>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // ----- Шаг 2: Выбор вакансии → подгрузка откликов -----
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    try { return localStorage.getItem(LS_JOB_ID) || ''; } catch { return ''; }
  });
  const [apps, setApps] = useState<Array<{ applicationId: string; username?: string; email?: string }>>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // ----- Шаг 3: Выбор отклика → загрузка чата -----
  const [currentId, setCurrentId] = useState<string>(() => {
    try { return localStorage.getItem(LS_APP_ID) || ''; } catch { return ''; }
  });

  // История чата (встроенная логика из AdminChatHistory)
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  // Сброс страницы при смене отклика
  useEffect(() => { setPage(1); }, [currentId]);

  // Поиск вакансий при вводе
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = titleQuery.trim();
      try { localStorage.setItem(LS_TITLE, q); } catch {}
      if (!q) { setJobs([]); return; }

      try {
        setJobsLoading(true);
        const list = await adminFindJobPostsByTitle(q);
        const mapped: FoundJob[] = (list || []).map((j: any) => ({
          id: String(j.id),
          title: j.title,
          employer: j.employer
            ? { username: j.employer.username, email: j.employer.email }
            : (j.user ? { username: j.user.username, email: j.user.email } : null),
        }));
        setJobs(mapped);
      } finally {
        setJobsLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [titleQuery]);

  // При выборе вакансии — грузим отклики
  useEffect(() => {
    const run = async () => {
      if (!selectedJobId) { setApps([]); return; }
      try {
        setAppsLoading(true);
        const list = await adminListApplicationsForJob(selectedJobId);
        setApps((list || []).map((a: any) => ({
          applicationId: String(a.applicationId || a.id),
          username: a.username,
          email: a.email,
        })));
      } finally {
        setAppsLoading(false);
      }
    };
    run();
  }, [selectedJobId]);

  // Загрузка истории чата по текущему appId + пагинация
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!currentId) { setItems([]); setTotal(0); return; }
      setLoading(true);
      setErrText(null);
      try {
        const res = await getAdminChatHistory(currentId, { page, limit });
        if (!mounted) return;
        const sorted = (res.data || []).slice().sort((a: Message, b: Message) =>
          a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
        );
        setItems(sorted);
        setTotal(res.total || 0);
      } catch (e: any) {
        if (!mounted) return;
        const err = e as AxiosError<{ statusCode?: number; message?: string }>;
        const code = err.response?.status;
        if (code === 401) {
          setErrText('Your admin session has expired. Please log in again.');
        } else if (code === 404) {
          setErrText('Job application not found or has no chat history.');
        } else {
          setErrText(err.response?.data?.message || 'Failed to load chat history.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentId, page, limit]);

  // Выбор отклика → открыть чат и запомнить
  const loadChat = (appId: string) => {
    setCurrentId(appId);
    try { localStorage.setItem(LS_APP_ID, appId); } catch {}
  };

  // Выбор вакансии → загрузить отклики и запомнить
  const onPickJob = (jobId: string) => {
    setSelectedJobId(jobId);
    try { localStorage.setItem(LS_JOB_ID, jobId); } catch {}
    setCurrentId('');
    try { localStorage.removeItem(LS_APP_ID); } catch {}
  };

  // Автораскрытие селекта вакансий
  const jobSelectSize = Math.min(8, (jobs?.length || 0) + 1);

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  const employerLabel = selectedJob
    ? (selectedJob.employer?.username || selectedJob.employer?.email || '')
    : '';

  const first = items[0];
  const senderStr  = first ? `${first.sender?.username || '—'} <${first.sender?.email || '—'}> [${first.sender?.role || '—'}]` : '—';
  const recipStr   = first ? `${first.recipient?.username || '—'} <${first.recipient?.email || '—'}> [${first.recipient?.role || '—'}]` : '—';

  return (
    <div className="act-card">
      {/* Шапка карточки чата с метаданными при наличии currentId */}
      {currentId && (
        <div className="ach-head">
          <div className="ach-title">Chat History</div>
          <div className="ach-meta">
            <div><span className="ach-cap">Job Application:</span> <code>{currentId}</code></div>
            <div><span className="ach-cap">From:</span> {senderStr}</div>
            <div><span className="ach-cap">To:</span> {recipStr}</div>
          </div>
        </div>
      )}

      {/* Шаг 1: поиск вакансии */}
      <div className="act-search">
        <label className="act-label">Find Job Post by Title:</label>
        <input
          type="text"
          value={titleQuery}
          onChange={e => setTitleQuery(e.target.value)}
          placeholder="Start typing job title…"
          className="act-input"
        />

        {titleQuery.trim() && (
          <select
            value={selectedJobId}
            onChange={e => onPickJob(e.target.value)}
            size={jobs.length ? jobSelectSize : 1}
            className="act-select"
          >
            <option value="">
              {jobsLoading ? 'Ищу вакансии…' : `Найдено: ${jobs.length}`}
            </option>

            {jobs.map(j => {
              const emp = j.employer?.username || j.employer?.email;
              return (
                <option key={j.id} value={j.id}>
                  {j.title}{emp ? ` — ${emp}` : ''}
                </option>
              );
            })}
          </select>
        )}

        {selectedJobId && selectedJob && (
          <div className="act-note">
            Job Post: <b>{selectedJob.title}</b>
            {employerLabel ? <span className="act-mute">{' '} / {employerLabel}</span> : null}
          </div>
        )}
      </div>

      {/* Шаг 2: список откликов */}
      {selectedJobId && (
        <div className="act-apps">
          <label className="act-label">Select Job Application:</label>
          {appsLoading ? (
            <div className="act-mute">Loading applications…</div>
          ) : apps.length === 0 ? (
            <div className="act-mute">No applications found for this job.</div>
          ) : (
            <select
              onChange={e => loadChat(e.target.value)}
              defaultValue=""
              className="act-select"
            >
              <option value="" disabled>
                Pick an application… ({apps.length})
              </option>
              {apps.map(a => (
                <option key={a.applicationId} value={a.applicationId}>
                  {a.username || '—'}{a.email ? ` <${a.email}>` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Шаг 3: чат */}
      {currentId ? (
        <>
          <div className="ach-controls">
            <div className="ach-counter">Total messages: <b>{total}</b></div>
            <div className="ach-pager">
              <button
                className="ach-btn"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                Prev
              </button>
              <span className="ach-page">Page {page} / {totalPages}</span>
              <button
                className="ach-btn"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="ach-loading">
              {Loader ? <Loader /> : <span className="ach-spinner" aria-hidden />}
            </div>
          ) : errText ? (
            <div className="ach-error">{errText}</div>
          ) : items.length === 0 ? (
            <div className="ach-empty">No messages.</div>
          ) : (
            <div className="ach-list">
              {items.map(m => (
                <div key={String(m.id)} className="ach-item">
                  <div className="ach-row">
                    <div className="ach-author">
                      <span className={`ach-badge ach-${m.sender?.role || 'user'}`}>{m.sender?.role || 'user'}</span>
                      <b>{m.sender?.username || m.sender_id}</b>
                      <span className="ach-email">&lt;{m.sender?.email || 'unknown'}&gt;</span>
                    </div>
                    <div className="ach-time">{formatTs(m.created_at)}</div>
                  </div>
                  <div className="ach-content">{m.content}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="act-mute">
          Start by typing a job title, pick a job post, then choose an application to view the chat.
        </div>
      )}
    </div>
  );
};

export default AdminChatTab;
