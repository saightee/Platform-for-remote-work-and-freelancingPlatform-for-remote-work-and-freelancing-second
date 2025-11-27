import { MapPin } from "lucide-react";
import freelancer1 from "../assets/freelancer-1.jpg";
import freelancer2 from "../assets/freelancer-2.jpg";
import freelancer3 from "../assets/freelancer-3.jpg";
import { Link } from 'react-router-dom';

const FeaturedFreelancers = () => {
  const freelancers = [
    {
      name: "Sarah Chen",
      title: "Full Stack Developer",
      location: "Remote, Philippines",
      age: 28,
      hourlyRate: "$45",
      skills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
      image: freelancer1,
    },
    {
      name: "Miguel Santos",
      title: "UI/UX Designer",
      location: "Remote, Philippines",
      age: 32,
      hourlyRate: "$40",
      skills: ["Figma", "Adobe XD", "Prototyping", "Branding"],
      image: freelancer2,
    },
    {
      name: "Elena Rodriguez",
      title: "Digital Marketing Specialist",
      location: "Remote, Philippines",
      age: 29,
      hourlyRate: "$35",
      skills: ["SEO", "Google Ads", "Content Strategy", "Analytics"],
      image: freelancer3,
    },
    {
      name: "James Liu",
      title: "Virtual Assistant",
      location: "Remote, Philippines",
      age: 26,
      hourlyRate: "$25",
      skills: ["Admin Support", "Customer Service", "Data Entry", "Scheduling"],
      image: freelancer1,
    },
    {
      name: "Ana Martinez",
      title: "Content Writer",
      location: "Remote, Philippines",
      age: 30,
      hourlyRate: "$30",
      skills: ["SEO Writing", "Copywriting", "Blog Posts", "Technical Writing"],
      image: freelancer2,
    },
    {
      name: "David Park",
      title: "Data Analyst",
      location: "Remote, Philippines",
      age: 27,
      hourlyRate: "$38",
      skills: ["Python", "SQL", "Data Visualization", "Excel"],
      image: freelancer3,
    },
  ];

  return (
    <section id="freelancers" className="oj-section oj-section--talent">
      <div className="oj-section-inner">
        <header className="oj-section-header oj-section-header--center">
          <h2 className="oj-section-title">Featured Talent</h2>
          <p className="oj-section-subtitle">
            Connect with skilled professionals ready to bring your projects to life
          </p>
        </header>

        <div className="oj-freelancers-grid">
          {freelancers.map((freelancer, index) => (
            <article key={index} className="oj-freelancer-card">
              <div className="oj-freelancer-avatar-wrap">
                <img
                  src={freelancer.image}
                  alt={freelancer.name}
                  className="oj-freelancer-avatar"
                />
              </div>

              <h3 className="oj-freelancer-name">{freelancer.name}</h3>
              <p className="oj-freelancer-title">{freelancer.title}</p>

              <div className="oj-freelancer-location">
                <MapPin className="oj-freelancer-location-icon" />
                <span>{freelancer.location}</span>
              </div>

              <div className="oj-freelancer-stats">
                <div className="oj-freelancer-stat">
                  <div className="oj-freelancer-stat-label">Age</div>
                  <div className="oj-freelancer-stat-value">
                    {freelancer.age} yrs
                  </div>
                </div>

                <div className="oj-freelancer-stat-divider" />

                <div className="oj-freelancer-stat">
                  <div className="oj-freelancer-stat-label">Rate</div>
                  <div className="oj-freelancer-stat-value oj-freelancer-stat-rate">
                    {freelancer.hourlyRate}/hr
                  </div>
                </div>
              </div>

              <div className="oj-freelancer-skills">
                {freelancer.skills.slice(0, 3).map((skill, i) => (
                  <span key={i} className="oj-chip oj-chip--secondary">
                    {skill}
                  </span>
                ))}
                {freelancer.skills.length > 3 && (
                  <span className="oj-chip oj-chip--secondary">
                    +{freelancer.skills.length - 3}
                  </span>
                )}
              </div>

              <button className="oj-btn oj-btn--primary oj-freelancer-btn">
                View Profile
              </button>
            </article>
          ))}
        </div>

        <div className="oj-freelancers-footer">
              <Link to="/find-talent" className="oj-btn oj-btn--hero">
            Browse All Talents
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedFreelancers;
