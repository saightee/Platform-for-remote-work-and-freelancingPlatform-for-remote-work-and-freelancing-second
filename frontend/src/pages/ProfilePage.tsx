import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProfile, updateProfile, uploadAvatar, uploadIdentityDocument } from '../services/api';
import { Profile, SkillCategory } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';

const ProfilePage: React.FC = () => {
  const { profile: initialProfile } = useRole();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Вы должны быть авторизованы для просмотра этой страницы.');
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const profileData = await getProfile();
        setProfile(profileData);
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error);
        setError('Не удалось загрузить профиль. Пожалуйста, попробуйте позже.');
      } finally {
        setIsLoading(false);
      }
    };

    if (initialProfile) {
      setProfile(initialProfile);
      setIsLoading(false);
    } else {
      fetchProfile();
    }
  }, [initialProfile]);

  const handleUpdateProfile = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      const updatedProfile = await updateProfile(profile);
      setProfile(updatedProfile);
      setIsEditing(false);
      alert('Профиль успешно обновлён!');
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      alert('Не удалось обновить профиль.');
    }
  };

  const handleUploadAvatar = async () => {
    // Валидация avatarUrl
    if (!avatarUrl) {
      alert('Пожалуйста, введите действительный URL аватара.');
      return;
    }
    const urlPattern = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    if (!urlPattern.test(avatarUrl)) {
      alert('Пожалуйста, введите действительный URL (например, https://example.com/avatar.jpg).');
      return;
    }

    try {
      console.log('Загрузка аватара с URL:', avatarUrl);
      const updatedProfile = await uploadAvatar(avatarUrl);
      setProfile(updatedProfile);
      setAvatarUrl('');
      alert('Аватар успешно загружен!');
    } catch (error: any) {
      console.error('Ошибка загрузки аватара:', error);
      const errorMessage = error.response?.data?.message || 'Не удалось загрузить аватар. Убедитесь, что URL действителен.';
      alert(errorMessage);
    }
  };

  const handleUploadDocument = async () => {
    // Валидация documentUrl
    if (!documentUrl) {
      alert('Пожалуйста, введите действительный URL документа.');
      return;
    }
    const urlPattern = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    if (!urlPattern.test(documentUrl)) {
      alert('Пожалуйста, введите действительный URL (например, https://example.com/document.pdf).');
      return;
    }

    try {
      console.log('Загрузка документа с URL:', documentUrl);
      const updatedProfile = await uploadIdentityDocument(documentUrl);
      setProfile(updatedProfile);
      setDocumentUrl('');
      alert('Документ успешно загружен!');
    } catch (error: any) {
      console.error('Ошибка загрузки документа:', error);
      const errorMessage = error.response?.data?.message || 'Не удалось загрузить документ. Убедитесь, что URL действителен.';
      alert(errorMessage);
    }
  };

  if (isLoading) return <div>Загрузка...</div>;
  if (error) return <div>{error}</div>;
  if (!profile) return <div>Данные профиля недоступны.</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Мой профиль (Роль: {profile.role})</h2>
        <div>
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Имя пользователя:</label>
                <input
                  type="text"
                  value={profile.username}
                  onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                  placeholder="Введите ваше имя пользователя"
                />
              </div>
              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Введите ваш email"
                />
              </div>
              {profile.role === 'employer' && (
                <>
                  <div className="form-group">
                    <label>Название компании:</label>
                    <input
                      type="text"
                      value={profile.company_name || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, company_name: e.target.value })
                      }
                      placeholder="Введите название компании"
                    />
                  </div>
                  <div className="form-group">
                    <label>Информация о компании:</label>
                    <textarea
                      value={profile.company_info || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, company_info: e.target.value })
                      }
                      placeholder="Введите информацию о компании"
                    />
                  </div>
                </>
              )}
              {profile.role === 'jobseeker' && (
                <>
                  <div className="form-group">
                    <label>Навыки (через запятую):</label>
                    <input
                      type="text"
                      value={profile.skills?.join(', ') || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          skills: e.target.value.split(',').map((s) => s.trim()),
                        })
                      }
                      placeholder="например, JavaScript, Python"
                    />
                  </div>
                  <div className="form-group">
                    <label>Опыт:</label>
                    <input
                      type="text"
                      value={profile.experience || ''}
                      onChange={(e) =>
                        setProfile({ ...profile, experience: e.target.value })
                      }
                      placeholder="Введите ваш опыт"
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Часовой пояс:</label>
                <input
                  type="text"
                  value={profile.timezone || ''}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  placeholder="Введите ваш часовой пояс"
                />
              </div>
              <div className="form-group">
                <label>Валюта:</label>
                <input
                  type="text"
                  value={profile.currency || ''}
                  onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                  placeholder="Введите вашу валюту"
                />
              </div>
              <button onClick={handleUpdateProfile}>Сохранить профиль</button>
              <button onClick={() => setIsEditing(false)} style={{ marginLeft: '10px' }}>
                Отмена
              </button>
            </>
          ) : (
            <>
              <p><strong>Имя пользователя:</strong> {profile.username}</p>
              <p><strong>Email:</strong> {profile.email}</p>
              {profile.role === 'employer' && (
                <>
                  <p><strong>Название компании:</strong> {profile.company_name || 'Не указано'}</p>
                  <p><strong>Информация о компании:</strong> {profile.company_info || 'Не указано'}</p>
                </>
              )}
              {profile.role === 'jobseeker' && (
                <>
                  <p><strong>Навыки:</strong> {profile.skills?.join(', ') || 'Не указано'}</p>
                  <p>
                    <strong>Категории навыков:</strong>{' '}
                    {profile.skillCategories?.map((category: SkillCategory) => category.name).join(', ') || 'Не указано'}
                  </p>
                  <p><strong>Опыт:</strong> {profile.experience || 'Не указано'}</p>
                </>
              )}
              <p><strong>Часовой пояс:</strong> {profile.timezone || 'Не указано'}</p>
              <p><strong>Валюта:</strong> {profile.currency || 'Не указано'}</p>
              <button onClick={() => setIsEditing(true)}>Редактировать профиль</button>
            </>
          )}
        </div>

        <h3>Загрузить аватар</h3>
        <div className="form-group">
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Введите URL аватара"
          />
          <button onClick={handleUploadAvatar}>Загрузить аватар</button>
        </div>

        {profile.role === 'jobseeker' && (
          <>
            <h3>Загрузить документ для верификации личности</h3>
            <div className="form-group">
              <input
                type="text"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="Введите URL документа"
              />
              <button onClick={handleUploadDocument}>Загрузить документ</button>
            </div>
          </>
        )}
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default ProfilePage;