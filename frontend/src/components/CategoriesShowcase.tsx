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
    if (!carouselRef.current) return;

    const scrollPosition = carouselRef.current.scrollLeft;
    const itemWidth = carouselRef.current.scrollWidth / categories.length;
    const newIndex = Math.round(scrollPosition / (itemWidth * itemsPerView));
    setCurrentIndex(Math.max(0, Math.min(newIndex, totalPages - 1)));
  }, [categories.length, itemsPerView, totalPages]);

  // Navigation
  const goToSlide = (index: number) => {
    if (!carouselRef.current) return;
    
    const scrollAmount = (carouselRef.current.scrollWidth / totalPages) * index;
    carouselRef.current.scrollTo({
      left: scrollAmount,
      behavior: 'smooth'
    });
    setCurrentIndex(index);
  };

  const nextSlide = () => {
    if (currentIndex < totalPages - 1) {
      goToSlide(currentIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  };

  // Auto update current index on scroll
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const scrollPos = carousel.scrollLeft;
      const itemWidth = carousel.scrollWidth / categories.length;
      const newIndex = Math.round(scrollPos / (itemWidth * itemsPerView));
      setCurrentIndex(Math.max(0, Math.min(newIndex, totalPages - 1)));
    };

    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, [categories.length, itemsPerView, totalPages]);

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
          className={`nav-btn nav-btn--next ${currentIndex === totalPages - 1 ? 'nav-btn--disabled' : ''}`}
          onClick={nextSlide}
          aria-label="Next categories"
          disabled={currentIndex === totalPages - 1}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Dots indicator */}
      {totalPages > 1 && (
        <div className="carousel-indicators">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentIndex ? 'indicator--active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default CategoriesCarousel;