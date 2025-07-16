import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';


const Blog: React.FC = () => {
  return (
    <div>
      <Header />
      <div className="container">
        <h2>Blog</h2>
        <p>Stay updated with the latest tips, trends, and insights in remote work.</p>
        <div className="job-grid">
          <div className="job-card">
            <div className="job-title-row">
              <h3>Top 5 Tips for Remote Work</h3>
              <span className="job-posted-date">May 20, 2025</span>
            </div>
            <p>Learn how to thrive in a remote work environment.</p>
            <div className="job-card-footer">
              <a href="/blog/post1" className="view-details-button">Read More</a>
            </div>
          </div>
          <div className="job-card">
            <div className="job-title-row">
              <h3>Hiring VAs: Best Practices</h3>
              <span className="job-posted-date">May 15, 2025</span>
            </div>
            <p>Discover strategies for finding the perfect virtual assistant.</p>
            <div className="job-card-footer">
              <a href="/blog/post2" className="view-details-button">Read More</a>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <Copyright />
    </div>
  );
};

export default Blog;