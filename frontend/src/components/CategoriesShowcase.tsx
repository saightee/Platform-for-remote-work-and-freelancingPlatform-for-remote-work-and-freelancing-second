import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { IconType } from 'react-icons';
import { 
  FaCalculator, 
  FaBullhorn, 
  FaHeadset, 
  FaUserTie, 
  FaChartBar, 
  FaPalette,
  FaShoppingCart, 
  FaMoneyBill, 
  FaUsers, 
  FaNetworkWired,
  FaChevronLeft,
  FaChevronRight
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

// Category icons mapping
const categoryIcons: Record<string, IconType> = {
  'accounting': FaCalculator,
  'advertising': FaBullhorn,
  'call-center': FaHeadset,
  'customer-service': FaUserTie,
  'data-analysis': FaChartBar,
  'design': FaPalette,
  'e-commerce': FaShoppingCart,
  'finance': FaMoneyBill,
  'hr': FaUsers,
  'it': FaNetworkWired,
};

const getCategoryIcon = (categoryName: string): IconType => {
  const normalizedName = categoryName.toLowerCase().replace(/\s+/g, '-');
  return categoryIcons[normalizedName] || FaUserTie;
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

  // Calculate responsive items per view
  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setItemsPerView(2);
      } else if (width < 1024) {
        setItemsPerView(3);
      } else if (width < 1280) {
        setItemsPerView(4);
      } else {
        setItemsPerView(5);
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
    <section className="categories-section">
      <div className="categories-header">
        <h2 className="categories-title">{title}</h2>
        <p className="categories-subtitle">{subtitle}</p>
      </div>

      <div className="categories-carousel-container">
        <button 
          className={`carousel-nav carousel-nav--prev ${currentIndex === 0 ? 'carousel-nav--disabled' : ''}`}
          onClick={prevSlide}
          aria-label="Previous categories"
          disabled={currentIndex === 0}
        >
          <FaChevronLeft />
        </button>

        <div 
          ref={carouselRef}
          className="categories-carousel"
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
              <div key={category.id} className="category-card">
                <Link to={`/find-job?category_id=${category.id}`} className="category-link">
                  <div className="category-icon">
                    <Icon />
                  </div>
                  <div className="category-content">
                    <h3 className="category-name">{category.name}</h3>
                    <span className="category-cta">Browse Jobs</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        <button 
          className={`carousel-nav carousel-nav--next ${currentIndex === totalPages - 1 ? 'carousel-nav--disabled' : ''}`}
          onClick={nextSlide}
          aria-label="Next categories"
          disabled={currentIndex === totalPages - 1}
        >
          <FaChevronRight />
        </button>
      </div>

      {/* Dots indicator */}
      {totalPages > 1 && (
        <div className="carousel-dots">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === currentIndex ? 'carousel-dot--active' : ''}`}
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