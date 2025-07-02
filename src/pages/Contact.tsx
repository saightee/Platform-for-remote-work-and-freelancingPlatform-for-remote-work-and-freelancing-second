import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const Contact: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setError('All fields are required.');
      return;
    }
    setError(null);
    alert('Message sent successfully!'); // Заглушка, заменить на API
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div>
      <Header />
      <div className="container">
        <h2>Contact Us</h2>
        <p>We'd love to hear from you. Fill out the form below to get in touch.</p>
        <form onSubmit={handleSubmit} className="register-form">
          {error && <p className="error-message">{error}</p>}
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message"
              rows={5}
            />
          </div>
          <button type="submit" className="action-button">Send Message</button>
        </form>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Contact;