import React, { useEffect, useRef, useState } from 'react';
import { exportUsersToCSV, AdminUserExportParams } from '../services/api';
import '../styles/ExportUsersPopover.css';

type RoleAll = 'All' | 'jobseeker' | 'employer' | 'admin' | 'moderator';
type StatusAll = 'All' | 'active' | 'blocked';
type OrderAll = 'ASC' | 'DESC';
type SortByAll = 'created_at' | 'last_login_at';
type JobSearchAll = 'All' | 'actively_looking' | 'open_to_offers' | 'hired';

const LS_EXPORT_KEY = 'admin_export_filters_v1';

type Filters = {
  role: RoleAll;
  status: StatusAll;
  q: string;
  email: string;
  username: string;
  country: string;
  provider: string;
  referralSource: string;
  isEmailVerified: boolean | '';
  identityVerified: boolean | '';
  hasAvatar: boolean | '';
  hasResume: boolean | '';
  jobSearchStatus: JobSearchAll;
  companyName: string;
  riskMin: string;
  riskMax: string;
  createdFrom: string;
  createdTo: string;
  lastLoginFrom: string;
  lastLoginTo: string;
  sortBy: SortByAll;
  order: OrderAll;
};

const defaultFilters: Filters = {
  role: 'All',
  status: 'All',
  q: '',
  email: '',
  username: '',
  country: '',
  provider: '',
  referralSource: '',
  isEmailVerified: '',
  identityVerified: '',
  hasAvatar: '',
  hasResume: '',
  jobSearchStatus: 'All',
  companyName: '',
  riskMin: '',
  riskMax: '',
  createdFrom: '',
  createdTo: '',
  lastLoginFrom: '',
  lastLoginTo: '',
  sortBy: 'created_at',
  order: 'DESC',
};

function buildExportParams(f: Filters): AdminUserExportParams {
  const toBool = (v: boolean | '') => (v === '' ? undefined : !!v);
  const toNum = (v: string) => (v.trim() === '' ? undefined : Number(v));
  const toStr = (v: string) => (v.trim() === '' ? undefined : v.trim());
  return {
    role: f.role === 'All' ? undefined : (f.role as any),
    status: f.status === 'All' ? undefined : (f.status as any),
    q: toStr(f.q),
    email: toStr(f.email),
    username: toStr(f.username),
    country: toStr(f.country),
    provider: toStr(f.provider),
    referralSource: toStr(f.referralSource),
    isEmailVerified: toBool(f.isEmailVerified),
    identityVerified: toBool(f.identityVerified),
    hasAvatar: toBool(f.hasAvatar),
    hasResume: toBool(f.hasResume),
    jobSearchStatus: f.jobSearchStatus === 'All' ? undefined : (f.jobSearchStatus as any),
    companyName: toStr(f.companyName),
    riskMin: toNum(f.riskMin),
    riskMax: toNum(f.riskMax),
    createdFrom: toStr(f.createdFrom),
    createdTo: toStr(f.createdTo),
    lastLoginFrom: toStr(f.lastLoginFrom),
    lastLoginTo: toStr(f.lastLoginTo),
    sortBy: f.sortBy,
    order: f.order,
  };
}

interface Props {
  buttonLabel?: string;       // подпись кнопки
  buttonClassName?: string;   // класс кнопки (твоя текущая стилистика)
}

