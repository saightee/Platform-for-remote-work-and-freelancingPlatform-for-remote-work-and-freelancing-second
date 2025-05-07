import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import '../styles/JobDetailsPage.css';

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  datePosted: string;
  hoursPerWeek: string;
  duration: string;
  experienceLevel: string;
}

const JobDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    const mockJobs: Job[] = [
      {
        id: 1,
        title: 'Operations Customer Experience Assistant',
        company: 'Anonymous',
        location: 'Remote',
        salary: '$6.80/hr',
        type: 'Part Time',
        description: 'Looking for a detail-oriented Operations Customer Experience Assistant to join our team remotely. You will be responsible for ensuring a seamless customer experience, handling inquiries, and supporting operational tasks. Requirements: strong communication skills, basic knowledge of customer service tools, and ability to work 20 hours per week. Prior experience in customer service is a plus but not required.',
        datePosted: 'Apr 18, 2025',
        hoursPerWeek: '20 hrs/wk',
        duration: 'Long Term',
        experienceLevel: 'Entry Level',
      },
      {
        id: 2,
        title: 'Virtual Assistant for Marketing',
        company: 'Anonymous',
        location: 'Remote',
        salary: '$8.00/hr',
        type: 'Full Time',
        description: 'We are seeking a Virtual Assistant to support our marketing team. Responsibilities include managing social media accounts, scheduling posts, and coordinating email campaigns. Requirements: experience with Canva, social media platforms, and email marketing tools. Must be available for 40 hours per week.',
        datePosted: 'Apr 20, 2025',
        hoursPerWeek: '40 hrs/wk',
        duration: 'Long Term',
        experienceLevel: 'Intermediate',
      },
    ];

    const selectedJob = mockJobs.find((job) => job.id === parseInt(id || '0'));
    setJob(selectedJob || null);
  }, [id]);

  if (!job) {
    return <div>Job not found</div>;
  }

  return (
    <div className="job-details-page">
      <Link to="/jobs" className="back-link">← Back to Job Listings</Link>
      <h1>{job.title}</h1>
      <div className="job-meta">
        <p><strong>ID:</strong> {job.id}</p>
        <p><strong>Posted:</strong> {job.datePosted}</p>
        <p><strong>Type:</strong> {job.type}</p>
        <p><strong>Hours:</strong> {job.hoursPerWeek}</p>
        <p><strong>Salary:</strong> {job.salary}</p>
        <p><strong>Duration:</strong> {job.duration}</p>
        <p><strong>Experience Level:</strong> {job.experienceLevel}</p>
      </div>
      <button className="apply-btn">Apply for this position</button>
      <div className="job-description">
        <h2>Job Description</h2>
        <p>{job.description}</p>
      </div>
      <div className="company-info">
        <h2>About the Company</h2>
        <p><strong>{job.company}</strong></p>
        <p>No additional company information available.</p>
      </div>
      <div className="share-job">
        <h3>Share this Job</h3>
        <button className="share-btn">Share on Twitter</button>
        <button className="share-btn">Share on LinkedIn</button>
        <button className="share-btn">Share on Facebook</button>
      </div>
    </div>
  );
};

export default JobDetailsPage;