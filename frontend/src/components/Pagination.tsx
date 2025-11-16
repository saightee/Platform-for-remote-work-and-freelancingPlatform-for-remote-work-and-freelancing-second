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
  // Десктоп: универсальная логика
  const pages: (number | string)[] = [];

  // Если страниц немного — показываем все
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Кандидаты: 1, last, current, и до двух соседей по краям
  const candidates = new Set<number>();
  candidates.add(1);
  candidates.add(totalPages);
  candidates.add(currentPage);

  if (currentPage - 1 > 1) candidates.add(currentPage - 1);
  if (currentPage - 2 > 1) candidates.add(currentPage - 2);
  if (currentPage + 1 < totalPages) candidates.add(currentPage + 1);
  if (currentPage + 2 < totalPages) candidates.add(currentPage + 2);

  const sorted = Array.from(candidates).sort((a, b) => a - b);

  const result: (number | string)[] = [];
  let prev: number | undefined;

  for (const p of sorted) {
    if (prev === undefined) {
      // первая страница
      result.push(p);
    } else if (p === prev + 1) {
      // соседняя — просто добавляем
      result.push(p);
    } else if (p === prev + 2) {
      // есть ровно одна пропущенная — вставляем её
      result.push(prev + 1);
      result.push(p);
    } else {
      // дырка больше чем на 1 — ставим "…"
      result.push('…');
      result.push(p);
    }
    prev = p;
  }

  return result;
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