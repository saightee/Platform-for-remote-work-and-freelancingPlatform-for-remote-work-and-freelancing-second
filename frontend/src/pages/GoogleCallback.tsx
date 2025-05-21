import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    if (accessToken) {
      localStorage.setItem('token', accessToken);
      navigate('/');
    } else {
      alert('Google authentication failed. Please try again.');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Processing Google Authentication...</h2>
      </div>
      <Footer />
    </div>
  );
};

export default GoogleCallback;