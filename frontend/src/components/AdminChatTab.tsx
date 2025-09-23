import React, { useEffect, useState } from 'react';
import AdminChatHistory from './AdminChatHistory';
import { adminFindJobPostsByTitle, adminListApplicationsForJob } from '../services/api';

const LS_APP_ID = 'admin_chat_jobApplicationId';
const LS_JOB_ID = 'admin_chat_lastJobId';
const LS_TITLE = 'admin_chat_lastTitle';

type FoundJob = {
  id: string;
  title: string;
  employer?: { username?: string; email?: string } | null;
};

const AdminChatTab: React.FC = () => {
  // шаг 1 — поиск вакансии по title
  const [titleQuery, setTitleQuery] = useState<string>(() => {
    try { return localStorage.getItem(LS_TITLE) || ''; } catch { return ''; }
  });
  const [jobs, setJobs] = useState<Array<FoundJob>>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // шаг 2 — выбор вакансии → подгрузка откликов
  const [selectedJobId, setSelectedJobId] = useState<string>(() => {
    try { return localStorage.getItem(LS_JOB_ID) || ''; } catch { return ''; }
  });
  const [apps, setApps] = useState<Array<{ applicationId: string; username?: string; email?: string }>>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // шаг 3 — выбранный отклик → показываем чат
  const [currentId, setCurrentId] = useState<string>('');

  // восстановление последнего jobApplicationId (как раньше)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_APP_ID);
      if (saved) setCurrentId(saved);
    } catch {}
  }, []);

  // поиск вакансий при вводе
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = titleQuery.trim();
      try { localStorage.setItem(LS_TITLE, q); } catch {}
      if (!q) { setJobs([]); return; }

      try {
        setJobsLoading(true);
        const list = await adminFindJobPostsByTitle(q);
        // бережно достаем employer, если бэк отдаёт
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

  // при выборе вакансии — грузим отклики
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

  // выбрать отклик → открыть чат и запомнить
  const loadChat = (appId: string) => {
    setCurrentId(appId);
    try { localStorage.setItem(LS_APP_ID, appId); } catch {}
  };

  // выбрать вакансию → загрузить отклики и запомнить
  const onPickJob = (jobId: string) => {
    setSelectedJobId(jobId);
    try { localStorage.setItem(LS_JOB_ID, jobId); } catch {}
    // сбросим выбранный чат при смене вакансии
    setCurrentId('');
    try { localStorage.removeItem(LS_APP_ID); } catch {}
  };

  // сколько показывать строк у селекта (автораскрытие)
  const jobSelectSize = Math.min(8, (jobs?.length || 0) + 1);

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  const employerLabel = selectedJob
    ? (selectedJob.employer?.username || selectedJob.employer?.email || '')
    : '';

  return (
    <div>
      {/* Шаг 1: поиск вакансии */}
      <div style={{ display:'grid', gap:8, marginBottom:12 }}>
        <label style={{ fontWeight:800 }}>Find Job Post by Title:</label>
        <input
          type="text"
          value={titleQuery}
          onChange={e => setTitleQuery(e.target.value)}
          placeholder="Start typing job title…"
          style={{ minWidth:260, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px' }}
        />

        {/* селект показываем, когда есть хоть какой-то ввод */}
        {titleQuery.trim() && (
          <select
            value={selectedJobId}
            onChange={e => onPickJob(e.target.value)}
            size={jobs.length ? jobSelectSize : 1} // авто-раскрытие при наличии результатов
            style={{
              border:'1px solid #e5e7eb',
              borderRadius:8,
              padding:'8px 10px',
              width:'100%',
            }}
          >
            <option value="">
              {jobsLoading
                ? 'Ищу вакансии…'
                : `Найдено: ${jobs.length}`}
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

        {/* выбранный job — строка-подтверждение (удобно при длинном списке) */}
        {selectedJobId && selectedJob && (
          <div style={{ fontSize:13, color:'#374151' }}>
            Job Post: <b>{selectedJob.title}</b>
            {employerLabel ? <span style={{ color:'#6b7280' }}>{' '} / {employerLabel}</span> : null}
          </div>
        )}
      </div>

      {/* Шаг 2: список откликов */}
      {selectedJobId && (
        <div style={{ display:'grid', gap:8, marginBottom:12 }}>
          <label style={{ fontWeight:800 }}>Select Job Application:</label>
          {appsLoading ? (
            <div style={{ color:'#6b7280' }}>Loading applications…</div>
          ) : apps.length === 0 ? (
            <div style={{ color:'#6b7280' }}>No applications found for this job.</div>
          ) : (
            <select
              onChange={e => loadChat(e.target.value)}
              defaultValue=""
              style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px' }}
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
        <AdminChatHistory jobApplicationId={currentId} pageSize={10} />
      ) : (
        <div style={{ color:'#6b7280' }}>
          Start by typing a job title, pick a job post, then choose an application to view the chat.
        </div>
      )}
    </div>
  );
};

export default AdminChatTab;
