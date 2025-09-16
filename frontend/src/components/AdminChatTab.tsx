import React, { useEffect, useState } from 'react';
import AdminChatHistory from './AdminChatHistory';

const LS_KEY = 'admin_chat_jobApplicationId';

const AdminChatTab: React.FC = () => {
  const [jobApplicationId, setJobApplicationId] = useState('');
  const [currentId, setCurrentId] = useState<string>('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        setJobApplicationId(saved);
        setCurrentId(saved);
      }
    } catch {}
  }, []);

  const onLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const id = jobApplicationId.trim();
    setCurrentId(id);
    try { localStorage.setItem(LS_KEY, id); } catch {}
  };

  return (
    <div>
      <form onSubmit={onLoad} style={{ display:'flex', gap:8, alignItems:'center', marginBottom:12 }}>
        <label htmlFor="adm-chat-id" style={{ fontWeight:800 }}>JobApplication ID:</label>
        <input
          id="adm-chat-id"
          type="text"
          value={jobApplicationId}
          onChange={e => setJobApplicationId(e.target.value)}
          placeholder="enter job_application_id…"
          style={{ flex:1, minWidth:260, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px' }}
        />
        <button type="submit" className="action-button">Load</button>
      </form>

      {currentId ? (
        <AdminChatHistory jobApplicationId={currentId} pageSize={10} />
      ) : (
        <div style={{ color:'#6b7280' }}>Enter a Job Application ID and click <b>Load</b> to view chat history.</div>
      )}
    </div>
  );
};

export default AdminChatTab;
