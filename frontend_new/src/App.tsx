import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import Home from './pages/Home';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import GoogleCallback from './pages/GoogleCallback';
import ProfilePage from './pages/ProfilePage';
import PostJob from './pages/PostJob';
import MyJobPosts from './pages/MyJobPosts';
import MyApplications from './pages/MyApplications';
import AdminDashboard from './pages/AdminDashboard';
import Feedback from './pages/Feedback';
import ResetPassword from './pages/ResetPassword';
import HowItWorksJobseekerFAQ from './pages/HowItWorksJobseekerFAQ';
import HowItWorksEmployerFAQ from './pages/HowItWorksEmployerFAQ';
import Pricing from './pages/Pricing';
import RealResults from './pages/RealResults';
import FindJob from './pages/FindJob';
import PrivacyPolicy from './pages/PrivacyPolicy'; // Новый импорт
import TermsOfService from './pages/TermsOfService'; // Новый импорт

const App: React.FC = () => {
  return (
    <RoleProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/:role" element={<Register />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/google-callback" element={<GoogleCallback />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/my-job-posts" element={<MyJobPosts />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/how-it-works/jobseeker-faq" element={<HowItWorksJobseekerFAQ />} />
          <Route path="/how-it-works/employer-faq" element={<HowItWorksEmployerFAQ />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/real-results" element={<RealResults />} />
          <Route path="/find-job" element={<FindJob />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
        </Routes>
      </Router>
    </RoleProvider>
  );
};

export default App;