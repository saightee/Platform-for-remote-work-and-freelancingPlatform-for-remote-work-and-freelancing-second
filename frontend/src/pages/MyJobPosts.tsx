import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyJobPosts, updateJobPost, closeJobPost, setJobPostApplicationLimit, getApplicationsForJobPost } from '../services/api';
import { JobPost } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';
import { format, zonedTimeToUtc } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const MyJobPosts: React.FC = () => {
  const { profile } = useRole();
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [applications, setApplications] = useState<
    { jobPostId: string; apps: { userId: string; username: string; email: string; jobDescription: string; appliedAt: string }[] }
  >({ jobPostId: '', apps: [] });
  const [limit, setLimit] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchJobPosts = async () => {
      if (!profile || profile.role !== 'employer') {
        setJobPosts([]);
        setError('Эта страница доступна только для работодателей.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const posts = await getMyJobPosts();
        setJobPosts(posts);
      } catch (err) {
        console.error('Ошибка загрузки вакансий:', err);
        setError('Не удалось загрузить вакансии. Пожалуйста, попробуйте снова.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchJobPosts();
  }, [profile]);

  const handleUpdate = async (id: string, updatedData: Partial<JobPost>) => {
    try {
      const updatedPost = await updateJobPost(id, updatedData);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Вакансия успешно обновлена!');
    } catch (err) {
      console.error('Ошибка обновления вакансии:', err);
      alert('Не удалось обновить вакансию.');
    }
  };

  const handleClose = async (id: string) => {
    try {
      const updatedPost = await closeJobPost(id);
      setJobPosts(jobPosts.map((post) => (post.id === id ? updatedPost : post)));
      alert('Вакансия успешно закрыта!');
    } catch (err) {
      console.error('Ошибка закрытия вакансии:', err);
      alert('Не удалось закрыть вакансию.');
    }
  };

  const handleSetLimit = async (id: string) => {
    try {
      await setJobPostApplicationLimit(id, limit);
      alert('Лимит заявок успешно установлен!');
      setLimit(0);
    } catch (err) {
      console.error('Ошибка установки лимита заявок:', err);
      alert('Не удалось установить лимит заявок.');
    }
  };

  const handleViewApplications = async (jobPostId: string) => {
    try {
      const apps = await getApplicationsForJobPost(jobPostId);
      setApplications({ jobPostId, apps });
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
      alert('Не удалось загрузить заявки.');
    }
  };

  const formatDateInTimezone = (dateString?: string, timezone?: string): string => {
    if (!dateString) return 'Не указано';
    try {
      const date = parseISO(dateString);
      if (timezone) {
        const zonedDate = zonedTimeToUtc(date, timezone);
        return format(zonedDate, 'PPpp', { timeZone: timezone });
      }
      return format(date, 'PPpp');
    } catch (error) {
      console.error('Ошибка форматирования даты:', error);
      return 'Недействительная дата';
    }
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Мои вакансии</h2>
          <p>Загрузка...</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  if (!profile || profile.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Мои вакансии</h2>
          <p>{error}</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container my-job-posts-container">
        <h2>Мои вакансии</h2>
        {error && <p className="error-message">{error}</p>}
        {jobPosts.length > 0 ? (
          <div className="job-grid">
            {jobPosts.map((post) => (
              <div key={post.id} className="job-card">
                <h3>{post.title}</h3>
                <p><strong>Статус:</strong> {post.status}</p>
                <p><strong>Лимит заявок:</strong> {post.applicationLimit || 'Без лимита'}</p>
                <button onClick={() => handleClose(post.id)} className="action-button warning">
                  Закрыть вакансию
                </button>
                <div className="form-group">
                  <label>Установить лимит заявок:</label>
                  <input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    min="0"
                  />
                  <button onClick={() => handleSetLimit(post.id)} className="action-button">
                    Установить лимит
                  </button>
                </div>
                <button
                  onClick={() => handleViewApplications(post.id)}
                  className="action-button success"
                >
                  Посмотреть заявки
                </button>
                {applications.jobPostId === post.id && applications.apps.length > 0 && (
                  <div className="applications-section">
                    <h4>Заявки:</h4>
                    <ul>
                      {applications.apps.map((app, index) => (
                        <li key={index}>
                          <strong>{app.username}</strong> ({app.email}) - Подал заявку:{' '}
                          {formatDateInTimezone(app.appliedAt, profile.timezone)} <br />
                          <strong>Описание:</strong> {app.jobDescription || 'Не указано'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>Вакансии не найдены.</p>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default MyJobPosts;