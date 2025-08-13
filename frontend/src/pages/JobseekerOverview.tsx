import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { getMyApplications } from '../services/api';
import { JobApplication } from '@types';
import {
  FaClipboardList,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaSearch,
  FaComments,
  FaUser
} from 'react-icons/fa';

const JobseekerOverview: React.FC = () => {
  const { profile } = useRole();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await getMyApplications();
        setApps(data || []);
      } finally {
        setLoading(false);
      }
    };
    if (profile?.role === 'jobseeker') run();
  }, [profile]);

  const total = useMemo(() => apps.length, [apps]);
  const accepted = useMemo(() => apps.filter(a => a.status === 'Accepted').length, [apps]);
  const rejected = useMemo(() => apps.filter(a => a.status === 'Rejected').length, [apps]);
  const pending  = useMemo(() => apps.filter(a => !['Accepted','Rejected'].includes(a.status || '')).length, [apps]);

  const recent = useMemo(() => {
    const copy = [...apps].sort((a,b) => {
      const ta = Date.parse(a.created_at || '');
      const tb = Date.parse(b.created_at || '');
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
    return copy.slice(0, 6);
  }, [apps]);

  if (loading) {
    return (
      <div className="jsd-overview">
        <div className="jsd-kpis">
          <div className="jsd-skel" />
          <div className="jsd-skel" />
          <div className="jsd-skel" />
        </div>
      </div>
    );
  }

  return (
    <div className="jsd-overview">
      <h1 className="jsd-title">Overview</h1>

      <div className="jsd-kpis">
        <div className="jsd-kpi">
          <div className="jsd-kpi__label">
            <FaClipboardList className="jsd-kpi__ico" /> Total applications
          </div>
          <div className="jsd-kpi__value">{total}</div>
        </div>
        <div className="jsd-kpi">
          <div className="jsd-kpi__label">
            <FaCheckCircle className="jsd-kpi__ico" /> Accepted
          </div>
          <div className="jsd-kpi__value">{accepted}</div>
        </div>
        <div className="jsd-kpi">
          <div className="jsd-kpi__label">
            <FaTimesCircle className="jsd-kpi__ico" /> Rejected
          </div>
          <div className="jsd-kpi__value">{rejected}</div>
        </div>
        <div className="jsd-kpi">
          <div className="jsd-kpi__label">
            <FaHourglassHalf className="jsd-kpi__ico" /> Pending
          </div>
          <div className="jsd-kpi__value">{pending}</div>
        </div>
      </div>

      <div className="jsd-panels">
        <div className="jsd-panel">
          <div className="jsd-panel__head">
            <h3>Quick actions</h3>
          </div>
          <div className="jsd-actions">
            <Link to="/find-job" className="jsd-action">
              <FaSearch className="jsd-action__ico" /> Find Jobs
            </Link>
            <Link to="/jobseeker-dashboard/my-applications" className="jsd-action">
              <FaClipboardList className="jsd-action__ico" /> My Applications
            </Link>
            <Link to="/jobseeker-dashboard/messages" className="jsd-action">
              <FaComments className="jsd-action__ico" /> Messages
            </Link>
            <Link to="/jobseeker-dashboard/profile" className="jsd-action">
              <FaUser className="jsd-action__ico" /> Profile
            </Link>
          </div>
        </div>

        <div className="jsd-panel">
          <div className="jsd-panel__head">
            <h3>Recent applications</h3>
            <Link to="/jobseeker-dashboard/my-applications" className="jsd-link">View all</Link>
          </div>

          {recent.length ? (
            <div className="jsd-table">
              <div className="jsd-thead">
                <div>Job</div>
                <div>Status</div>
                <div>Applied</div>
              </div>
              <div className="jsd-tbody">
                {recent.map((a) => (
                  <div className="jsd-row" key={a.id}>
                    <div>{a.job_post?.title || '—'}</div>
                    <div>
                      <span className={`jsd-badge jsd-badge--${(a.status || 'Pending').toLowerCase()}`}>
                        {a.status || 'Pending'}
                      </span>
                    </div>
                    <div>
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="jsd-empty">No applications yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobseekerOverview;
