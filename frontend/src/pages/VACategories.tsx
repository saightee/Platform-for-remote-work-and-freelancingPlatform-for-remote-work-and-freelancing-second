import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getCategories, searchJobPosts } from '../services/api';
import { Category } from '@types';
import Loader from '../components/Loader';
import { Link } from 'react-router-dom';
import { FaCalculator, FaBullhorn, FaHeadset, FaUserTie, FaChartBar, FaPalette, FaShoppingCart, FaMoneyBill, FaUsers, FaNetworkWired, FaLanguage, FaGavel, FaChartLine as FaMarketing, FaBuilding, FaUsersCog, FaBriefcase, FaTasks, FaHandshake, FaCode, FaChalkboardTeacher, FaCalendarCheck, FaLaptopCode, FaTools, FaPen } from 'react-icons/fa';

const VACategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});
  const visibleItems = 5;

  // Мапинг без JSX: значения — сами компоненты иконок (React.ComponentType)
  const iconMap: { [key: string]: React.ComponentType } = {
    'Accounting': FaCalculator,
    'Advertising': FaBullhorn,
    'Call Center': FaHeadset,
    'Customer Service & Admin Support': FaUserTie,
    'Data Analysis': FaChartBar,
    'Design': FaPalette,
    'E-Commerce': FaShoppingCart,
    'Finance & Management': FaMoneyBill,
    'HR & Recruiting': FaUsers,
    'IT & Networking': FaNetworkWired,
    'Language Services': FaLanguage,
    'Legal': FaGavel,
    'Marketing & Sales': FaMarketing,
    'Office and Admin': FaBuilding,
    'Online Community Management': FaUsersCog,
    'Professional Services': FaBriefcase,
    'Project Coordination': FaTasks,
    'Sales': FaHandshake,
    'Software and Mobile Development': FaCode,
    'Training & Education': FaChalkboardTeacher,
    'Virtual Event Planning': FaCalendarCheck,
    'Web Development': FaLaptopCode,
    'Website Builder': FaTools,
    'Writing': FaPen,
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoading(true);
        const data = await getCategories();
        const sortedData = data.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(sortedData);
        console.log('Fetched categories in VACategories:', sortedData);

        // Fetch counts
        const countsPromises = sortedData.map(async (cat) => {
          const res = await searchJobPosts({ category_id: cat.id, limit: 1, page: 1 });
          return { [cat.id]: res.total || 0 };
        });
        const countsArray = await Promise.all(countsPromises);
        const counts = countsArray.reduce((acc, obj) => ({ ...acc, ...obj }), {});
        setCategoryCounts(counts);
      } catch (err: any) {
        console.error('Error fetching categories:', err);
        setError(err.response?.data?.message || 'Failed to load categories.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handlePrev = () => setCurrentSlide((prev) => Math.max(0, prev - 1));
  const handleNext = () => setCurrentSlide((prev) => Math.min(maxSlide, prev + 1));
  const handleDotClick = (index: number) => setCurrentSlide(index);

  const filteredCategories = categories.filter(cat => 
    Object.keys(iconMap).includes(cat.name)
  );

  // maxSlide теперь на основе filteredCategories
  const maxSlide = Math.max(0, filteredCategories.length - visibleItems);

  if (isLoading) return <Loader />;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>VA Categories</h2>
        <p>Explore our range of virtual assistant categories to find the perfect fit for your needs.</p>
        <div className="hv-carousel-container">
          <div className="hv-carousel-wrapper">
            <button className="hv-carousel-arrow hv-carousel-left" onClick={handlePrev} disabled={currentSlide === 0}>&lt;</button>
            <div className="hv-carousel-track" style={{ transform: `translateX(-${currentSlide * (100 / visibleItems)}%)` }}>
              {filteredCategories.map((category) => {
                // Динамический выбор компонента иконки без JSX в мапе
                const IconComponent = iconMap[category.name] || FaBriefcase;
                return (
                  <Link
                    key={category.id}
                    to={`/find-talent?category_id=${category.id}`}
                    className="hv-carousel-item"
                  >
                    <div className="hv-carousel-icon"><IconComponent /></div>
                    <div className="hv-carousel-name">{category.name}</div>
                    <div className="hv-carousel-count">{categoryCounts[category.id] || 0} Jobs Available</div>
                  </Link>
                );
              })}
            </div>
            <button className="hv-carousel-arrow hv-carousel-right" onClick={handleNext} disabled={currentSlide === maxSlide}>&gt;</button>
          </div>
          <div className="hv-carousel-dots">
            {Array.from({ length: maxSlide + 1 }).map((_, index) => (
              <span
                key={index}
                className={`hv-carousel-dot ${index === currentSlide ? 'hv-carousel-dot-active' : ''}`}
                onClick={() => handleDotClick(index)}
              ></span>
            ))}
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default VACategories;