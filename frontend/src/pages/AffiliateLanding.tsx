import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/affiliate.css';
import { FaBullseye, FaFingerprint, FaChartLine } from 'react-icons/fa';


import Header from '../components/Header';
import Footer from '../components/Footer';
import Copyright from '../components/Copyright';

const AffiliateLanding: React.FC = () => {
  return (
    <div className="aff-layout">
      <Header />

      <main className="aff-page aff-page--light">
        {/* HERO */}
        <section className="aff-hero aff-hero--band">
          <div className="aff-hero-inner">
            <div className="aff-hero-content">
              <h1 className="aff-hero-title">
                Earn with <span>our Affiliate Program</span>
              </h1>
              <p className="aff-hero-subtitle">
                Recommend our platform to employers and remote talents. When they pay for plans,
                you earn a recurring commission for as long as they stay active.
              </p>

              <div className="aff-hero-actions">
                <Link to="/affiliate/register" className="aff-btn aff-btn--primary">
                  Become an affiliate
                </Link>
                <a href="#how-it-works" className="aff-btn aff-btn--ghost">
                  How it works
                </a>
              </div>

              <p className="aff-hero-note">
                Already an affiliate?{' '}
                <Link to="/login" className="aff-link">
                  Log in
                </Link>
              </p>
            </div>

            {/* карты справа, друг под другом */}
            <div className="aff-hero-stats">
              <div className="aff-stat-card">
                <div className="aff-stat-label">Up to</div>
                <div className="aff-stat-value">30%</div>
                <div className="aff-stat-desc">revenue share per paid plan</div>
              </div>
              <div className="aff-stat-card">
                <div className="aff-stat-label">Tracking</div>
                <div className="aff-stat-value">60 days</div>
                <div className="aff-stat-desc">cookie &amp; referral code</div>
              </div>
              <div className="aff-stat-card">
                <div className="aff-stat-label">Payouts</div>
                <div className="aff-stat-value">Monthly</div>
                <div className="aff-stat-desc">PayPal / bank / crypto*</div>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT PROGRAM IS */}
        <section className="aff-section">
          <div className="aff-section-inner aff-section-inner--split">
            <div className="aff-text-block">
              <h2 className="aff-section-title">What is our affiliate program?</h2>
              <p className="aff-lead">
                In simple words: you help people discover our platform, and we share part of the
                revenue we receive from them.
              </p>
              <ul className="aff-list">
                <li>
                  <strong>You share</strong> your personal referral link with employers and
                  freelancers who might need remote talent or remote jobs.
                </li>
                <li>
                  <strong>They register</strong> and purchase a paid plan when they are ready.
                </li>
                <li>
                  <strong>You earn</strong> a percentage of what they pay — not just once, but
                  every renewal while they stay on a paid plan.
                </li>
              </ul>
              <p className="aff-note">
                It&apos;s a performance-based partnership: we only pay when your referrals become
                real paying customers, so you&apos;re never “selling nothing”.
              </p>
            </div>

            <div className="aff-highlight-box">
              <h3>Designed for content creators, media buyers &amp; communities</h3>
              <p>
                The program is a good fit if you run a blog, YouTube channel, agency, newsletter or
                niche community about remote work, hiring, outsourcing, productivity or online
                business.
              </p>
              <p>
                You don&apos;t have to be a paying customer yourself to participate — you just need
                an audience that can genuinely benefit from our platform.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="aff-section aff-section--steps">
          <div className="aff-section-inner">
            <h2 className="aff-section-title">How the affiliate program works</h2>
            <p className="aff-lead aff-lead--center">
              Three simple steps from application to recurring commissions.
            </p>

            <div className="aff-steps-line">
              <div className="aff-step">
                <span className="aff-step-number">1</span>
                <h3>Apply &amp; get approved</h3>
                <p>
                  Submit a short application with your website and traffic sources. We quickly
                  review it to protect the program from spam and low-quality traffic.
                </p>
              </div>

              <div className="aff-step-arrow" aria-hidden="true">
                <span className="aff-step-arrow-icon">➜</span>
              </div>

              <div className="aff-step">
                <span className="aff-step-number">2</span>
                <h3>Get your referral link</h3>
                <p>
                  After approval, you receive your personal link. Place it on landing pages, review
                  posts, comparison articles, email campaigns or social media.
                </p>
              </div>

              <div className="aff-step-arrow" aria-hidden="true">
                <span className="aff-step-arrow-icon">➜</span>
              </div>

              <div className="aff-step">
                <span className="aff-step-number">3</span>
                <h3>Earn recurring commissions</h3>
                <p>
                  When referred users pay for plans, you get a share of the revenue. Renewals count
                  too — so one good referral can bring you multiple payouts over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* EXAMPLE BAND */}
        <section className="aff-section aff-section--band">
          <div className="aff-section-inner aff-section-inner--narrow">
            <h2 className="aff-section-title">Example: what earnings can look like</h2>
            <p className="aff-lead aff-lead--center">
              This is a simplified example to show the idea. Real numbers will depend on plans and
              your traffic quality.
            </p>

            <div className="aff-example-timeline">
              <div className="aff-example-item">
                <div className="aff-example-badge">Day 1</div>
                <h3>You share your link</h3>
                <p>
                  You publish a review of our platform on your blog and add your affiliate link,
                  or send it to your email list of agency owners and founders.
                </p>
              </div>
              <div className="aff-example-item">
                <div className="aff-example-badge">Day 7</div>
                <h3>Referral signs up &amp; upgrades</h3>
                <p>
                  One of your readers signs up and later upgrades to a paid plan. You earn up to
                  30% of the amount we receive from their payment.
                </p>
              </div>
              <div className="aff-example-item">
                <div className="aff-example-badge">Month 2+</div>
                <h3>Renewals keep paying you</h3>
                <p>
                  As long as this customer keeps their subscription active, you continue to receive
                  commission on future renewals. The more loyal customers you bring, the more your
                  recurring income grows.
                </p>
              </div>
            </div>

            <p className="aff-footnote aff-footnote--center">
              * Exact commission rates and payout thresholds are defined in the affiliate agreement
              and may change over time. Always check the latest terms inside your dashboard.
            </p>
          </div>
        </section>

        {/* WHY PARTNERS CHOOSE — ГРИД + АККОРДЕОН */}
        <section className="aff-section">
          <div className="aff-section-inner">
            <h2 className="aff-section-title">Why partners choose our program</h2>

            {/* десктоп / большие экраны */}
            <div className="aff-grid aff-grid--3 aff-grid--desktop">
              <div className="aff-card">
                <div className="aff-card-head">
                  <FaBullseye className="aff-card-icon" />
                  <h3>High-intent audience</h3>
                </div>
                <p>
                  The platform is built for employers hiring remote talent and jobseekers looking
                  for online work — not random traffic. That means better conversion for you.
                </p>
              </div>
              <div className="aff-card">
                <div className="aff-card-head">
                  <FaFingerprint className="aff-card-icon" />
                  <h3>Honest tracking</h3>
                </div>
                <p>
                  We use referral links and cookies to attribute signups. If someone follows your
                  link and upgrades within the tracking window, the commission is yours.
                </p>
              </div>
              <div className="aff-card">
                <div className="aff-card-head">
                  <FaChartLine className="aff-card-icon" />
                  <h3>Transparent stats</h3>
                </div>
                <p>
                  Inside your affiliate dashboard you see clicks, registrations, paid plans and
                  payouts. No guessing — you always understand what exactly brings results.
                </p>
              </div>
            </div>


            {/* мобилка / планшет — аккордеон */}
            <div className="aff-accordion aff-accordion--mobile">
              <details className="aff-accordion-item" open>
                <summary className="aff-accordion-summary">
                  <span>High-intent audience</span>
                  <span className="aff-accordion-icon">+</span>
                </summary>
                <div className="aff-accordion-body">
                  <p>
                    The platform is built for employers hiring remote talent and jobseekers looking
                    for online work — not random traffic. That means better conversion for you.
                  </p>
                </div>
              </details>

              <details className="aff-accordion-item">
                <summary className="aff-accordion-summary">
                  <span>Honest tracking</span>
                  <span className="aff-accordion-icon">+</span>
                </summary>
                <div className="aff-accordion-body">
                  <p>
                    We use referral links and cookies to attribute signups. If someone follows your
                    link and upgrades within the tracking window, the commission is yours.
                  </p>
                </div>
              </details>

              <details className="aff-accordion-item">
                <summary className="aff-accordion-summary">
                  <span>Transparent stats</span>
                  <span className="aff-accordion-icon">+</span>
                </summary>
                <div className="aff-accordion-body">
                  <p>
                    Inside your affiliate dashboard you see clicks, registrations, paid plans and
                    payouts. No guessing — you always understand what exactly brings results.
                  </p>
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* FAQ / SIGN-UP / PAYOUTS / PROMO — ТЕПЕРЬ ВСЕГДА АККОРДЕОН */}
        <section className="aff-section aff-section--alt">
          <div className="aff-section-inner">
            <h2 className="aff-section-title">Sign-up, payouts and promotion</h2>

            {/* аккордеон на всех устройствах */}
            <div className="aff-accordion aff-accordion--always">
              <details className="aff-accordion-item" open>
                <summary className="aff-accordion-summary">
                  <span>How do I sign up?</span>
                  <span className="aff-accordion-icon">+</span>
                </summary>
                <div className="aff-accordion-body">
                  <p>
                    The affiliate account is free. You don&apos;t have to purchase a paid plan to
                    join the program.
                  </p>
                  <ul>
                    <li>Click “Become an affiliate” and fill in the application form.</li>
                    <li>Tell us briefly about your site, audience and promo methods.</li>
                    <li>After approval, your referral link appears in the dashboard.</li>
                  </ul>
                </div>
              </details>

              <details className="aff-accordion-item">
                <summary className="aff-accordion-summary">
                  <span>How do I get paid?</span>
                  <span className="aff-accordion-icon">+</span>
                </summary>
                <div className="aff-accordion-body">
                  <p>
                    We group your approved earnings by month and send payouts on a regular schedule.
                  </p>
                  <ul>
                    <li>Payouts are processed once per month for the previous period.</li>
                    <li>
                      Supported options may include PayPal, bank transfer or crypto (depending on
                      region).
                    </li>
                    <li>Minimum payout amount and exact dates are shown in your account.</li>
                  </ul>
                </div>
              </details>

              <details className="aff-accordion-item">
                <summary className="aff-accordion-summary">
                  <span>Where can I place my link?</span>
                  <span className="aff-accordion-icon">+</span>
                </summary>
                <div className="aff-accordion-body">
                  <p>Anywhere that&apos;s relevant and compliant with our rules:</p>
                  <ul>
                    <li>On your blog, landing pages or comparison articles.</li>
                    <li>In email newsletters and onboarding sequences.</li>
                    <li>On social media profiles, groups and communities you manage.</li>
                    <li>Inside tutorials, checklists, resource pages and toolkits.</li>
                  </ul>
                </div>
              </details>
            </div>

            <p className="aff-footnote">
              We don&apos;t allow spam, misleading advertising or trademark bidding. Focus on real
              value for employers and talents, and the partnership will work long-term for both
              sides.
            </p>
          </div>
        </section>


        {/* FINAL CTA */}
        <section className="aff-section aff-section--cta-band">
          <div className="aff-section-inner aff-section-inner--narrow">
            <div className="aff-cta">
              <div className="aff-cta-text">
                <h2 className='cta_h2'>Ready to start earning with us?</h2>
                <p>
                  Submit your application in a couple of minutes. We&apos;ll review it and share
                  everything you need to begin promoting the platform.
                </p>
              </div>
              <div className="aff-cta-actions">
                <Link to="/affiliate/register" className="aff-btn aff-btn--primary">
                  Apply now
                </Link>
                <a href="#how-it-works" className="aff-btn aff-btn--ghost">
                  View program details
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <Copyright />
    </div>
  );
};

export default AffiliateLanding;
