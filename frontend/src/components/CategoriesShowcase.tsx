import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { IconType } from 'react-icons';
import {
  FaCalculator, FaBullhorn, FaHeadset, FaUserTie, FaChartBar, FaPalette,
  FaShoppingCart, FaMoneyBill, FaUsers, FaNetworkWired, FaChevronLeft, FaChevronRight,
  FaLanguage, FaGavel, FaChartLine, FaBuilding, FaUsersCog, FaBriefcase,
  FaTasks, FaHandshake, FaCode, FaChalkboardTeacher, FaCalendarCheck, FaLaptopCode, FaTools, FaPen
} from 'react-icons/fa';
import '../styles/DeepCategories.css';

// Types
interface Category {
  id: string;
  name: string;
}

interface CategoriesCarouselProps {
  categories: Category[];
  title?: string;
  subtitle?: string;
}

const categoryIconBySlug: Record<string, IconType> = {
  'accounting': FaCalculator,
  'advertising': FaBullhorn,
  'call-center': FaHeadset,
  'customer-service-admin-support': FaUserTie,
  'data-analysis': FaChartBar,
  'design': FaPalette,
  'e-commerce': FaShoppingCart,
  'finance-management': FaMoneyBill,
  'hr-recruiting': FaUsers,
  'it-networking': FaNetworkWired,
  'language-services': FaLanguage,
  'legal': FaGavel,
  'marketing-sales': FaChartLine,
  'office-and-admin': FaBuilding,
  'online-community-management': FaUsersCog,
  'professional-services': FaBriefcase,
  'project-coordination': FaTasks,
  'sales': FaHandshake,
  'software-and-mobile-development': FaCode,
  'training-education': FaChalkboardTeacher,
  'virtual-event-planning': FaCalendarCheck,
  'web-development': FaLaptopCode,
  'website-builder': FaTools,
  'writing': FaPen,
};

/* алиасы часто встречающихся названий */
const categorySlugAliases: Record<string, string> = {
  'accounting-finance': 'accounting',
  'finance-accounting': 'accounting',
  'human-resources': 'hr-recruiting',
  'hr-and-recruiting': 'hr-recruiting',
  'it-support': 'it-networking',
  'networking': 'it-networking',
  'customer-service': 'customer-service-admin-support',
  'admin-support': 'office-and-admin',
  'sales-and-marketing': 'marketing-sales',
  'marketing': 'marketing-sales',
  'sales-marketing': 'marketing-sales',
  'software-development': 'software-and-mobile-development',
  'mobile-development': 'software-and-mobile-development',
  'data-science': 'data-analysis',
  'ecommerce': 'e-commerce',
  'web-design': 'web-development',
  'graphic-design': 'design',
  'training': 'training-education',
  'education': 'training-education',
};

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

/* итоговая функция иконки (подставит брифкейс по умолчанию) */
const getCategoryIcon = (rawName: string): IconType => {
  const slug = slugify(rawName);
  const normalized = categorySlugAliases[slug] || slug;
  return categoryIconBySlug[normalized] || FaBriefcase;
};

const CategoriesCarousel: React.FC<CategoriesCarouselProps> = ({
  categories,
  title = "Browse by category",
  subtitle = "Find the job that's perfect for you. about 800+ new jobs everyday"
}) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
const [itemsPerView, setItemsPerView] = useState(5);
const [pageCount, setPageCount] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

