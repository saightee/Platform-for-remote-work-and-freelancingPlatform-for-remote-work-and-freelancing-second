import React, { useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import { getAdminChatHistory } from '../services/api';
import { Message } from '@types';
import '../styles/AdminChatHistory.css';
import Loader from '../components/Loader'; // если у тебя Loader в другом пути — поправь импорт

type Props = {
  jobApplicationId: string;
  pageSize?: number; // default 10
};

const formatTs = (iso: string) => {
  try {
    const d = new Date(iso);
    // YYYY-MM-DD HH:mm
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return iso;
  }
};

const AdminChatHistory: React.FC<Props> = ({ jobApplicationId, pageSize = 10 }) => {
  const [page, setPage] = useState(1);
  const [limit] = useState(pageSize);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [errText, setErrText] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  useEffect(() => {
    setPage(1); // при смене собеса — на первую страницу
  }, [jobApplicationId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!jobApplicationId) return;
      setLoading(true);
      setErrText(null);
      try {
        const res = await getAdminChatHistory(jobApplicationId, { page, limit });
        if (!mounted) return;
        // сервер и так отдаёт ASC, но на всякий случай отсортируем
        const sorted = (res.data || []).slice().sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
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
  }, [jobApplicationId, page, limit]);

  const first = items[0];
  const senderStr = first ? `${first.sender?.username || '—'} <${first.sender?.email || '—'}> [${first.sender?.role || '—'}]` : '—';
  const recipStr  = first ? `${first.recipient?.username || '—'} <${first.recipient?.email || '—'}> [${first.recipient?.role || '—'}]` : '—';

  return (
    <div className="ach-card">
      <div className="ach-head">
        <div className="ach-title">Chat History</div>
        <div className="ach-meta">
          <div><span className="ach-cap">Job Application:</span> <code>{jobApplicationId}</code></div>
          <div><span className="ach-cap">From:</span> {senderStr}</div>
          <div><span className="ach-cap">To:</span> {recipStr}</div>
        </div>
      </div>

      <div className="ach-controls">
        <div className="ach-counter">Total messages: <b>{total}</b></div>
        <div className="ach-pager">
          <button className="ach-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Prev</button>
          <span className="ach-page">Page {page} / {totalPages}</span>
          <button className="ach-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>Next</button>
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
            <div key={m.id} className="ach-item">
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
    </div>
  );
};

export default AdminChatHistory;
