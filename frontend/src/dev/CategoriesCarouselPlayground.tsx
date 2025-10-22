// src/dev/CategoriesCarouselPlayground.tsx
import React, { useEffect, useState } from 'react';
import CategoriesCarousel from '../components/CategoriesShowcase'; // <-- поправь путь при необходимости
// ===== PROD (РАСКОММЕНТИТЬ ПОСЛЕ ВЁРСТКИ) =====
// import { getCategories } from '@/services/api';
// ==============================================

import { MOCK_CATEGORIES } from '../mocks/categories';

const CategoriesCarouselPlayground: React.FC = () => {
  // === DEV MOКИ: сейчас рендерим только их ===
  const [categories, setCategories] = useState(MOCK_CATEGORIES);

  // ===== PROD (РАСКОММЕНТИТЬ ПОСЛЕ ВЁРСТКИ) =====
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const real = await getCategories();
  //       setCategories(real);
  //     } catch (e) {
  //       console.error('Failed to load categories:', e);
  //     }
  //   })();
  // }, []);
  // ==============================================

  return (
    <div style={{ padding: 24 }}>
      <CategoriesCarousel
        categories={categories}
        // title="Browse by category" // можно кастомизировать при вёрстке
        // subtitle="Find the job that's perfect for you. about 800+ new jobs everyday"
      />
    </div>
  );
};

export default CategoriesCarouselPlayground;
