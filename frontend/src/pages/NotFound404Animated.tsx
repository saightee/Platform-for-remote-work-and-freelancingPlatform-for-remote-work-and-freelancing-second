import { Link } from 'react-router-dom';
import '../styles/404.css';

const NotFound404Animated: React.FC = () => {
  return (
    <div className="nf-root">
      <div className="nf-card">

        {/* ANIMATED SVG */}
        <div className="nf-ghost-wrap">
          <svg
            className="nf-ghost"
            width="140"
            height="140"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* body */}
            <path
              d="M40 170V70C40 40 65 20 100 20C135 20 160 40 160 70V170
                 L145 160L130 170L115 160L100 170L85 160L70 170L55 160L40 170Z"
              fill="#EEF2FF"
            />

            {/* eyes */}
            <circle cx="80" cy="85" r="6" fill="#4F46E5" />
            <circle cx="120" cy="85" r="6" fill="#4F46E5" />

            {/* mouth */}
            <path
              d="M85 110C90 115 110 115 115 110"
              stroke="#4F46E5"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className="nf-code">404</h1>
        <h2 className="nf-title">Page not found</h2>

        <p className="nf-text">
          Boo! This page vanished into the void.
        </p>

        <Link to="/" className="nf-btn nf-primary">
          Go home
        </Link>
      </div>
    </div>
  );
};

export default NotFound404Animated;
