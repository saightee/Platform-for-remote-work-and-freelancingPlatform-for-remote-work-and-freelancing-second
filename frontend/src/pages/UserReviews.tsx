// src/pages/UserReviews.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getReviewsForUser } from '../services/api';
import { Review } from '@types';

const UserReviews: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        if (id) {
          setLoading(true);
          const reviewsData = await getReviewsForUser(id);
          setReviews(reviewsData);
        }
      } catch (err: any) {
        console.error('Error fetching reviews:', err);
        setError(err.response?.data?.message || 'Failed to load reviews.');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [id]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div>
      <Header />
      <div className="container">
        <h2>User Reviews</h2>
        {reviews.length > 0 ? (
          <div className="review-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-item">
                <h3>Rating: {review.rating}/5</h3>
                <p><strong>Comment:</strong> {review.comment}</p>
                <p><strong>Reviewer:</strong> {review.reviewer?.username || 'Anonymous'}</p>
                <p><strong>Date:</strong> {review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Not specified'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>No reviews found for this user.</p>
        )}
      </div>
    </div>
  );
};

export default UserReviews;