import React from 'react';
import '../styles/MyAccount.css';
import JobPostCard from './JobPostCard';
import WorkerCard from './WorkerCard';
import GuideCard from './GuideCard';
import mockData from '../mockData.json';

const MyAccount: React.FC = () => {
  const { jobPosts, workers, guides } = mockData;

  return (
    <div className="my-account">
      <div className="welcome-section">
        <h1>Hello, Lendtry!</h1>
        <div className="upgrade-box">
          <div className="upgrade-content">
            <img src="/rocket-icon.png" alt="Rocket Icon" className="rocket-icon" />
            <div>
              <h2>Make hiring more efficient with an upgraded account.</h2>
              <p>Upgrading will get your job posts approved instantly, allow you to contact workers, and get tons of other benefits that will improve your hiring process.</p>
              <button className="green-button">View Pricing</button>
            </div>
          </div>
        </div>
      </div>

      <div className="payment-section">
        <h2>Pay Your Workers Easy and Conveniently</h2>
        <div className="payment-box">
          <div className="payment-image">
            <img src="/payment-icon.png" alt="Payment Icon" />
          </div>
          <div className="payment-features">
            <ul>
              <li><span className="checkmark">✔</span> Keep all your workers in one place</li>
              <li><span className="checkmark">✔</span> Uses the actual exchange rate</li>
              <li><span className="checkmark">✔</span> No fees</li>
              <li><span className="checkmark">✔</span> Reminds you how much you paid last time</li>
              <li><span className="checkmark">✔</span> Still can use Easypay after unsubscribing</li>
            </ul>
            <button className="green-button">Pay Workers with EasyPay</button>
          </div>
        </div>
      </div>

      <div className="job-posts-section">
        <h2>Your Job Posts</h2>
        {jobPosts.length === 0 ? (
          <p>Your job posts will appear here.</p>
        ) : (
          jobPosts.map(post => <JobPostCard key={post.id} title={post.title} status={post.status} />)
        )}
        <button className="green-button">Add My First Job Post</button>
      </div>

      <div className="workers-section">
        <h2>Your Workers</h2>
        {workers.length === 0 ? (
          <p>Your workers will appear here.</p>
        ) : (
          workers.map(worker => <WorkerCard key={worker.id} name={worker.name} role={worker.role} />)
        )}
      </div>

      <div className="invite-section">
        <h2>Invite Friends to OnlineJobs.ph and Earn a 40% Lifetime Commission</h2>
        <p>Share Your Referral Link:</p>
        <div className="referral-link">
          <input type="text" value="http://store.onlinejobs.ph/?aid=723541" readOnly />
          <button className="green-button">Copy Link</button>
        </div>
        <a href="#" className="learn-more">Affiliate Area - Learn More</a>
      </div>

      <div className="guides-section">
        <h2>Your Guides for Outsourcing</h2>
        <div className="guides-grid">
          {guides.map((guide, index) => (
            <GuideCard key={index} title={guide.title} link={guide.link} />
          ))}
        </div>
        <a href="#" className="see-more">See More</a>
      </div>
    </div>
  );
};

export default MyAccount;