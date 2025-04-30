import React from 'react';
import '../styles/JobPostings.css';

interface Job {
  company: string;
  type: string;
  location: string;
  salary: string;
}

const jobs: Job[] = [
  { company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
  { company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
  { company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
  { company: 'TechSolutions Inc.', type: 'Remote, Full-time', location: 'Anywhere', salary: '$25-$35/hour' },
  { company: 'Social Media Co.', type: 'Remote, Part-time', location: 'Europe', salary: '$1500-$2000/month' },
  { company: 'Data Entry Specialist', type: 'Remote, Contract', location: 'Worldwide', salary: '$18-$22/hour' },
];

const JobPostings: React.FC = () => {
  return (
    <section className="job-postings">
      <div className="job-header">
        <h2>Recent Job Postings</h2>
        <a href="#">View all jobs</a>
      </div>
      <div className="job-grid">
        {jobs.map((job, index) => (
          <div key={index} className="job-card">
            <h3>Executive Virtual Assistant</h3>
            <p>{job.company}</p>
            <p>{job.type} • {job.location}</p>
            <p className="salary">{job.salary}</p>
            <button>Apply</button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default JobPostings;