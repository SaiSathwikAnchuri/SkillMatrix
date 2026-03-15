import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Briefcase, Clock, Users, Zap, ChevronRight, Trophy, CheckCircle } from 'lucide-react';
import api from '../api/axios';
import { Spinner, EmptyState, Toast } from '../components/UI';

export function JobList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/jobs')
      .then(r => setJobs(r.data.jobs))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    j.skills?.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const diffColors = { easy: 'bg-green-50 text-green-700', medium: 'bg-amber-50 text-amber-700', hard: 'bg-red-50 text-red-600' };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="text-center py-12">
          <span className="tag mb-4">Browse Opportunities</span>
          <h1 className="font-sora text-4xl font-extrabold text-navy mt-3">Find your next role</h1>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            All jobs use blind assessment — you'll be evaluated purely on skill. Your identity stays hidden until shortlisted.
          </p>
          <div className="flex items-center gap-3 max-w-lg mx-auto mt-7 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm focus-within:border-teal focus-within:shadow-md transition-all">
            <Search size={18} className="text-gray-300 flex-shrink-0" />
            <input
              className="flex-1 outline-none text-sm text-gray-700 placeholder-gray-300"
              placeholder="Search jobs, companies, or skills..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Notice banner */}
        <div className="flex items-start gap-3 bg-teal-xlight border border-teal-light rounded-2xl p-4 mb-8 text-sm text-teal">
          <span className="text-lg flex-shrink-0">🔒</span>
          <div>
            <span className="font-semibold">How blind recruitment works: </span>
            When you apply, your name, college, age, and location are encrypted and hidden. The recruiter sees only your skill scores and an anonymous ID until they shortlist you.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🔍" title="No jobs found" subtitle="Try a different search term" />
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map(job => (
              <div key={job._id} className="card p-6 card-hover group">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-sora font-bold text-navy text-lg group-hover:text-teal transition-colors">{job.title}</h3>
                    <div className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
                      <Briefcase size={13}/> {job.company}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${diffColors[job.difficulty] || diffColors.medium}`}>
                    {job.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-4 leading-relaxed">{job.description}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {job.skills?.slice(0, 4).map((sk, i) => (
                    <span key={i} className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full">{sk}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users size={12}/>{job.applicationCount || 0} applied</span>
                    <span className="flex items-center gap-1 text-teal font-medium">
                      <Zap size={12}/> AI Assessment
                    </span>
                  </div>
                  <Link to={`/apply/${job._id}`} className="flex items-center gap-1.5 text-sm font-semibold text-teal hover:text-navy transition-colors">
                    Apply Now <ChevronRight size={15}/>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── My Submissions ────────────────────────────────────────────
export function MySubmissions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/submissions/my')
      .then(r => setSubs(r.data.submissions))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusColors = {
    submitted: 'bg-blue-50 text-blue-600 border-blue-200',
    shortlisted: 'bg-amber-50 text-amber-700 border-amber-300',
    revealed: 'bg-green-50 text-green-700 border-green-300',
    rejected: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-6">
        <div className="py-10">
          <h1 className="font-sora text-3xl font-extrabold text-navy">My Applications</h1>
          <p className="text-gray-500 mt-2">Track your anonymous submissions. You'll be notified when shortlisted.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : subs.length === 0 ? (
          <EmptyState icon="📋" title="No applications yet"
            subtitle="Browse open jobs and apply to get started"
            action={<Link to="/jobs" className="btn-primary">Browse Jobs</Link>} />
        ) : (
          <div className="space-y-4">
            {subs.map(sub => (
              <div key={sub._id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-sora font-bold text-navy text-lg">{sub.jobId?.title || 'Position'}</div>
                    <div className="text-sm text-gray-500">{sub.jobId?.company}</div>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border capitalize ${statusColors[sub.status] || statusColors.submitted}`}>
                    {sub.status === 'revealed' ? '✓ Selected' : sub.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl mb-4">
                  <div className="text-center">
                    <div className="font-sora font-bold text-2xl text-teal">{sub.totalScore || 0}</div>
                    <div className="text-xs text-gray-400">Total Score</div>
                  </div>
                  <div className="text-center">
                    <div className="font-sora font-bold text-2xl text-navy">#{sub.rank || '—'}</div>
                    <div className="text-xs text-gray-400">Rank</div>
                  </div>
                  <div className="text-center">
                    <div className="font-sora font-bold text-2xl text-purple-600">{sub.percentile || 0}%</div>
                    <div className="text-xs text-gray-400">Percentile</div>
                  </div>
                  <div className="text-center">
                    <div className="font-sora font-bold text-sm text-green-600 mt-2">{sub.aiInsight?.recommendation || '—'}</div>
                    <div className="text-xs text-gray-400">AI Verdict</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span>Applied {new Date(sub.submittedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</span>
                  <span className="font-mono text-teal">{sub.anonId}</span>
                </div>

                {sub.status === 'revealed' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-xl p-3 border border-green-200">
                    <CheckCircle size={15} /> Your identity has been revealed to the recruiter — expect to be contacted!
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
