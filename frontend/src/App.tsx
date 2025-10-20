import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import ReportIssue from './pages/ReportIssue';
import ShareStory from './pages/ShareStory';
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
import SkillTest from './pages/SkillTest';
import SuccessStories from './pages/SuccessStories';
import AboutUs from './pages/AboutUs';
import Careers from './pages/Careers';
import Blog from './pages/Blog';
import Messages from './pages/Messages';
import VerifyEmail from './pages/VerifyEmail';
import Complaint from './pages/Complaint';
import ForgotPassword from './pages/ForgotPassword';
import CheckEmail from './pages/CheckEmail';
import Clientstories from './pages/ClientStories';
import AuthCallback from './pages/AuthCallback';
import EmailNotifications from './pages/EmailNotifications';
import { ErrorBoundary } from 'react-error-boundary';
import EmployerDashboard from './pages/EmployerDashboard';
import EmployerOverview from './pages/EmployerOverview';
import JobseekerDashboard from './pages/JobseekerDashboard';
import JobseekerOverview from './pages/JobseekerOverview';
import ContactSupport from './pages/ContactSupport';
import PromoLatamFreelancer from './pages/promoLatamFreelancer';
import PromoPhilippinoFreelancer from './pages/promoPhilippinoFreelancer';
import { HelmetProvider } from 'react-helmet-async';
import Vacancy from './pages/Vacancy';
import JobLanding from './pages/JobLanding';
import ScrollToTop from "./components/ScrollToTop";
import RegistrationPending from './pages/RegistrationPending';
import Toaster from './components/Toaster';
import RequireAuth from './routes/RequireAuth';



const App: React.FC = () => {
  return (
    <HelmetProvider>
    <RoleProvider>
      <Router>
        <ScrollToTop />
        <Toaster />  
        {/* <ErrorBoundary fallback={<div>Error loading app</div>}></ErrorBoundary> */}
        <Routes>
          <Route path="/" element={<Home />} />
           <Route path="/jobs/:id" element={<JobDetails />} />   {/* legacy путь оставляем */}
          <Route path="/vacancy/:slugId" element={<JobDetails />} />  {/* тот же UI, но грузим по slugOrId */}
          <Route path="/job/:slugId" element={<JobLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/:role" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/latam-freelancer" element={<PromoLatamFreelancer />} />
          <Route path="/philippino-freelancer" element={<PromoPhilippinoFreelancer />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact-support" element={<ContactSupport />} />
           <Route path="/report-issue" element={<ReportIssue />} />
           <Route path="/share-story" element={<ShareStory />} />

        <Route element={<RequireAuth allowed={['employer']} />}>
          <Route path="/employer-dashboard" element={<EmployerDashboard />}>
            <Route index element={<EmployerOverview />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="my-job-posts" element={<MyJobPosts />} />
            <Route path="post-job" element={<PostJob />} />
            <Route path="messages" element={<Messages />} />
            <Route path="report-issue" element={<ReportIssue />} />
            <Route path="share-story" element={<ShareStory />} />
          </Route>
        </Route> 

        <Route element={<RequireAuth allowed={['jobseeker']} />}>
          <Route path="/jobseeker-dashboard" element={<JobseekerDashboard />}>
            <Route index element={<JobseekerOverview />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="my-applications" element={<MyApplications />} />
            <Route path="messages" element={<Messages />} />
            <Route path="report-issue" element={<ReportIssue />} />
            <Route path="share-story" element={<ShareStory />} />
          </Route>
        </Route>
         
          <Route path="/admin/email-notifications" element={<EmailNotifications />} />
          <Route path="/public-profile/:id" element={<PublicProfile />} />
          <Route path="/check-email" element={<CheckEmail />} />
          <Route path="/registration-pending" element={<RegistrationPending />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/my-job-posts" element={<MyJobPosts />} />
          <Route path="/my-applications" element={<MyApplications />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/moderator" element={<ModeratorDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/reset-password/confirm" element={<ConfirmResetPassword />} />
          <Route path="/how-it-works/jobseeker-faq" element={<HowItWorksJobseekerFAQ />} />
          <Route path="/how-it-works/employer-faq" element={<HowItWorksEmployerFAQ />} />
          <Route path="/client-stories" element={<Clientstories />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/real-results" element={<RealResults />} />
          <Route path="/find-job" element={<FindJob />} />
          <Route path="/find-talent" element={<FindTalent />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/reviews/:id" element={<UserReviews />} />
          <Route path="/va-categories" element={<VACategories />} />
          <Route path="/profile-tips" element={<ProfileTips />} />
          <Route path="/skill-test" element={<SkillTest />} />
          <Route path="/success-stories" element={<SuccessStories />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/blog" element={<Blog />} />
          <Route element={<RequireAuth allowed={['employer', 'jobseeker']} />}>
  <Route
    path="/messages"
    element={<Navigate to="/jobseeker-dashboard/messages" replace />}
  />
</Route>
         
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/complaint" element={<Complaint />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </Router>
    </RoleProvider>
    </HelmetProvider>
  );
};

export default App;