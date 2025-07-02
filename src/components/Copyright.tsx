import { Link } from 'react-router-dom';

const Copyright: React.FC = () => {
  return (
    <div className="copyright">
      ________________________________________________________
      <p>
        © 2025 Jobforge. ALL RIGHTS RESERVED.{' '} <br />
        <Link to="/privacy-policy">Privacy Policy</Link> |{' '}
        <Link to="/terms-of-service">Terms of Service</Link>
      </p>
    </div>
  );
};

export default Copyright;