const ExportUsersPopover: React.FC<Props> = ({
  buttonLabel = 'Export to CSV',
  buttonClassName = 'action-button',
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const ref = useRef<HTMLDivElement | null>(null);

  // load saved
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_EXPORT_KEY);
      if (raw) setFilters({ ...defaultFilters, ...JSON.parse(raw) });
    } catch {}
  }, []);

  // save to LS
  useEffect(() => {
    try { localStorage.setItem(LS_EXPORT_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);

  // click outside
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters(prev => ({ ...prev, [k]: v }));

  const onExport = async () => {
    try {
      setBusy(true);
      const params = buildExportParams(filters);
      await exportUsersToCSV(params);
      setOpen(false);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to export users.');
    } finally {
      setBusy(false);
    }
  };

  const showJobseekerFields = filters.role === 'jobseeker' || filters.role === 'All';

  return (
    <div className="exu-wrap" ref={ref}>
      <button
        className={`${buttonClassName} exu-btn-reset`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        disabled={busy}
      >
        {busy ? <span className="exu-inline-spinner" aria-hidden /> : null}
        {busy ? 'Exporting…' : buttonLabel}
      </button>

      {open && (
        <>
          {/* затемнение фона */}
          <div
            className="exu-backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="exu-popover" role="dialog" aria-label="Export users filters">
            <div className="exu-head">
              <div className="exu-title">Export Users</div>
              <div className="exu-tip">
                Leave filters empty to export <b>all users</b>.
              </div>
            </div>

            <div className="exu-grid exu-grid-4">
              <div>
                <label className="exu-label">Role</label>
                <select className="exu-input" value={filters.role} onChange={e => setFilter('role', e.target.value as RoleAll)}>
                  <option>All</option>
                  <option value="jobseeker">jobseeker</option>
                  <option value="employer">employer</option>
                  <option value="admin">admin</option>
                  <option value="moderator">moderator</option>
                </select>
              </div>
              <div>
                <label className="exu-label">Status</label>
                <select className="exu-input" value={filters.status} onChange={e => setFilter('status', e.target.value as StatusAll)}>
                  <option>All</option>
                  <option value="active">active</option>
                  <option value="blocked">blocked</option>
                </select>
              </div>
              <div>
                <label className="exu-label">Sort</label>
                <div className="exu-dual">
                  <select className="exu-input" value={filters.sortBy} onChange={e => setFilter('sortBy', e.target.value as SortByAll)}>
                    <option value="created_at">created_at</option>
                    <option value="last_login_at">last_login_at</option>
                  </select>
                  <select className="exu-input" value={filters.order} onChange={e => setFilter('order', e.target.value as OrderAll)}>
                    <option value="DESC">DESC</option>
                    <option value="ASC">ASC</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="exu-label">Company (employer)</label>
                <input
                  className="exu-input"
                  value={filters.companyName}
                  onChange={e => setFilter('companyName', e.target.value)}
                  placeholder="Acme"
                />
              </div>
            </div>

            <div className="exu-grid exu-grid-4">
              <div>
                <label className="exu-label">q</label>
                <input
                  className="exu-input"
                  value={filters.q}
                  onChange={e => setFilter('q', e.target.value)}
                  placeholder="substring (email/username)"
                />
              </div>
              <div>
                <label className="exu-label">email</label>
                <input
                  className="exu-input"
                  value={filters.email}
                  onChange={e => setFilter('email', e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="exu-label">username</label>
                <input
                  className="exu-input"
                  value={filters.username}
                  onChange={e => setFilter('username', e.target.value)}
                  placeholder="john_doe"
                />
              </div>
              <div>
                <label className="exu-label">referralSource</label>
                <input
                  className="exu-input"
                  value={filters.referralSource}
                  onChange={e => setFilter('referralSource', e.target.value)}
                  placeholder="utm / campaign"
                />
              </div>
            </div>

            <div className="exu-grid exu-grid-3">
              <div>
                <label className="exu-label">country</label>
                <input
                  className="exu-input"
                  value={filters.country}
                  onChange={e => setFilter('country', e.target.value)}
                  placeholder="US / PH / unknown"
                />
              </div>
              <div>
                <label className="exu-label">provider</label>
                <input
                  className="exu-input"
                  value={filters.provider}
                  onChange={e => setFilter('provider', e.target.value)}
                  placeholder="google / github / none"
                />
              </div>

              <div className="exu-checks">
                <label className="exu-check">
                  <input
                    type="checkbox"
                    checked={filters.isEmailVerified === true}
                    onChange={e => setFilter('isEmailVerified', e.target.checked ? true : '')}
                  />
                  <span>Email verified</span>
                </label>
                <label className="exu-check">
                  <input
                    type="checkbox"
                    checked={filters.identityVerified === true}
                    onChange={e => setFilter('identityVerified', e.target.checked ? true : '')}
                  />
                  <span>Identity verified</span>
                </label>
                <label className="exu-check">
                  <input
                    type="checkbox"
                    checked={filters.hasAvatar === true}
                    onChange={e => setFilter('hasAvatar', e.target.checked ? true : '')}
                  />
                  <span>With avatar</span>
                </label>
                <label className={`exu-check ${showJobseekerFields ? '' : 'exu-disabled'}`}>
                  <input
                    type="checkbox"
                    disabled={!showJobseekerFields}
                    checked={filters.hasResume === true}
                    onChange={e => setFilter('hasResume', e.target.checked ? true : '')}
                  />
                  <span>With resume</span>
                </label>
              </div>
            </div>

            <div className="exu-grid exu-grid-4">
              <div>
                <label className="exu-label">createdFrom</label>
                <input
                  type="date"
                  className="exu-input"
                  value={filters.createdFrom}
                  onChange={e => setFilter('createdFrom', e.target.value)}
                  placeholder="YYYY-MM-DD"
                  title="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="exu-label">createdTo</label>
                <input
                  type="date"
                  className="exu-input"
                  value={filters.createdTo}
                  onChange={e => setFilter('createdTo', e.target.value)}
                  placeholder="YYYY-MM-DD"
                  title="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="exu-label">lastLoginFrom</label>
                <input
                  type="date"
                  className="exu-input"
                  value={filters.lastLoginFrom}
                  onChange={e => setFilter('lastLoginFrom', e.target.value)}
                  placeholder="YYYY-MM-DD"
                  title="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="exu-label">lastLoginTo</label>
                <input
                  type="date"
                  className="exu-input"
                  value={filters.lastLoginTo}
                  onChange={e => setFilter('lastLoginTo', e.target.value)}
                  placeholder="YYYY-MM-DD"
                  title="YYYY-MM-DD"
                />
              </div>
            </div>

            <div className="exu-grid exu-grid-3">
              <div>
                <label className="exu-label">riskMin</label>
                <input
                  type="number"
                  step="0.01"
                  className="exu-input"
                  value={filters.riskMin}
                  onChange={e => setFilter('riskMin', e.target.value)}
                  placeholder="min"
                />
              </div>
              <div>
                <label className="exu-label">riskMax</label>
                <input
                  type="number"
                  step="0.01"
                  className="exu-input"
                  value={filters.riskMax}
                  onChange={e => setFilter('riskMax', e.target.value)}
                  placeholder="max"
                />
              </div>
              <div>
                <label className="exu-label">jobSearchStatus</label>
                <select
                  className="exu-input"
                  disabled={!showJobseekerFields}
                  value={filters.jobSearchStatus}
                  onChange={e => setFilter('jobSearchStatus', e.target.value as JobSearchAll)}
                >
                  <option>All</option>
                  <option value="actively_looking">actively_looking</option>
                  <option value="open_to_offers">open_to_offers</option>
                  <option value="hired">hired</option>
                </select>
              </div>
            </div>

            <div className="exu-actions">
              <button className="exu-secondary" onClick={() => setFilters(defaultFilters)} disabled={busy}>
                Reset
              </button>
              <div style={{ flex: 1 }} />
              <button className="exu-primary" onClick={onExport} disabled={busy}>
                {busy ? <span className="exu-spinner" aria-hidden /> : null}
                {busy ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportUsersPopover;
