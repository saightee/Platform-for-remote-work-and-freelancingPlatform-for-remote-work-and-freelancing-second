import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getMyApplications, createReview } from '../services/api';
import { JobApplication } from '@types';
import { useRole } from '../context/RoleContext';
import Copyright from '../components/Copyright';

const MyApplications: React.FC = () => {
  const { profile } = useRole();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');

  useEffect(() => {
    const fetchApplications = async () => {
      if (profile?.role !== 'jobseeker') {
        setApplications([]);
        return;
      }

      try {
        const apps = await getMyApplications();
        setApplications(apps);
      } catch (error) {
        console.error('Error fetching applications:', error);
      }
    };
    fetchApplications();
  }, [profile]);

  const handleAddReview = async (jobApplicationId: string) => {
    try {
      await createReview({ job_application_id: jobApplicationId, rating, comment });
      alert('Review submitted successfully!');
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review.');
    }
  };

  if (profile?.role !== 'jobseeker') {
    return (
      <div>
        <Header />
        <div className="container">
          <h2>My Applications</h2>
          <p>This page is only available for Jobseekers.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="container">
        <h2>My Applications</h2>
        {applications.length > 0 ? (
          applications.map((app) => (
            <div key={app.id} className="job-card">
              <h3>{app.job_post?.title}</h3>
              <p>Status: {app.status}</p>
              {app.status === 'Accepted' && (
                <div>
                  <h4>Add Review for Employer</h4>
                  <div className="form-group">
                    <label>Rating (1-5):</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Comment:</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>
                  <button onClick={() => handleAddReview(app.id)}>Submit Review</button>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>No applications found.</p>
        )}
      </div>
      <Footer />
         <Copyright />
    </div>
  );
};

export default MyApplications;