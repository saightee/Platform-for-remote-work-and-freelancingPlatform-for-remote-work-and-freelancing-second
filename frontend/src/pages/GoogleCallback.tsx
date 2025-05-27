// import { useEffect, useState } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Header from '../components/Header';
// import Footer from '../components/Footer';
// import Copyright from '../components/Copyright';
// import { useRole } from '../context/RoleContext';
// import { googleAuthLogin } from '../services/api';
// import { Profile } from '@types';

// const GoogleCallback: React.FC = () => {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const { profile, refreshProfile } = useRole();
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const accessToken = searchParams.get('accessToken');
//     const role = searchParams.get('role');

//     const handleAuth = async () => {
//       if (!accessToken) {
//         setError('Ошибка авторизации через Google: токен доступа не предоставлен. Пожалуйста, попробуйте снова или обратитесь в поддержку.');
//         return;
//       }

//       try {
//         if (role) {
//           // Регистрация через Google
//           localStorage.setItem('token', accessToken);
//           await refreshProfile();
//           setIsAuthenticated(true);
//         } else {
//           // Логин через Google
//           const { accessToken: newToken } = await googleAuthLogin(accessToken);
//           localStorage.setItem('token', newToken);
//           await refreshProfile();
//           setIsAuthenticated(true);
//         }
//       } catch (error: any) {
//         console.error('Ошибка авторизации через Google:', error);
//         const errorMessage = error.response?.data?.message || 'Ошибка авторизации через Google. Пожалуйста, попробуйте снова или обратитесь в поддержку.';
//         setError(errorMessage);
//       }
//     };

//     handleAuth();
//   }, [searchParams, navigate, refreshProfile]);

//   useEffect(() => {
//     if (isAuthenticated) {
//       navigate('/'); // Перенаправляем всех на главную страницу
//     } else if (error) {
//       alert(error);
//       navigate('/login');
//     }
//   }, [isAuthenticated, error, navigate]);

//   return (
//     <div>
//       <Header />
//       <div className="container">
//         <h2>Обработка авторизации через Google...</h2>
//         {error && <p className="error-message">{error}</p>}
//       </div>
//       <Footer />
//       <Copyright />
//     </div>
//   );
// };

// export default GoogleCallback;