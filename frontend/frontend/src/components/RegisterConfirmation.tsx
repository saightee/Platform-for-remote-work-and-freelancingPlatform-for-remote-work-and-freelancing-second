import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Register.css'; // Используем те же стили для единообразия

const RegisterConfirmation: React.FC = () => {
  return (
    <div className="register-container">
      <h2>Registration Successful</h2>
      <p>A link for authentication has been sent to your email.</p>
      <Link to="/">Go to Home</Link>
    </div>
  );
};

export default RegisterConfirmation;