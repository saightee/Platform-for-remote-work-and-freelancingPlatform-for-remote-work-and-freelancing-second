import React, { useEffect, useRef } from 'react';

type Props = {
  siteKey: string;
  onVerify: (token?: string) => void;   // будет вызван с токеном
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (wid?: string) => void;
      remove: (wid?: string) => void;
      ready: (cb: () => void) => void;
    };
  }
}

const Turnstile: React.FC<Props> = ({ siteKey, onVerify, onError, onExpire, theme = 'auto' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // грузим скрипт один раз
  useEffect(() => {
    const id = 'cf-turnstile-script';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  // рендерим виджет
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mount = () => {
      if (!window.turnstile) return;
      if (widgetIdRef.current) window.turnstile.remove(widgetIdRef.current);

      widgetIdRef.current = window.turnstile.render(el, {
        sitekey: siteKey,
        theme,
        callback: (t: string) => onVerify(t),
        'error-callback': () => { onError?.(); onVerify(undefined); },
        'timeout-callback': () => { onExpire?.(); onVerify(undefined); },
      });
    };

    // turnstile.ready может не существовать первой тикой – страхуемся
    const ready = window.turnstile?.ready ?? ((cb: () => void) => cb());
    ready(mount);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, onVerify, onError, onExpire]);

  return <div ref={ref} className="cf-turnstile" />;
};

export default Turnstile;
