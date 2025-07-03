import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RoleProvider } from './context/RoleContext';
import Home from './pages/Home';
import JobDetails from './pages/JobDetails';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelection from './pages/RoleSelection';
import ProfilePage from './pages/ProfilePage';
import PublicProfile from './pages/PublicProfile';
import PostJob from './pages/PostJob';
import MyJobPosts from './pages/MyJobPosts';
import MyApplications from './pages/MyApplications';
import AdminDashboard from './pages/AdminDashboard';
import ModeratorDashboard from './pages/ModeratorDashboard';
import Feedback from './pages/Feedback';
import ResetPassword from './pages/ResetPassword';
import ConfirmResetPassword from './pages/ConfirmResetPassword';
import HowItWorksJobseekerFAQ from './pages/HowItWorksJobseekerFAQ';
import HowItWorksEmployerFAQ from './pages/HowItWorksEmployerFAQ';
import Pricing from './pages/Pricing';
import RealResults from './pages/RealResults';
import FindJob from './pages/FindJob';
import FindTalent from './pages/FindTalent';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import UserReviews from './pages/UserReviews';
import VACategories from './pages/VACategories';
import ProfileTips from './pages/ProfileTips';
import SkillTests from './pages/SkillTests';
import SuccessStories from './pages/SuccessStories';
import AboutUs from './pages/AboutUs';
import Careers from './pages/Careers';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import Messages from './pages/Messages';
import VerifyEmail from './pages/VerifyEmail';
import Complaint from './pages/Complaint';
import ForgotPassword from './pages/ForgotPassword';
import CheckEmail from 'pages/CheckEmail';

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
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/users/:id" element={<PublicProfile />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/my-job-posts" element={<MyJobPosts />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/moderator" element={<ModeratorDashboard />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/confirm" element={<ConfirmResetPassword />} />
          <Route path="/how-it-works/jobseeker-faq" element={<HowItWorksJobseekerFAQ />} />
          <Route path="/how-it-works/employer-faq" element={<HowItWorksEmployerFAQ />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/real-results" element={<RealResults />} />
          <Route path="/find-job" element={<FindJob />} />
          <Route path="/find-talent" element={<FindTalent />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/reviews/:id" element={<UserReviews />} />
          <Route path="/va-categories" element={<VACategories />} />
          <Route path="/profile-tips" element={<ProfileTips />} />
          <Route path="/skill-tests" element={<SkillTests />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complaint" element={<Complaint />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </Router>
    </RoleProvider>
  );
};

export default App;