import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getEmailStatsForJob } from '../services/api';
import { format } from 'date-fns';

const EmailNotifications: React.FC = () => {
  const location = useLocation();
  const jobPostId = location.state?.jobPostId as string;
  const [stats, setStats] = useState<{ sent: number; opened: number; clicked: number; details: { email: string; username: string; opened: boolean; clicked: boolean; sent_at: string; opened_at: string | null; clicked_at: string | null; }[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobPostId) {
      const fetchStats = async () => {
        try {
          setIsLoading(true);
          const data = await getEmailStatsForJob(jobPostId);
          setStats(data);
        } catch (err) {
          setError('Failed to load email stats.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchStats();
    } else {
      setError('No job post ID provided.');
      setIsLoading(false);
    }
  }, [jobPostId]);

  if (isLoading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div>
      <h2>Email Notifications for Job Post ID: {jobPostId}</h2>
      <p><strong>Sent:</strong> {stats?.sent}</p>
      <p><strong>Opened:</strong> {stats?.opened}</p>
      <p><strong>Clicked:</strong> {stats?.clicked}</p>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Username</th>
            <th>Opened</th>
            <th>Clicked</th>
            <th>Sent At</th>
            <th>Opened At</th>
            <th>Clicked At</th>
          </tr>
        </thead>
        <tbody>
          {stats?.details.map((detail, index) => (
            <tr key={index}>
              <td>{detail.email}</td>
              <td>{detail.username}</td>
              <td>{detail.opened ? 'Yes' : 'No'}</td>
              <td>{detail.clicked ? 'Yes' : 'No'}</td>
              <td>{format(new Date(detail.sent_at), 'PPpp')}</td>
              <td>{detail.opened_at ? format(new Date(detail.opened_at), 'PPpp') : 'N/A'}</td>
              <td>{detail.clicked_at ? format(new Date(detail.clicked_at), 'PPpp') : 'N/A'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmailNotifications;