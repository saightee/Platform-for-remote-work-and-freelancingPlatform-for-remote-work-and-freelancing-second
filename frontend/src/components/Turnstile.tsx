import React, { useEffect, useRef } from 'react';

type Props = {
  siteKey: string;
  onVerify: (token?: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset?: (wid?: string) => void;
      remove?: (wid?: string) => void;
      // ready оставляем в типах на всякий, но НЕ используем в коде
      ready?: (cb: () => void) => void;
    };
  }
}

const Turnstile: React.FC<Props> = ({ siteKey, onVerify, onError, onExpire, theme = 'auto' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Загружаем скрипт один раз (explicit render) и НЕ используем turnstile.ready()
  useEffect(() => {
    const id = 'cf-turnstile-script';
    if (!document.getElementById(id)) {
      const s = document.createElement('script');
      s.id = id;
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;          // достаточно async; defer не нужен
      document.head.appendChild(s);
    }
  }, []);

  // Рендерим виджет после загрузки скрипта (или сразу, если уже загружен)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // пустой/пробельный ключ — не рендерим (иначе валится ошибка sitekey)
    const trimmedKey = String(siteKey ?? '').trim();
    if (!trimmedKey) return;

    const render = () => {
      if (!window.turnstile || !ref.current) return;

      // удаляем предыдущий инстанс если был
      if (widgetIdRef.current) {
        try { window.turnstile.remove?.(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(ref.current, {
        // ВАЖНО: жёстко приводим к строке
        sitekey: String(trimmedKey),
        theme,
        callback: (t: string) => onVerify?.(t),
        'error-callback': () => { onError?.(); onVerify?.(undefined); },
        'timeout-callback': () => { onExpire?.(); onVerify?.(undefined); },
        'expired-callback': () => { onExpire?.(); onVerify?.(undefined); },
      });
    };

    // если уже загружен — рендерим сразу; иначе — по событию load
    const script = document.getElementById('cf-turnstile-script') as HTMLScriptElement | null;
    let onLoad: (() => void) | null = null;

    if (window.turnstile) {
      render();
    } else if (script) {
      onLoad = () => render();
      script.addEventListener('load', onLoad);
    }

    return () => {
      if (onLoad && script) script.removeEventListener('load', onLoad);
      if (widgetIdRef.current) {
        try { window.turnstile?.remove?.(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, onVerify, onError, onExpire]);

  return <div ref={ref} className="cf-turnstile" />;
};

export default Turnstile;
