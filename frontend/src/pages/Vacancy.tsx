import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Loader from '../components/Loader';
import { getJobBySlugOrId, incrementJobView } from '../services/api';
import type { JobPost } from '@types';
import sanitizeHtml from 'sanitize-html';

const Vacancy: React.FC = () => {
  const { slugId = '' } = useParams();
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const viewed = useRef(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getJobBySlugOrId(slugId);
        setJob(data);
        // views (+ защита от дабл-инка)
        if (!viewed.current && data?.id) {
          viewed.current = true;
          await incrementJobView(data.id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slugId]);

  if (loading) return <Loader />;
  if (!job) return <div>Job not found.</div>;

  const clean = sanitizeHtml(job.description || '', { allowedTags: [], allowedAttributes: {} });

  return (
    <div className="vacancy-shell">
      <Helmet>
        <title>{job.title} | Jobforge</title>
        <meta name="description" content={clean.slice(0, 150)} />
        <link rel="canonical" href={`https://jobforge.net/vacancy/${slugId}`} />
      </Helmet>

      <h1>{job.title}</h1>
      <p><strong>Status:</strong> {job.status}</p>
      {job.salary_type && (
        <p><strong>Salary:</strong> {String(job.salary ?? 'Not specified')} {job.salary_type}</p>
      )}
      {job.location && (<p><strong>Location:</strong> {job.location}</p>)}
      {job.job_type && (<p><strong>Type:</strong> {job.job_type}</p>)}

      <article dangerouslySetInnerHTML={{ __html: job.description || '' }} />
    </div>
  );
};

export default Vacancy;
