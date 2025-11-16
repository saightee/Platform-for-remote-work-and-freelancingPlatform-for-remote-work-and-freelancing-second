import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    const doScrollTop = () => {
      // 1) основная «скроллящаяся» нода
      const scrollingEl =
        (document.scrollingElement as HTMLElement | null) ||
        (document.documentElement as HTMLElement | null) ||
        (document.body as HTMLElement | null);

      if (scrollingEl) {
        scrollingEl.scrollTop = 0;
      }

      // 2) на всякий случай — и window
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        /* ignore */
      }
    };

    const handleScroll = () => {
      // если есть hash — сначала пытаемся проскроллить к якорю
      if (hash) {
        const id = hash.slice(1); // "#section" -> "section"
        const target = document.getElementById(id);
        if (target) {
          target.scrollIntoView({ behavior: "auto", block: "start" });
          return;
        }
      }

      // якоря нет или hash пуст — просто наверх
      doScrollTop();
    };

    // сразу после смены маршрута
    handleScroll();

    // ещё раз — в следующий кадр (если кто-то проскроллил после рендера)
    const rafId = requestAnimationFrame(handleScroll);

    // и ещё один дубль после стека задач
    const tId = window.setTimeout(handleScroll, 0);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(tId);
    };
  }, [pathname, search, hash]);

  return null;
}
