import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import { getReviewsForUser } from '../services/api';
import { Review } from '@types';
import '../styles/user-reviews.css';

const formatDate = (iso?: string) => {
  if (!iso) return 'Not specified';
  // DD.MM.YYYY независимо от локали
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
};

const UserReviews: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        if (!id) return;
        setLoading(true);
        setError(null);
        const reviewsData = await getReviewsForUser(id);
        setReviews(reviewsData || []);
      } catch (err: any) {
        console.error('Error fetching reviews:', err);
        setError(err?.response?.data?.message || 'Failed to load reviews.');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [id]);

  return (
    <div className="ur-shell">
      <Header />

      <main className="ur-main">
        <div className="ur-container">
          <h1 className="ur-title">User Reviews</h1>

          {loading && (
            <div className="ur-status ur-loading" role="status">Loading…</div>
          )}

          {!loading && error && (
            <div className="ur-status ur-error">{error}</div>
          )}

          {!loading && !error && (
            <>
              {reviews.length > 0 ? (
                <ul className="ur-list" aria-live="polite">
                  {reviews.map((review) => (
                    <li className="ur-card" key={review.id}>
                      <div className="ur-card__head">
                        <div className="ur-rating">
                          <span className="ur-rating__value">
                            {review.rating}
                          </span>
                          <span className="ur-rating__of">/5</span>
                        </div>

                        <div className="ur-meta">
                          <span className="ur-meta__item">
                            <span className="ur-k">Reviewer:</span>
                            <span className="ur-v">{review.reviewer?.username || 'Anonymous'}</span>
                          </span>
                          <span className="ur-meta__item">
                            <span className="ur-k">Date:</span>
                            <span className="ur-v">{formatDate(review.created_at)}</span>
                          </span>
                        </div>
                      </div>

                      {review.comment && (
                        <p className="ur-comment">
                          {review.comment}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="ur-empty">
                  No reviews found for this user.
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* футер прижат к низу за счёт flex-раскладки оболочки */}
      <div className="ur-bottom">
        <Footer />
        <Copyright />
      </div>
    </div>
  );
};

export default UserReviews;
