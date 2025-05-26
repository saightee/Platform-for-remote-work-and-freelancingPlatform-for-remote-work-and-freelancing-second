import { Link } from 'react-router-dom';

const Copyright: React.FC = () => {
  return (
    <div className="copyright">
      <p>
        © 2025 HireValve. ALL RIGHTS RESERVED.{' '}
        <Link to="/privacy-policy">Privacy Policy</Link> |{' '}
        <Link to="/terms-of-service">Terms of Service</Link>
      </p>
    </div>
  );
};

export default Copyright;