import React from 'react';
import { Briefcase, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '../assets/hero-partnership.jpg';
import '../styles/affiliate.css';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';
import Header from '../components/Header';
import { brand, brandOrigin } from '../brand';

const AffiliateLandingPage: React.FC = () => {
  const plans = [
    {
      icon: Briefcase,
      title: 'Business Recruitment',
      description: 'Recruit companies looking to hire',
      earning: '$200',
      unit: 'per business',
      details: 'Earn a straight CPA when you bring businesses onto our platform.',
      colorClass: 'al-plan-icon--business',
    },
    {
      icon: Users,
      title: 'Freelancer Pipeline',
      description: 'Connect talented freelancers',
      earning: '$2',
      unit: 'per qualified lead',
      details: 'Get paid for freelancers who complete their first interview.',
      colorClass: 'al-plan-icon--freelancer',
    },
    {
      icon: TrendingUp,
      title: 'Revenue Share',
      description: 'Build long-term recurring income',
      earning: '50%',
      unit: 'revenue split',
      details: 'Share in ongoing platform revenue from your referrals.',
      colorClass: 'al-plan-icon--revenue',
    },
  ];

  const benefits = [
    'No cap on earnings – your potential is unlimited.',
    'Fast weekly payouts directly to your account.',
    'Real-time dashboard to track all your referrals.',
    'Dedicated affiliate support team.',
    'Marketing materials and resources provided.',
    'Flexible payment options available.',
  ];

  // формируем email вида affiliates@brand.domain
  const affiliateEmail = `affiliates@${brand.domain}`;
  const origin = brandOrigin();
    const supportEmail = `support@${new URL(origin).host}`;

  return (
    <div className="al-page">
      <Header />

      {/* HERO */}
      <section className="al-hero">
        <div className="al-hero-bg" />
        <div className="al-hero-image">
          <img src={heroImage} alt="Partnership and growth" />
        </div>

        <div className="al-container">
          <div className="al-hero-inner al-animate-fade-in">
            <h1 className="al-hero-title">
              <span>Turn Connections Into Cash</span>
            </h1>
            <p className="al-hero-subtitle">
              Join our affiliate program and earn up to $200 per business or share 50% of revenue.
            </p>
            {/* Кнопка → регистрация аффилейта */}
            <Link to="/affiliate/register" className="al-btn al-btn--primary al-hero-btn">
              Start Earning Today
            </Link>
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="al-section al-section--plans">
        <div className="al-container">
          <div className="al-section-head al-animate-fade-in">
            <h2 className="al-section-title">Choose Your Path to Profit</h2>
            <p className="al-section-subtitle">
              Pick the affiliate plan that matches your network and watch your earnings grow.
            </p>
          </div>

          <div className="al-plans-grid">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <article
                  key={plan.title}
                  className="al-card al-animate-fade-in"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className={`al-plan-icon ${plan.colorClass}`}>
                    <Icon className="al-plan-icon__svg" />
                  </div>

                  <h3 className="al-card-title">{plan.title}</h3>
                  <p className="al-card-desc">{plan.description}</p>

                  <div className="al-plan-earning">
                    <div className="al-plan-earning__value">{plan.earning}</div>
                    <div className="al-plan-earning__unit">{plan.unit}</div>
                  </div>

                  <p className="al-card-text">{plan.details}</p>

                  {/* Кнопка плана → регистрация аффилейта */}
                  <Link
                    to="/affiliate/register"
                    className={
                      index === 1
                        ? 'al-btn al-btn--primary al-btn--full'
                        : 'al-btn al-btn--outline al-btn--full'
                    }
                  >
                    Get Started
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="al-section al-section--benefits">
        <div className="al-container al-container--narrow">
          <div className="al-section-head al-animate-fade-in">
            <h2 className="al-section-title">Why Partner With Us?</h2>
            <p className="al-section-subtitle">
              Everything you need to succeed as an affiliate.
            </p>
          </div>

          <div className="al-benefits-grid">
            {benefits.map((benefit, index) => (
              <div
                key={benefit}
                className="al-benefit-card al-animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <CheckCircle className="al-benefit-icon" />
                <span className="al-benefit-text">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="al-section al-section--cta">
        <div className="al-container al-container--narrow">
          <div className="al-cta-card al-animate-fade-in">
            <h2 className="al-cta-title">Ready to Start Earning?</h2>
            <p className="al-cta-subtitle">
              Join hundreds of affiliates already earning with our program.
            </p>

            <form
              className="al-cta-form"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
          
              {/* Кнопка CTA → регистрация аффилейта */}
              <Link to="/affiliate/register" className="al-btn al-btn--secondary al-btn--lg">
                Get Started
              </Link>
            </form>

            <p className="al-cta-note">
              Questions? Contact us at{' '}
              {/* <a href={`mailto:${affiliateEmail}`}>{affiliateEmail}</a> */}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <Copyright />
    </div>
  );
};

export default AffiliateLandingPage;
