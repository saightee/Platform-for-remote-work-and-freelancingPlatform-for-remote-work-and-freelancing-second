import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/PostJobForm.css';

interface JobFormData {
  title: string;
  companyName: string;
  description: string;
  requirements: string;
  salary: string;
  employmentType: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
}

const PostJobForm: React.FC = () => {
  const { isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    companyName: '',
    description: '',
    requirements: '',
    salary: '',
    employmentType: '',
    location: '',
    contactEmail: '',
    contactPhone: '',
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/register');
    } else if (role !== 'employer') {
      setError('Only employers can post jobs.');
    }
  }, [isAuthenticated, role, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role !== 'employer') return;

    try {
      const response = await fetch('/api/jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create job posting');
      }

      navigate('/jobs');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="post-job-form">
      <h1>Post a Job</h1>
      {error && <p className="error">{error}</p>}
      {isAuthenticated && role === 'employer' ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Job Title</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="companyName">Company Name</label>
            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="requirements">Requirements</label>
            <textarea name="requirements" value={formData.requirements} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="salary">Salary</label>
            <input type="text" name="salary" value={formData.salary} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="employmentType">Employment Type</label>
            <select name="employmentType" value={formData.employmentType} onChange={handleChange} required>
              <option value="">Select type</option>
              <option value="full-time">Full-Time</option>
              <option value="part-time">Part-Time</option>
              <option value="contract">Contract</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="contactEmail">Contact Email</label>
            <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="contactPhone">Contact Phone</label>
            <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} />
          </div>
          <button type="submit">Post Job</button>
        </form>
      ) : (
        <p>Please register as an employer to post a job.</p>
      )}
    </div>
  );
};

export default PostJobForm;