import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Category } from '@types';
import { getCategoryIcon } from '../constants/categoryIcons';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import '../styles/categories-carousel.css';


type Props = {
  categories: Category[];
  title?: string;
  subtitle?: string;
};

const useItemsPerPage = () => {
  const [ipp, setIpp] = useState(10); // desktop: 10 (2x5), mobile: 2 (как у талантов)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const apply = () => setIpp(mq.matches ? 2 : 10);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return ipp;
};

const CategoriesShowcase: React.FC<Props> = ({
  categories,
  title = 'Browse by category',
  subtitle = "Find the job that's perfect for you. about 800+ new jobs everyday",
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const itemsPerPage = useItemsPerPage();

  // Разбиваем категории по страницам (10 на десктопе / 2 на мобиле)
  const pages = useMemo(() => {
    const out: Category[][] = [];
    for (let i = 0; i < categories.length; i += itemsPerPage) {
      out.push(categories.slice(i, i + itemsPerPage));
    }
    return out;
  }, [categories, itemsPerPage]);

  const [page, setPage] = useState(0);
  const maxPage = Math.max(0, pages.length - 1);

  // синхронизация индикатора со скроллом (айфоны любят нативный скролл)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      if (idx !== page) setPage(idx);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [page]);

  // при изменении кол-ва страниц — ограничиваем текущую и доскролливаем
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const clamped = Math.min(page, maxPage);
    if (clamped !== page) setPage(clamped);
    // держим нужный слайд после поворота экрана/ресайза
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'auto' });
  }, [maxPage]);

  const goTo = (i: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(i, maxPage));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
    setPage(target);
  };

  return (
 <div className="catc">
  <h2 className="catc__title">{title}</h2>
  <p className="catc__subtitle">{subtitle}</p>

  <div className="catc__shell">
    <button className="catc__arrow catc__arrow--left" onClick={() => goTo(page - 1)} disabled={page === 0} aria-label="Previous">
      <FaChevronLeft />
    </button>

    <div className="catc__viewport" ref={viewportRef}>
      <div className="catc__track">
        {pages.map((group, idx) => (
          <div className="catc__page" key={idx} aria-roledescription="slide">
            {group.map((cat) => {
              const Icon = getCategoryIcon(cat.name);
              return (
                <Link key={cat.id} to={`/find-job?category_id=${cat.id}`} className="catc__item">
                  <div className="catc__icon"><Icon /></div>
                  <div className="catc__text">
                    <div className="catc__name">{cat.name}</div>
                    <div className="catc__link">Browse Jobs</div>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>

    <button className="catc__arrow catc__arrow--right" onClick={() => goTo(page + 1)} disabled={page === maxPage} aria-label="Next">
      <FaChevronRight />
    </button>
  </div>

  <div className="catc__dots" role="tablist" aria-label="Categories pages">
    {Array.from({ length: maxPage + 1 }).map((_, i) => (
      <button
        key={i}
        role="tab"
        aria-selected={page === i}
        aria-label={`Go to slide ${i + 1}`}
        className={`catc__dot ${page === i ? 'catc__dot--active' : ''}`}
        onClick={() => goTo(i)}
      />
    ))}
  </div>
</div>

  );
};

export default CategoriesShowcase;