// Calculate responsive items per view (2 ряда)
useEffect(() => {
  const updateItemsPerView = () => {
    const width = window.innerWidth;
    if (width < 640) {
      setItemsPerView(4);  // 2 колонки × 2 ряда
    } else if (width < 768) {
      setItemsPerView(6);  // 3 × 2
    } else if (width < 1024) {
      setItemsPerView(8);  // 4 × 2
    } else {
      setItemsPerView(10); // 5 × 2
    }
  };
  updateItemsPerView();
  window.addEventListener('resize', updateItemsPerView);
  return () => window.removeEventListener('resize', updateItemsPerView);
}, []);
useEffect(() => {
  const el = carouselRef.current;
  if (!el) return;

  const calc = () => {
    const pageW = el.clientWidth || 1;
    const pages = Math.max(1, Math.round((el.scrollWidth - 1) / pageW));
    setPageCount(pages);
    setCurrentIndex(i => Math.min(i, pages - 1));
  };

  calc();

  const ro = new ResizeObserver(calc);
  ro.observe(el);
  window.addEventListener('resize', calc, { passive: true });

  return () => {
    ro.disconnect();
    window.removeEventListener('resize', calc);
  };
}, [categories.length]);

  const totalPages = Math.ceil(categories.length / itemsPerView);

  // Touch and mouse events for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    setStartX(clientX);
    if (carouselRef.current) {
      setScrollLeft(carouselRef.current.scrollLeft);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    
    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const walk = (clientX - startX) * 2;
    carouselRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

const handleTouchEnd = useCallback(() => {
  setIsDragging(false);
  const el = carouselRef.current;
  if (!el) return;
  const pageW = el.clientWidth || 1;
  const newIndex = Math.round(el.scrollLeft / pageW);
  setCurrentIndex(Math.max(0, Math.min(newIndex, pageCount - 1)));
}, [pageCount]);


const goToSlide = (index: number) => {
  const el = carouselRef.current;
  if (!el) return;
  const pageW = el.clientWidth || 1;
  el.scrollTo({ left: Math.round(pageW * index), behavior: 'smooth' });
  setCurrentIndex(index);
};


const nextSlide = () => {
  if (currentIndex < pageCount - 1) goToSlide(currentIndex + 1);
};

const prevSlide = () => {
  if (currentIndex > 0) goToSlide(currentIndex - 1);
};


useEffect(() => {
  const el = carouselRef.current;
  if (!el) return;

  const onScroll = () => {
    const pageW = el.clientWidth || 1;
    const newIndex = Math.round(el.scrollLeft / pageW);
    setCurrentIndex(Math.max(0, Math.min(newIndex, pageCount - 1)));
  };

  el.addEventListener('scroll', onScroll, { passive: true });
  return () => el.removeEventListener('scroll', onScroll);
}, [pageCount]);


  return (
    <section className="categories-carousel">
      <div className="categories-header">
        <h2 className="categories-title">{title}</h2>
        <p className="categories-subtitle">{subtitle}</p>
      </div>

      <div className="carousel-container">
        <button 
          className={`nav-btn nav-btn--prev ${currentIndex === 0 ? 'nav-btn--disabled' : ''}`}
          onClick={prevSlide}
          aria-label="Previous categories"
          disabled={currentIndex === 0}
        >
          <FaChevronLeft />
        </button>

        <div 
          ref={carouselRef}
          className="carousel-track"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleTouchStart}
          onMouseMove={handleTouchMove}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
        >
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.name);
            return (
              <div key={category.id} className="category-item">
                <Link to={`/find-job?category_id=${category.id}`} className="category-card">
                  <div className="card-icon">
                    <Icon />
                  </div>
                  <div className="card-content">
                    <h3 className="card-title">{category.name}</h3>
                    <span className="card-link">Browse Jobs</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

   <button
  className={`nav-btn nav-btn--next ${currentIndex === pageCount - 1 ? 'nav-btn--disabled' : ''}`}
  onClick={nextSlide}
  disabled={currentIndex === pageCount - 1}
>
  <FaChevronRight />
</button>
      </div>

{pageCount > 1 && (
  <div className="carousel-indicators">
    {Array.from({ length: pageCount }).map((_, index) => (
      <button
        key={index}
        className={`indicator ${index === currentIndex ? 'indicator--active' : ''}`}
        onClick={() => goToSlide(index)}
      />
    ))}
  </div>
)}
    </section>
  );
};

export default CategoriesCarousel;