import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import '../styles/PostJobForm.css';

const PostJobForm: React.FC = () => {
  const { role, isAuthenticated } = useAuth() || { role: '', isAuthenticated: false };
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || role !== 'employer') {
      navigate('/');
      return;
    }
    fetchCategories();
  }, [isAuthenticated, role, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (success) {
      timer = setTimeout(() => navigate('/'), 2000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [success, navigate]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCategories(response.data.map((cat: any) => cat.name));
    } catch (err: any) {
      setError('Failed to fetch categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await axios.post(`${API_BASE_URL}/api/job-posts`, {
        title,
        description,
        category,
        budget: parseFloat(budget),
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSuccess('Job posted successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post job');
    }
  };

  return (
    <div className="post-job-container">
      <h2>Post a Job</h2>
      {error && <p className="post-job-error">{error}</p>}
      {success && <p className="post-job-success">{success}</p>}
      <form onSubmit={handleSubmit} className="post-job-form">
        <input
          type="text"
          placeholder="Job Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Job Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Budget (USD)"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          required
        />
        <button type="submit">Post Job</button>
      </form>
    </div>
  );
};

export default PostJobForm;