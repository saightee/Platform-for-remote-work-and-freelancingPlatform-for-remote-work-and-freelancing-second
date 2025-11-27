import { Briefcase, MessageSquare, UserCheck, Search, Mail, Handshake } from "lucide-react";
import '../styles/lovable-home.css';

const HowItWorks: React.FC = () => {
  const employerSteps = [
    {
      icon: <Briefcase />,
      title: 'Post Your Job',
      description: 'Pay a one-time fee and create your job listing with detailed requirements.',
    },
    {
      icon: <MessageSquare />,
      title: 'Receive Applications',
      description: 'Get up to 50 qualified candidates applying through our messaging system.',
    },
    {
      icon: <UserCheck />,
      title: 'Interview & Hire',
      description: 'Interview candidates and make your choice.',
    },
  ];

  const freelancerSteps = [
    {
      icon: <Search />,
      title: 'Browse Jobs',
      description: 'Explore job listings that match your skills and expertise.',
    },
    {
      icon: <Mail />,
      title: 'Apply with a Message',
      description: "Send a direct message to employers showing you're the right fit.",
    },
    {
      icon: <Handshake />,
      title: 'Get Hired',
      description: 'Interview with employers and start working on projects.',
    },
  ];

  return (
    <section id="how-it-works" className="oj-section oj-section--muted">
      <div className="oj-section-inner">
        <div className="oj-section-header oj-section-header--center">
          <h2 className="oj-section-title">How It Works</h2>
          <p className="oj-section-subtitle">
            Simple, straightforward, and effective for both employers and jobseekers.
          </p>
        </div>

        <div className="oj-hiw-block">
          <h3 className="oj-hiw-title">For Employers</h3>
          <div className="oj-hiw-grid">
            {employerSteps.map((step, index) => (
              <div key={index} className="oj-hiw-card">
                <div className="oj-hiw-icon">{step.icon}</div>
                <div className="oj-hiw-step-number">{index + 1}</div>
                <h4 className="oj-hiw-card-title">{step.title}</h4>
                <p className="oj-hiw-card-text">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="oj-hiw-block" id="for-freelancers">
          <h3 className="oj-hiw-title">For Freelancers</h3>
          <div className="oj-hiw-grid">
            {freelancerSteps.map((step, index) => (
              <div key={index} className="oj-hiw-card oj-hiw-card--accent">
                <div className="oj-hiw-icon">{step.icon}</div>
                <div className="oj-hiw-step-number oj-hiw-step-number--accent">
                  {index + 1}
                </div>
                <h4 className="oj-hiw-card-title">{step.title}</h4>
                <p className="oj-hiw-card-text">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
