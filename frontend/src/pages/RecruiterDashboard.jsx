import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart2, Users, Shield, Award, AlertTriangle, CheckCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import api from '../api/axios';
import { CandidateCard, FairnessGauge, StatCard, Spinner, EmptyState, Toast } from '../components/UI';

export default function RecruiterDashboard() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [fairness, setFairness] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dashLoading, setDashLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [view, setView] = useState('leaderboard'); // leaderboard | fairness | audit
  const [toast, setToast] = useState(null);

  // Load recruiter's jobs
  useEffect(() => {
    api.get('/recruiter/jobs')
      .then(r => { setJobs(r.data.jobs); if (r.data.jobs.length > 0) selectJob(r.data.jobs[0]._id); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectJob = async (jobId) => {
    setSelectedJob(jobId);
    setDashLoading(true);
    try {
      const [dashRes, fairRes] = await Promise.all([
        api.get(`/recruiter/dashboard/${jobId}`),
        api.get(`/recruiter/fairness/${jobId}`),
      ]);
      setDashboard(dashRes.data);
      setFairness(fairRes.data);
    } catch (err) {
      setToast({ message: 'Failed to load dashboard', type: 'error' });
    } finally { setDashLoading(false); }
  };

  const loadAudit = async () => {
    if (!selectedJob) return;
    try {
      const { data } = await api.get(`/recruiter/audit/${selectedJob}`);
      setAuditLogs(data.logs);
    } catch (err) { console.error(err); }
  };

  const handleShortlist = async (anonId) => {
    setActionLoading(p => ({ ...p, [anonId]: true }));
    try {
      await api.post(`/recruiter/shortlist/${anonId}`);
      setToast({ message: `${anonId} shortlisted successfully`, type: 'success' });
      selectJob(selectedJob);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to shortlist', type: 'error' });
    } finally { setActionLoading(p => ({ ...p, [anonId]: false })); }
  };

  const handleReveal = async (anonId) => {
    if (!window.confirm(`🔓 Reveal identity of ${anonId}?\n\nThis action will be permanently logged with your name, timestamp, and IP address.`)) return;
    setActionLoading(p => ({ ...p, [anonId]: true }));
    try {
      const { data } = await api.post(`/recruiter/reveal/${anonId}`);
      setToast({ message: `Identity revealed: ${data.revealed.name} (${data.revealed.email})`, type: 'success' });
      selectJob(selectedJob);
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Reveal failed', type: 'error' });
    } finally { setActionLoading(p => ({ ...p, [anonId]: false })); }
  };

  const currentJob = jobs.find(j => j._id === selectedJob);
  const fr = fairness?.report;
  const statusColor = fr?.overallStatus === 'green' ? 'text-green-600' : fr?.overallStatus === 'yellow' ? 'text-amber-600' : 'text-red-600';

  // Chart data
  const scoreDistData = dashboard?.leaderboard?.map(c => ({ name: c.anonId, score: c.totalScore })) || [];
  const radarData = dashboard?.leaderboard?.[0] ? [
    { subject: 'Aptitude', A: dashboard.leaderboard[0]?.scores?.aptitude || 0, avg: Math.round((dashboard.leaderboard.reduce((s, c) => s + (c.scores?.aptitude || 0), 0) / (dashboard.leaderboard.length || 1))) },
    { subject: 'Domain', A: dashboard.leaderboard[0]?.scores?.domain || 0, avg: Math.round((dashboard.leaderboard.reduce((s, c) => s + (c.scores?.domain || 0), 0) / (dashboard.leaderboard.length || 1))) },
    { subject: 'Situational', A: dashboard.leaderboard[0]?.scores?.situational || 0, avg: Math.round((dashboard.leaderboard.reduce((s, c) => s + (c.scores?.situational || 0), 0) / (dashboard.leaderboard.length || 1))) },
    { subject: 'Coding', A: dashboard.leaderboard[0]?.scores?.coding || 0, avg: Math.round((dashboard.leaderboard.reduce((s, c) => s + (c.scores?.coding || 0), 0) / (dashboard.leaderboard.length || 1))) },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-sora text-3xl font-extrabold text-navy">Recruiter Dashboard</h1>
            <p className="text-gray-500 mt-1 text-sm">All candidates are anonymous until you shortlist and reveal.</p>
          </div>
          <Link to="/post-job" className="btn-primary flex items-center gap-2">
            + Post New Job
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg"/></div>
        ) : jobs.length === 0 ? (
          <EmptyState icon="💼" title="No jobs posted yet"
            subtitle="Post your first job and let AI generate a bias-free assessment"
            action={<Link to="/post-job" className="btn-primary">Post First Job</Link>} />
        ) : (
          <div className="grid lg:grid-cols-[260px_1fr] gap-7">
            {/* Job sidebar */}
            <div>
              <div className="card p-4">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Your Jobs</div>
                <div className="space-y-2">
                  {jobs.map(job => (
                    <button key={job._id} onClick={() => selectJob(job._id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all ${selectedJob === job._id ? 'bg-teal text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                      <div className={`font-semibold text-sm truncate ${selectedJob === job._id ? 'text-white' : 'text-navy'}`}>{job.title}</div>
                      <div className={`text-xs mt-1 flex items-center gap-2 ${selectedJob === job._id ? 'text-white/70' : 'text-gray-400'}`}>
                        <Users size={11}/> {job.stats?.total || 0} applicants
                        {job.stats?.shortlisted > 0 && <span className="text-amber-400 font-medium">· {job.stats.shortlisted} shortlisted</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div>
              {dashLoading ? (
                <div className="flex justify-center py-20"><Spinner size="lg"/></div>
              ) : !dashboard ? (
                <div className="flex justify-center py-20 text-gray-400">Select a job to view dashboard</div>
              ) : (
                <>
                  {/* Job summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
                    <StatCard icon={<Users size={18}/>} label="Total Applicants" value={dashboard.leaderboard?.length || 0} color="teal" />
                    <StatCard icon={<Award size={18}/>} label="Shortlisted" value={dashboard.leaderboard?.filter(c => c.status === 'shortlisted' || c.status === 'revealed').length || 0} color="gold" />
                    <StatCard icon={<TrendingUp size={18}/>} label="Avg Score" value={dashboard.leaderboard?.length ? `${Math.round(dashboard.leaderboard.reduce((s, c) => s + c.totalScore, 0) / dashboard.leaderboard.length)}` : '—'} color="green" />
                    <StatCard icon={<Shield size={18}/>} label="Fairness Score" value={fr?.fairnessScore ?? '—'} color={fr?.overallStatus === 'green' ? 'green' : fr?.overallStatus === 'yellow' ? 'gold' : 'orange'} />
                  </div>

                  {/* View tabs */}
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
                    {[
                      { id: 'leaderboard', label: '📊 Leaderboard' },
                      { id: 'fairness', label: '⚖️ Fairness Report' },
                      { id: 'audit', label: '🗂️ Audit Log' },
                    ].map(tab => (
                      <button key={tab.id}
                        onClick={() => { setView(tab.id); if (tab.id === 'audit') loadAudit(); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === tab.id ? 'bg-white text-navy shadow-sm' : 'text-gray-500 hover:text-navy'}`}>
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* ── LEADERBOARD VIEW ─────────────────────────── */}
                  {view === 'leaderboard' && (
                    <div>
                      {/* Score chart */}
                      {scoreDistData.length > 1 && (
                        <div className="card p-5 mb-6">
                          <div className="font-semibold text-navy text-sm mb-4">Score Distribution (Anonymized)</div>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={scoreDistData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} />
                              <Tooltip formatter={(v) => [`${v} pts`, 'Score']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                              <Bar dataKey="score" fill="#0D7C8E" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Notice */}
                      <div className="flex items-start gap-3 bg-teal-xlight border border-teal-light rounded-xl p-3.5 mb-5 text-sm text-teal">
                        <Shield size={15} className="flex-shrink-0 mt-0.5"/>
                        <div><strong>Identity Protection Active:</strong> All candidates are shown by anonymous ID only. Click "Shortlist" then "Reveal Identity" to see real names — this action is permanently logged.</div>
                      </div>

                      {dashboard.leaderboard?.length === 0 ? (
                        <EmptyState icon="👥" title="No applications yet" subtitle="Share the job link for candidates to apply" />
                      ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                          {dashboard.leaderboard.map(candidate => (
                            <CandidateCard
                              key={candidate.anonId}
                              candidate={candidate}
                              onShortlist={handleShortlist}
                              onReveal={handleReveal}
                              loading={!!actionLoading[candidate.anonId]}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── FAIRNESS VIEW ─────────────────────────────── */}
                  {view === 'fairness' && fr && (
                    <div className="space-y-6">
                      {/* Overall status */}
                      <div className={`card p-5 border-l-4 ${fr.overallStatus === 'green' ? 'border-l-green-500' : fr.overallStatus === 'yellow' ? 'border-l-amber-500' : 'border-l-red-500'}`}>
                        <div className="flex items-center gap-3">
                          {fr.overallStatus === 'green' ? <CheckCircle size={20} className="text-green-500"/> : <AlertTriangle size={20} className={fr.overallStatus === 'yellow' ? 'text-amber-500' : 'text-red-500'}/>}
                          <div>
                            <div className={`font-sora font-bold text-lg ${statusColor}`}>
                              {fr.overallStatus === 'green' ? 'Assessment is performing fairly' : fr.overallStatus === 'yellow' ? 'Some variation detected — monitor' : 'Fairness concerns detected — review required'}
                            </div>
                            <div className="text-sm text-gray-500 mt-0.5">{fr.summary}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="card p-6">
                          <div className="font-semibold text-navy mb-4">Fairness Score</div>
                          <FairnessGauge score={fr.fairnessScore} />
                          {fr.stats && (
                            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="font-bold text-navy">{fr.stats.avg}</div>
                                <div className="text-xs text-gray-400">Avg Score</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="font-bold text-navy">{fr.stats.stdDev}</div>
                                <div className="text-xs text-gray-400">Std Dev</div>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-2.5">
                                <div className="font-bold text-navy">{fr.stats.total}</div>
                                <div className="text-xs text-gray-400">Total</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="card p-6">
                          <div className="font-semibold text-navy mb-4">Demographic Parity</div>
                          <div className={`p-3.5 rounded-xl border text-sm ${
                            fr.parity?.status === 'fair' ? 'bg-green-50 border-green-200 text-green-700' :
                            fr.parity?.status === 'monitor' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                            fr.parity?.status === 'alert' ? 'bg-red-50 border-red-200 text-red-600' :
                            'bg-gray-50 border-gray-200 text-gray-500'
                          }`}>
                            {fr.parity?.status === 'fair' && '✅ '}{fr.parity?.status === 'monitor' && '⚠️ '}{fr.parity?.status === 'alert' && '🚨ˑ'}
                            {fr.parity?.message}
                          </div>
                          {fr.parity?.maxParityGap !== undefined && (
                            <div className="mt-3 text-sm text-gray-500">
                              Max parity gap: <span className="font-bold text-navy">{fr.parity.maxParityGap}%</span>
                              <span className="text-xs text-gray-400 ml-2">(≤10% = acceptable)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Assessment bias audit */}
                      {fairness?.assessmentBias && (
                        <div className="card p-6">
                          <div className="font-semibold text-navy mb-4">AI Assessment Bias Audit</div>
                          <div className="flex items-center gap-3 mb-4">
                            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${
                              fairness.assessmentBias.overallBiasRisk === 'low' ? 'bg-green-100 text-green-700' :
                              fairness.assessmentBias.overallBiasRisk === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-600'
                            }`}>
                              Overall Risk: {fairness.assessmentBias.overallBiasRisk || 'low'}
                            </span>
                            <span className="text-sm text-gray-500">{fairness.assessmentBias.summary}</span>
                          </div>
                          {fairness.assessmentBias.flags?.length > 0 && (
                            <div className="space-y-2">
                              {fairness.assessmentBias.flags.map((flag, i) => (
                                <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                                  <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                                  <div>
                                    <span className="font-medium text-amber-700">{flag.question}: </span>
                                    <span className="text-amber-600">{flag.issue}</span>
                                    {flag.recommendation && <div className="text-xs text-gray-500 mt-1">💡 {flag.recommendation}</div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Score distribution flags */}
                      {fr.distribution?.flags?.length > 0 && (
                        <div className="card p-5 border-l-4 border-l-amber-400">
                          <div className="font-semibold text-navy mb-3">Distribution Alerts</div>
                          {fr.distribution.flags.map((f, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3 mb-2">
                              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5"/>
                              <span>{f.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── AUDIT LOG VIEW ────────────────────────────── */}
                  {view === 'audit' && (
                    <div className="card overflow-hidden">
                      <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div className="font-semibold text-navy">Audit Trail</div>
                        <button onClick={loadAudit} className="btn-ghost flex items-center gap-1.5 text-sm">
                          <RefreshCw size={14}/> Refresh
                        </button>
                      </div>
                      {auditLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 text-sm">No audit logs yet</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {auditLogs.map((log, i) => (
                            <div key={i} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                                log.action.includes('REVEAL') ? 'bg-amber-400' :
                                log.action.includes('SHORTLIST') ? 'bg-teal' : 'bg-gray-300'
                              }`}/>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-navy">{log.action}</span>
                                  {log.target && <span className="anon-id text-xs">{log.target}</span>}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  by <span className="font-medium text-gray-600">{log.performedBy?.name || 'System'}</span>
                                  {' · '}{log.ip}
                                  {' · '}{new Date(log.timestamp).toLocaleString('en-IN')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
