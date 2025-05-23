import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright'; // Добавили импорт

const HowItWorksJobseekerFAQ: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h1>Jobseeker FAQ</h1>
        <h2>Frequently Asked Questions for Jobseekers</h2>
        <div className="faq-list">
          <div className="faq-item">
            <h3>1. How do I create an account?</h3>
            <p>Click "Sign up" on the homepage, choose "Jobseeker" role, and fill out the registration form with your details.</p>
          </div>
          <div className="faq-item">
            <h3>2. Can I apply to multiple jobs?</h3>
            <p>Yes, you can apply to as many jobs as you like, as long as you meet the requirements for each position.</p>
          </div>
          <div className="faq-item">
            <h3>3. How do I upload my resume?</h3>
            <p>Go to your profile page and use the "Upload Resume" option to add your resume in PDF format.</p>
          </div>
          <div className="faq-item">
            <h3>4. What happens after I apply for a job?</h3>
            <p>The employer will review your application. You’ll be notified if you’re shortlisted or if the employer needs more information.</p>
          </div>
          <div className="faq-item">
            <h3>5. Can I edit my application after submitting?</h3>
            <p>No, once submitted, applications cannot be edited. However, you can withdraw and reapply if the job posting is still active.</p>
          </div>
          <div className="faq-item">
            <h3>6. How do I track my application status?</h3>
            <p>Visit the "My Applications" page to see the status of all your applications (Pending, Accepted, Rejected).</p>
          </div>
          <div className="faq-item">
            <h3>7. Is there a limit to how many jobs I can apply for?</h3>
            <p>No, there’s no limit, but some employers may set application limits for their postings.</p>
          </div>
          <div className="faq-item">
            <h3>8. Can I contact employers directly?</h3>
            <p>You can message employers through the platform after your application has been accepted.</p>
          </div>
          <div className="faq-item">
            <h3>9. How do I leave a review for an employer?</h3>
            <p>After a job is completed, you can leave a review on the employer’s profile via the "My Applications" page.</p>
          </div>
          <div className="faq-item">
            <h3>10. Is my personal information secure?</h3>
            <p>Yes, we use encryption and follow strict privacy policies to protect your data.</p>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default HowItWorksJobseekerFAQ;