import React, { useEffect, useState } from 'react';
import AdminChatHistory from './AdminChatHistory';
import { adminFindJobPostsByTitle, adminListApplicationsForJob } from '../services/api';

const LS_KEY = 'admin_chat_jobApplicationId';

const AdminChatTab: React.FC = () => {
  // шаг 1 — поиск вакансии по title
  const [titleQuery, setTitleQuery] = useState('');
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // шаг 2 — выбор вакансии → подгрузка откликов
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [apps, setApps] = useState<Array<{ applicationId: string; username?: string; email?: string }>>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  // шаг 3 — выбранный отклик → показываем чат
  const [currentId, setCurrentId] = useState<string>('');

  // восстановление последнего jobApplicationId (как раньше)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setCurrentId(saved);
    } catch {}
  }, []);

  // поиск вакансий при вводе
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!titleQuery.trim()) { setJobs([]); return; }
      try {
        setJobsLoading(true);
        const list = await adminFindJobPostsByTitle(titleQuery.trim());
        setJobs(list.map(j => ({ id: String(j.id), title: j.title })));
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
        setApps(list.map(a => ({
          applicationId: String((a as any).applicationId || (a as any).id),
          username: (a as any).username,
          email: (a as any).email,
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
    try { localStorage.setItem(LS_KEY, appId); } catch {}
  };

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
        {jobsLoading ? <div style={{ color:'#6b7280' }}>Searching…</div> : null}
        {jobs.length > 0 && (
          <select
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            style={{ border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px' }}
          >
            <option value="">Select a job…</option>
            {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
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
              <option value="" disabled>Pick an application…</option>
              {apps.map(a => (
                <option key={a.applicationId} value={a.applicationId}>
                  {a.username || '—'} {a.email ? ` <${a.email}>` : ''}
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
