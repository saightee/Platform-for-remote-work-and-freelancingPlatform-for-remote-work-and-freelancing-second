import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { getMyJobPosts, getApplicationsForJobPost } from '../services/api';
import { JobPost, JobApplicationDetails } from '@types';

// FA icons (как на главной)
import {
  FaPlayCircle, FaStopCircle, FaInbox,
  FaPlus, FaListUl, FaComments, FaUserCog,
  FaCheckCircle, FaHourglassHalf, FaTimesCircle
} from 'react-icons/fa';

const EmployerOverview: React.FC = () => {
  const { profile } = useRole();
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [apps, setApps] = useState<JobApplicationDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const myPosts = await getMyJobPosts();
        setPosts(myPosts || []);
        const arrays = await Promise.all((myPosts || []).map(p => getApplicationsForJobPost(p.id)));
        setApps(arrays.flat() || []);
      } finally {
        setLoading(false);
      }
    };
    if (profile?.role === 'employer') run();
  }, [profile]);

  const activeCount = useMemo(() => posts.filter(p => p.status === 'Active').length, [posts]);
  const closedCount = useMemo(() => posts.filter(p => p.status === 'Closed').length, [posts]);
  const totalApps   = useMemo(() => apps.length, [apps]);

  const timeFromApplied = (a: JobApplicationDetails) => {
    const t = Date.parse(a.appliedAt || '');
    return Number.isNaN(t) ? 0 : t;
  };

  const recentApps = useMemo(() => {
    const arr = [...apps].sort((a, b) => timeFromApplied(b) - timeFromApplied(a));
    return arr.slice(0, 6);
  }, [apps]);

  const findTitle = (job_post_id?: string) =>
    posts.find(p => p.id === job_post_id)?.title || '—';

  const statusIcon = (status?: 'Pending' | 'Accepted' | 'Rejected') => {
    switch (status) {
      case 'Accepted': return <FaCheckCircle aria-hidden className="edb-badge__ico" />;
      case 'Rejected': return <FaTimesCircle aria-hidden className="edb-badge__ico" />;
      default:         return <FaHourglassHalf aria-hidden className="edb-badge__ico" />;
    }
  };

  if (loading) {
    return (
      <div className="edb-overview">
        <div className="edb-kpis">
          <div className="edb-skel" /><div className="edb-skel" /><div className="edb-skel" />
        </div>
      </div>
    );
  }

  return (
    <div className="edb-overview">
      <h1 className="edb-title">Overview</h1>

      {/* KPI */}
      <div className="edb-kpis">
        <div className="edb-kpi">
          <div className="edb-kpi__label">
            <FaPlayCircle aria-hidden className="edb-kpi__ico" />
            Active posts
          </div>
          <div className="edb-kpi__value">{activeCount}</div>
        </div>
        <div className="edb-kpi">
          <div className="edb-kpi__label">
            <FaStopCircle aria-hidden className="edb-kpi__ico" />
            Closed posts
          </div>
          <div className="edb-kpi__value">{closedCount}</div>
        </div>
        <div className="edb-kpi">
          <div className="edb-kpi__label">
            <FaInbox aria-hidden className="edb-kpi__ico" />
            Total applications
          </div>
          <div className="edb-kpi__value">{totalApps}</div>
        </div>
      </div>

      {/* Panels */}
      <div className="edb-panels">
        <div className="edb-panel">
          <div className="edb-panel__head">
            <h3>Quick actions</h3>
          </div>
          <div className="edb-actions">
            <Link to="/employer-dashboard/post-job" className="edb-action">
              <FaPlus aria-hidden className="edb-action__ico" />
              <span>Post a Job</span>
            </Link>
            <Link to="/employer-dashboard/my-job-posts" className="edb-action">
              <FaListUl aria-hidden className="edb-action__ico" />
              <span>My Job Posts</span>
            </Link>
            <Link to="/employer-dashboard/messages" className="edb-action">
              <FaComments aria-hidden className="edb-action__ico" />
              <span>Messages</span>
            </Link>
            <Link to="/employer-dashboard/profile" className="edb-action">
              <FaUserCog aria-hidden className="edb-action__ico" />
              <span>Profile</span>
            </Link>
          </div>
        </div>

        <div className="edb-panel">
          <div className="edb-panel__head">
            <h3>Recent applications</h3>
            <Link to="/employer-dashboard/my-job-posts" className="edb-link">View all</Link>
          </div>

          {recentApps.length ? (
            <div className="edb-table">
              <div className="edb-thead">
                <div>Applicant</div>
                <div>Job</div>
                <div>Status</div>
                <div>Applied</div>
              </div>
              <div className="edb-tbody">
                {recentApps.map(a => (
                  <div className="edb-row" key={a.applicationId}>
                    <div>{a.username || '—'}</div>
                    <div>{findTitle(a.job_post_id)}</div>
                    <div>
                      <span className={`edb-badge edb-badge--${(a.status || 'Pending').toLowerCase()}`}>
                        {statusIcon(a.status)}
                        <span className="edb-badge__text">{a.status}</span>
                      </span>
                    </div>
                    <div>{a.appliedAt ? new Date(a.appliedAt).toLocaleDateString() : '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="edb-empty">No applications yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerOverview;
