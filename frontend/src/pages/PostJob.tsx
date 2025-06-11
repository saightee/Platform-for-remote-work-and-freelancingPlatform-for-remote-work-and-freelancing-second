import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { createJobPost, getCategories } from '../services/api';
import { Category } from '@types';
import { useRole } from '../context/RoleContext';
// import { mockCategories } from '../mocks/mockCategories'; // Закомментировано
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useRole();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('<p><strong>Responsibilities:</strong><br>-<br>-</p><p><strong>Requirements:</strong><br>-<br>-</p><p><strong>Terms:</strong><br>-<br>-</p><p><strong>Work experience:</strong><br>-</p>');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState<number | ''>('');
  const [jobType, setJobType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Для разработки: использование мок-данных с локальной эмуляцией профиля (закомментировано)
  // useEffect(() => {
  //   const mockProfile = { role: 'employer' };
  //   if (!mockProfile || mockProfile.role !== 'employer') {
  //     setError('Only employers can post jobs.');
  //     navigate('/');
  //     return;
  //   }
  //   setCategories(mockCategories);
  // }, [navigate]);

  // Для продакшена: раскомментировать этот useEffect
  useEffect(() => {
    if (!profile || profile.role !== 'employer') {
      setError('Only employers can post jobs.');
      navigate('/');
      return;
    }

    const fetchCategories = async () => {
      try {
        const categoriesData = await getCategories();
        setCategories(categoriesData);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Failed to load categories. Please try again.');
      }
    };
    fetchCategories();
  }, [profile, navigate]);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const jobData: any = {
        title,
        description,
        location: location || undefined,
        salary: salary || undefined,
        status: 'Active',
        job_type: jobType || undefined,
        category_id: categoryId || undefined,
      };
      await createJobPost(jobData);
      navigate('/my-job-posts');
    } catch (err: any) {
      console.error('Error creating job post:', err);
      setError(err.response?.data?.message || 'Failed to create job post. Please try again.');
    }
  };

  if (!profile || profile.role !== 'employer') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>Post a Job</h2>
          <p>This page is only available for Employers.</p>
        </div>
        <Footer />
        <Copyright />
      </div>
    );
  }

  const descriptionLength = description.replace(/<[^>]+>/g, '').length;
  const isDescriptionValid = descriptionLength >= 150;

  return (
    <div>
      <Header />
      <div className="container">
        <div className="post-job-container">
          <h1 style={{ textAlign: 'left', textTransform: 'uppercase' }}>POST A JOB</h1>
          <div className="post-job-form">
            <div className="form-columns">
              <div className="form-column left-column" style={{ width: '30%' }}>
                <div className="form-group">
                  <label>Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter job title"
                    required
                    style={{ width: '150px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location"
                    style={{ width: '150px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Salary</label>
                  <input
                    type="number"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter salary"
                    min="0"
                    style={{ width: '150px' }}
                  />
                </div>
                <div className="form-group">
                  <label>Job Type</label>
                  <select value={jobType} onChange={(e) => setJobType(e.target.value)} style={{ width: '150px' }}>
                    <option value="">Select job type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Temporary">Temporary</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ width: '150px' }}>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-column right-column" style={{ width: '70%' }}>
                <div className="description-editor">
                  <h3>Vacancy description</h3>
                  <div className="editor-labels">
                    <span>No contact info</span>
                    <span>Without discrimination based on gender, age, nationality and other non-business qualities</span>
                    <span>At least 150 characters</span>
                  </div>
                  <ReactQuill
                    value={description}
                    onChange={setDescription}
                    placeholder="Enter vacancy description"
                    modules={{
                      toolbar: [
                        ['bold', 'italic'],
                        [{ list: 'bullet' }, { list: 'ordered' }],
                        ['undo'],
                        [{ header: [1, 2, 3, false] }],
                        ['clean']
                      ]
                    }}
                    formats={['header', 'bold', 'italic', 'list', 'bullet', 'indent']}
                    style={{ height: '380px', marginBottom: '10px' }}
                  />
                  {!isDescriptionValid && (
                    <p className="error-message-symbols">A vacancy description must consist of 150 or more characters</p>
                  )}
                </div>
              </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button onClick={handleSubmit} style={{ padding: '12px 32px', fontSize: '16px' }}>
                Post Job
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default PostJob;