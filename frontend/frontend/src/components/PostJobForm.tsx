import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config'; // Используем API_BASE_URL вместо хардкода
import '../styles/PostJobForm.css';

const PostJobForm: React.FC = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (role !== 'employer') {
      navigate('/'); // Редирект, если пользователь не employer
      return;
    }
    fetchCategories();
  }, [role, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (success) {
      // Устанавливаем таймер для редиректа
      timer = setTimeout(() => {
        navigate('/myaccount');
      }, 2000);
    }
    // Очистка таймера при размонтировании
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [success, navigate]); // Зависимость от success и navigate

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories', {
        baseURL: API_BASE_URL, // Используем API_BASE_URL
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setCategories(response.data.map((cat: any) => cat.name));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      await axios.post(
        '/api/jobs',
        {
          title,
          description,
          category,
          budget: parseFloat(budget),
        },
        {
          baseURL: API_BASE_URL, // Используем API_BASE_URL
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setSuccess('Job posted successfully!'); // Редирект запустится через useEffect
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
          className="post-job-input"
          required
        />
        <textarea
          placeholder="Job Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="post-job-textarea"
          required
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="post-job-input"
          required
        >
          <option value="">Select Category</option>
          {categories.map((cat, index) => (
            <option key={index} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Budget"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="post-job-input"
          required
        />
        <button type="submit" className="post-job-button">Post Job</button>
      </form>
    </div>
  );
};

export default PostJobForm;