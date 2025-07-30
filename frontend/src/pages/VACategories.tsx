import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getCategories } from '../services/api';
import { Category } from '@types';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';

const VACategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const data = await getCategories();
        // Сортировка категорий по имени в алфавитном порядке
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(sortedData);
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError(err.response?.data?.message || 'Failed to load categories.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  if (isLoading) return <Loader />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>VA Categories</h2>
        <p>Explore our range of virtual assistant categories to find the perfect fit for your needs.</p>
        <div className="category-list">
          {categories.map((category, index) => (
<Link
  key={category.id}
  to={`/find-talent?category_id=${category.id}`} // Изменил на category_id
  className={`category-item category-${index % 17}`}
>
  {category.name}
</Link>
          ))}
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default VACategories;