import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright'; // Добавили импорт
import { createJobPost, getCategories, setJobPostApplicationLimit } from '../services/api';
import { Category } from '@types';

const PostJob: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [jobType, setJobType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [applicationLimit, setApplicationLimit] = useState<number | ''>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const jobData: any = {
        title,
        description,
        location: location || undefined,
        salaryMin: salaryMin || undefined,
        salaryMax: salaryMax || undefined,
        job_type: jobType || undefined,
        category_id: categoryId || undefined,
      };
      const response = await createJobPost(jobData);
      if (applicationLimit && response.id) {
        await setJobPostApplicationLimit(response.id, Number(applicationLimit));
      }
      navigate('/my-job-posts');
    } catch (err) {
      console.error('Error creating job post:', err);
      setError('Failed to create job post. Please try again.');
    }
  };

  return (
    <div>
      <Header />
      <div className="container">
        <div className="post-job-container">
          <h1>Post a Job</h1>
          <div className="post-job-form">
            <div className="form-columns">
              <div className="form-column">
                <div className="form-group">
                  <label>Job Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter job title"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter job description"
                    required
                    rows={5}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter location"
                  />
                </div>
              </div>
              <div className="form-column">
                <div className="form-group">
                  <label>Minimum Salary</label>
                  <input
                    type="number"
                    value={salaryMin}
                    onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter minimum salary"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Salary</label>
                  <input
                    type="number"
                    value={salaryMax}
                    onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter maximum salary"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Job Type</label>
                  <select value={jobType} onChange={(e) => setJobType(e.target.value)}>
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
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Application Limit</label>
                  <input
                    type="number"
                    value={applicationLimit}
                    onChange={(e) => setApplicationLimit(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Enter application limit"
                    min="0"
                  />
                </div>
              </div>
            </div>
            {error && <p className="error-message">{error}</p>}
            <button onClick={handleSubmit}>Post Job</button>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default PostJob;