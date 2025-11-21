import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAffiliateProfile } from '../services/api';
import { AffiliateProfile } from '@types';
import '../styles/affiliate-dashboard.css';
import { toast } from '../utils/toast';

const AffiliateDashboard: React.FC = () => {
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getAffiliateProfile();
        setProfile(data);
      } catch (error: any) {
        const status = error?.response?.status;
        const msg = error?.response?.data?.message;

        if (status === 401) {
          // не аффилейт / не залогинен
          toast.error('Only affiliates can access this page.');
          navigate('/login');
          return;
        }
        if (status === 404 && msg === 'Affiliate profile not found') {
          setErr('Affiliate profile not found.');
        } else {
          setErr(msg || 'Failed to load affiliate profile.');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleCopyLink = async () => {
    if (!profile?.referral_link) return;
    try {
      await navigator.clipboard.writeText(profile.referral_link);
      toast.success('Referral link copied to clipboard.');
    } catch {
      toast.info('Cannot copy. Please copy the link manually.');
    }
  };

  if (loading) {
    return (
      <div className="aff-page aff-page--dark">
        <div className="aff-card">
          <p>Loading affiliate dashboard...</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="aff-page aff-page--dark">
        <div className="aff-card">
          <h1 className="aff-form-title">Affiliate dashboard</h1>
          <div className="aff-alert aff-alert--error">{err}</div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const user = profile.user;

  return (
    <div className="aff-page aff-page--dark">
      <div className="aff-dashboard">
        <header className="aff-dash-header">
          <div>
            <h1 className="aff-dash-title">Affiliate dashboard</h1>
            <p className="aff-dash-subtitle">
              Track your referral link and profile details.
            </p>
          </div>
          <div className="aff-dash-user">
            {user.avatar && (
              <img
                src={user.avatar}
                alt={user.username}
                className="aff-dash-avatar"
              />
            )}
            <div>
              <div className="aff-dash-username">{user.username}</div>
              <div className="aff-dash-email">{user.email}</div>
            </div>
          </div>
        </header>

        <div className="aff-dash-grid">
          <section className="aff-card">
            <h2 className="aff-card-title">Referral link</h2>
            {profile.referral_link ? (
              <>
                <div className="aff-ref-row">
                  <input
                    className="aff-input aff-ref-input"
                    value={profile.referral_link}
                    readOnly
                  />
                  <button
                    type="button"
                    className="aff-btn aff-btn--primary aff-btn--sm"
                    onClick={handleCopyLink}
                  >
                    Copy
                  </button>
                </div>
                <p className="aff-muted">
                  Share this link on your site, landing pages or social media.
                </p>
              </>
            ) : (
              <p className="aff-muted">
                Your referral link will appear here after it&apos;s generated.
              </p>
            )}
          </section>

          <section className="aff-card">
            <h2 className="aff-card-title">Profile</h2>
            <div className="aff-dash-list">
              <div className="aff-dash-row">
                <span>Account type</span>
                <strong>{profile.account_type}</strong>
              </div>
              {profile.company_name && (
                <div className="aff-dash-row">
                  <span>Company</span>
                  <strong>{profile.company_name}</strong>
                </div>
              )}
              <div className="aff-dash-row">
                <span>Website</span>
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="noreferrer"
                  className="aff-link"
                >
                  {profile.website_url}
                </a>
              </div>
              {profile.traffic_sources && (
                <div className="aff-dash-row">
                  <span>Traffic sources</span>
                  <strong>{profile.traffic_sources}</strong>
                </div>
              )}
              {profile.promo_geo && (
                <div className="aff-dash-row">
                  <span>Promo GEO</span>
                  <strong>{profile.promo_geo}</strong>
                </div>
              )}
              {profile.monthly_traffic && (
                <div className="aff-dash-row">
                  <span>Monthly traffic</span>
                  <strong>{profile.monthly_traffic}</strong>
                </div>
              )}
            </div>
          </section>

          <section className="aff-card">
            <h2 className="aff-card-title">Contacts & payouts</h2>
            <div className="aff-dash-list">
              {profile.payout_method && (
                <div className="aff-dash-row">
                  <span>Payout method</span>
                  <strong>{profile.payout_method}</strong>
                </div>
              )}
              {profile.payout_details && (
                <div className="aff-dash-row">
                  <span>Payout details</span>
                  <strong>{profile.payout_details}</strong>
                </div>
              )}
              {profile.telegram && (
                <div className="aff-dash-row">
                  <span>Telegram</span>
                  <strong>{profile.telegram}</strong>
                </div>
              )}
              {profile.whatsapp && (
                <div className="aff-dash-row">
                  <span>WhatsApp</span>
                  <strong>{profile.whatsapp}</strong>
                </div>
              )}
              {profile.skype && (
                <div className="aff-dash-row">
                  <span>Skype</span>
                  <strong>{profile.skype}</strong>
                </div>
              )}
              {profile.notes && (
                <div className="aff-dash-row aff-dash-row--multiline">
                  <span>Notes</span>
                  <p>{profile.notes}</p>
                </div>
              )}
            </div>
          </section>

          <section className="aff-card">
            <h2 className="aff-card-title">Performance (placeholder)</h2>
            <p className="aff-muted">
              When you add affiliate stats endpoints (clicks, registrations, payouts),
              we can render charts and tables here.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
