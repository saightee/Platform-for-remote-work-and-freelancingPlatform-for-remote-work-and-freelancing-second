import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright'; // Добавили импорт

const HowItWorksEmployerFAQ: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h1>Employer FAQ</h1>
        <h2>Frequently Asked Questions for Employers</h2>
        <div className="faq-list">
          <div className="faq-item">
            <h3>1. How do I post a job?</h3>
            <p>After signing up as an employer, go to "Post a Job" from the navigation bar, fill out the job details, and submit.</p>
          </div>
          <div className="faq-item">
            <h3>2. Is there a cost to post a job?</h3>
            <p>Check our Pricing page for details. We offer free and premium plans for job postings.</p>
          </div>
          <div className="faq-item">
            <h3>3. Can I edit a job posting after submitting?</h3>
            <p>Yes, you can edit your job postings from the "My Job Posts" page.</p>
          </div>
          <div className="faq-item">
            <h3>4. How do I review applications?</h3>
            <p>Go to "My Job Posts," select a posting, and click "View Applications" to see all applicants.</p>
          </div>
          <div className="faq-item">
            <h3>5. Can I set a limit on applications?</h3>
            <p>Yes, you can set an application limit when creating or editing a job posting.</p>
          </div>
          <div className="faq-item">
            <h3>6. How do I contact a candidate?</h3>
            <p>After accepting an application, you can message the candidate directly through the platform.</p>
          </div>
          <div className="faq-item">
            <h3>7. Can I close a job posting?</h3>
            <p>Yes, you can close a job posting from the "My Job Posts" page at any time.</p>
          </div>
          <div className="faq-item">
            <h3>8. How do I leave a review for a jobseeker?</h3>
            <p>After completing a job, you can leave a review on the jobseeker’s profile via the application details.</p>
          </div>
          <div className="faq-item">
            <h3>9. Are there analytics for my job postings?</h3>
            <p>Yes, premium plans include analytics to track views, applications, and more for your postings.</p>
          </div>
          <div className="faq-item">
            <h3>10. How do I upgrade my plan?</h3>
            <p>Visit the Pricing page, choose a plan, and follow the instructions to upgrade.</p>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default HowItWorksEmployerFAQ;