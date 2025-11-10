import React from 'react';
import '../styles/pagination.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  isMobile?: boolean;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  isMobile = false
}) => {
  const getVisiblePages = () => {
    if (totalPages <= 1) {
      return [1];
    }

    if (isMobile) {
      const pages: (number | string)[] = [];

      if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }

      if (currentPage === 1) {
        return [1, 2, 3, '…', totalPages];
      } else if (currentPage === 2) {
        return [1, 2, 3, '…', totalPages];
      } else if (currentPage === 3) {
        return ['…', 3, '…', totalPages];
      } else if (currentPage >= 4 && currentPage < totalPages) {
        return ['…', currentPage, '…', totalPages];
      } else if (currentPage === totalPages) {
        if (totalPages >= 4) {
          return ['…', totalPages - 2, totalPages - 1, totalPages];
        } else {
          return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
      }

      return [1];
    } else {
      const pages: (number | string)[] = [];

      // Изменено с 7 на 5 первых страниц
      if (currentPage <= 5) {
        for (let i = 1; i <= Math.min(5, totalPages); i++) {
          pages.push(i);
        }
        if (totalPages > 5) {
          pages.push('…');
          pages.push(totalPages);
        }
        return pages;
      }

      // Изменено с 7 на 5 последних страниц
      if (currentPage > totalPages - 5) {
        pages.push(1);
        pages.push('…');
        for (let i = Math.max(2, totalPages - 4); i <= totalPages; i++) {
          pages.push(i);
        }
        return pages;
      }

      // Середина - показываем 2 страницы до и после текущей
      pages.push(1);
      pages.push('…');
      for (let i = currentPage - 2; i <= currentPage + 2; i++) {
        if (i > 1 && i < totalPages) {
          pages.push(i);
        }
      }
      pages.push('…');
      pages.push(totalPages);
      return pages;
    }
  };

  if (totalItems <= 0) {
    return null;
  }

  return (
    <div className="ftl-pagination" role="navigation" aria-label="Pagination">
      {/* Кнопка "Назад" показывается только если НЕ на первой странице */}
      {currentPage > 1 && (
        <button
          className="ftl-page ftl-prev"
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
        >
          <FaChevronLeft />
        </button>
      )}

      {getVisiblePages().map((page, index) => (
        <button
          key={index}
          className={`ftl-page ${page === currentPage ? 'is-current' : ''} ${
            page === '…' ? 'is-ellipsis' : ''
          }`}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '…' || page === currentPage}
          aria-label={typeof page === 'number' ? `Page ${page}` : undefined}
        >
          {page}
        </button>
      ))}

      {/* Кнопка "Вперед" показывается только если НЕ на последней странице */}
      {currentPage < totalPages && (
        <button
          className="ftl-page ftl-next"
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
        >
          <FaChevronRight />
        </button>
      )}
    </div>
  );
};

export default Pagination;