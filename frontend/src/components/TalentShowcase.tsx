import { useRef, useEffect, useState } from 'react';
import { FaStar, FaStarHalfAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import pers1 from '../assets/pers1.png';
import pers2 from '../assets/pers2.png';
import pers3 from '../assets/pers3.png';
import pers4 from '../assets/pers4.png';
import pers5 from '../assets/pers5.png';
import pers6 from '../assets/pers6.png';
import pers7 from '../assets/pers7.png';
import pers8 from '../assets/pers8.png';
import pers9 from '../assets/pers9.png';
import pers10 from '../assets/pers10.png';
import pers11 from '../assets/pers11.png';
import pers12 from '../assets/pers12.png';



type Talent = {
  name: string;
  img: string;
  role: string;                 // бейдж на карточке
  badge?: 'indigo'|'purple'|'pink'|'blue'|'teal'|'amber';
  skills: string[];             // чипсы
  rating: number;               // 0..5 с половинками
};

interface TalentShowcaseProps {
  talents?: Talent[];
  title?: string;
  subtitle?: string;
}

const fallbackTalents: Talent[] = [
  {
    name: 'Anna L.',
    img: pers4,
    role: 'Digital Marketing',
    badge: 'purple',
    skills: ['SEO', 'Content Strategy'],
    rating: 4.8
  },
  {
    name: 'James T.',
    img: pers2,
    role: 'UX/UI Designer',
    badge: 'indigo',
    skills: ['Figma', 'Adobe XD'],
    rating: 4.6
  },
  {
    name: 'Ligaya P.',
    img: pers5,
    role: 'Content Writer',
    badge: 'pink',
    skills: ['Copywriting', 'Blogging'],
    rating: 4.9
  },
  {
    name: 'Sophia R.',
    img: pers6,
    role: 'Social Media',
    badge: 'blue',
    skills: ['Instagram', 'Facebook Ads'],
    rating: 4.7
  },
  {
    name: 'Ethan W.',
    img: pers3,
    role: 'Email Marketing',
    badge: 'amber',
    skills: ['Mailchimp', 'Automation'],
    rating: 4.8
  },
  {
    name: 'David K.',
    img: pers7,
    role: 'Full Stack Dev',
    badge: 'teal',
    skills: ['React', 'Node.js'],
    rating: 4.7
  },
  {
    name: 'Linda S.',
    img: pers10,
    role: 'Photographer',
    badge: 'purple',
    skills: ['Portrait', 'Landscape'],
    rating: 4.5
  },
  {
    name: 'Oliver M.',
    img: pers8,
    role: 'Data Analyst',
    badge: 'indigo',
    skills: ['Python', 'SQL'],
    rating: 4.9
  },

  // --- added ---
  {
    name: 'Isabella T.',
    img: pers9, // можно заменить на свой аватар
    role: 'Cybersecurity',
    badge: 'teal',
    skills: ['Network Security', 'PenTesting'],
    rating: 4.8
  },
  {
    name: 'Juan B.',
    img: pers1,
    role: 'Cloud Architect',
    badge: 'blue',
    skills: ['AWS', 'Azure'],
    rating: 4.9
  },
  {
    name: 'Mia T.',
    img: pers11, // при желании подменить картинку
    role: 'Product Manager',
    badge: 'amber',
    skills: ['Roadmapping', 'Stakeholder Mgmt'],
    rating: 4.7
  },
  {
    name: 'Artem K.',
    img: pers12, // при желании подменить картинку
    role: 'Frontend Engineer',
    badge: 'purple',
    skills: ['TypeScript', 'React'],
    rating: 4.8
  }
];


const TalentShowcase: React.FC<TalentShowcaseProps> = ({
  talents = fallbackTalents,
  title = 'Featured Talents',
  subtitle = 'Browse top-rated specialists ready to join your next project.'
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(0);

  // пересчёт страниц для мобилок (по 2 карточки на «экран»)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const calcPages = () => {
      const isMobile = window.matchMedia('(max-width: 640px)').matches;
      if (!isMobile) {
        setPages(1);
        setPage(0);
        return;
      }
      const count = el.querySelectorAll('.ts-card').length;
      setPages(Math.max(1, Math.ceil(count / 2)));
      setPage(Math.round(el.scrollLeft / el.clientWidth));
    };

    const onScroll = () => {
      if (!viewportRef.current) return;
      const idx = Math.round(
        viewportRef.current.scrollLeft / viewportRef.current.clientWidth
      );
      setPage(idx);
    };

    calcPages();
    el.addEventListener('scroll', onScroll, { passive: true });

    const ro = new ResizeObserver(calcPages);
    ro.observe(el);
    window.addEventListener('resize', calcPages);

    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      window.removeEventListener('resize', calcPages);
    };
  }, [talents.length]);

  const goTo = (i: number) => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  const renderStars = (rating: number) => {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return (
      <div className="ts-stars" aria-label={`Rating ${rating} out of 5`}>
        {Array.from({ length: full }).map((_, i) => (
          <FaStar key={`f${i}`} />
        ))}
        {half ? <FaStarHalfAlt key="h" /> : null}
        {Array.from({ length: empty }).map((_, i) => (
          <FaStar key={`e${i}`} className="ts-star-empty" />
        ))}
        <span className="ts-rating-text">{rating.toFixed(1)}/5</span>
      </div>
    );
  };

  return (
    <section className="ts-wrap ts--dots">
      <div className="ts-inner">
     <div className="ts-head">
  <div className="ts-headbar">
    <h2 className="ts-title">{title}</h2>
    <Link to="/find-talent" className="ts-head-link">
      View all talents
    </Link>
  </div>
  
</div>

        <div className="ts-grid" ref={viewportRef}>
          {talents.map((t, i) => (
            <article className="ts-card" key={`${t.name}-${i}`}>
              <div className="ts-card-top">
                <img src={t.img} alt={t.name} className="ts-avatar" />
                <div className="ts-id">
                  <h3 className="ts-name">{t.name}</h3>
                  <span className={`ts-role ts-badge-${t.badge || 'indigo'}`}>
                    {t.role}
                  </span>
                </div>
              </div>

              <div className="ts-skills" aria-label="Skills">
                {t.skills.map((s, idx) => (
                  <span className="ts-skill" key={`${s}-${idx}`}>
                    {s}
                  </span>
                ))}
              </div>

              {renderStars(t.rating)}

        
            </article>
          ))}
          
        </div>

        {pages > 1 && (
          <div className="ts-dots" role="tablist" aria-label="Talents pages">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={page === i}
                aria-label={`Go to page ${i + 1}`}
                className={`ts-dot ${page === i ? 'ts-dot--active' : ''}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TalentShowcase;
