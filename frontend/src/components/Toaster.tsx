import { useEffect, useRef, useState } from 'react';
import '../styles/toast.css';

type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

type Listener = (t: ToastItem) => void;
const listeners = new Set<Listener>();

export const _emitToast = (t: ToastItem) => {
  listeners.forEach(l => l(t));
};

export default function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, any>>({});

  useEffect(() => {
    const onToast: Listener = (t) => {
      setItems(prev => [...prev, t]);
      const timer = setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== t.id));
      }, t.duration);
      timers.current[t.id] = timer;
    };
    listeners.add(onToast);
    return () => {
      listeners.delete(onToast);
      Object.values(timers.current).forEach(clearTimeout);
      timers.current = {};
    };
  }, []);

  const close = (id: string) => {
    setItems(prev => prev.filter(x => x.id !== id));
    const tm = timers.current[id];
    if (tm) clearTimeout(tm);
    delete timers.current[id];
  };

  return (
    <div className="tst-wrap" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`tst ${t.type}`}>
          <div className="tst-msg">{t.message}</div>
          <button className="tst-x" onClick={() => close(t.id)} aria-label="Close">×</button>
        </div>
      ))}
    </div>
  );
}
