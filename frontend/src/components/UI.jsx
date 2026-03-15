import { useState, useEffect, useRef } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock, Award, Users } from 'lucide-react';

/* ── Animated Score Bar ──────────────────────────────────────── */
export function ScoreBar({ label, value, color = 'teal', delay = 0 }) {
  const [width, setWidth] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => setWidth(value), delay);
    }, { threshold: 0.4 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, delay]);

  const colors = {
    teal: 'bg-teal',
    green: 'bg-green-500',
    gold: 'bg-amber-400',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
  };

  return (
    <div ref={ref} className="mb-3">
      <div className="flex justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-navy">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${colors[color]} progress-bar`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/* ── Fairness Score Gauge ────────────────────────────────────── */
export function FairnessGauge({ score }) {
  if (score === null || score === undefined) return (
    <div className="text-center py-4 text-gray-400 text-sm">Insufficient data</div>
  );

  const color = score >= 80 ? '#15967A' : score >= 60 ? '#C27F00' : '#C0392B';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Monitor' : 'Alert';
  const bg = score >= 80 ? 'bg-green-50' : score >= 60 ? 'bg-amber-50' : 'bg-red-50';

  return (
    <div className={`${bg} rounded-2xl p-5 text-center border border-gray-100`}>
      <div className="text-5xl font-sora font-800 mb-1" style={{ color }}>
        {score}
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-gray-400">Fairness Score</div>
      <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-bold" style={{ background: color + '22', color }}>
        {label}
      </div>
      <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-bar"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ── Stat Card ───────────────────────────────────────────────── */
export function StatCard({ icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-light text-teal',
    green: 'bg-green-50 text-green-600',
    gold: 'bg-amber-50 text-amber-600',
    orange: 'bg-orange-50 text-orange-500',
    navy: 'bg-navy-light text-navy',
  };
  return (
    <div className="card p-5 card-hover">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-sora font-bold text-navy">{value}</div>
      <div className="text-sm font-medium text-gray-700 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

/* ── Anon Candidate Card (Recruiter view) ────────────────────── */
export function CandidateCard({ candidate, onShortlist, onReveal, loading }) {
  const { anonId, rank, totalScore, scores, anonProfile, aiInsight, status } = candidate;

  const rankColors = [
    'bg-amber-100 text-amber-700 border-amber-300',
    'bg-gray-100 text-gray-600 border-gray-300',
    'bg-orange-100 text-orange-700 border-orange-300',
  ];
  const rankColor = rank <= 3 ? rankColors[rank - 1] : 'bg-teal-light text-teal border-teal-light';

  const recColors = {
    'Strong Hire': 'bg-green-50 text-green-700 border-green-200',
    'Hire': 'bg-teal-light text-teal border-teal-light',
    'Consider': 'bg-amber-50 text-amber-700 border-amber-200',
    'Pass': 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className={`card p-5 card-hover transition-all ${status === 'shortlisted' ? 'border-amber-300 bg-amber-50/30' : status === 'revealed' ? 'border-green-300 bg-green-50/20' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold border ${rankColor}`}>
            #{rank}
          </div>
          <div>
            <span className="anon-id">{anonId}</span>
            <div className="text-xs text-gray-400 mt-0.5">{anonProfile?.education || 'Graduate'}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-sora font-bold text-teal">{totalScore}</div>
          <div className="text-xs text-gray-400">/ 100 pts</div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="grid grid-cols-2 gap-x-4 mb-4">
        <ScoreBar label="Aptitude" value={scores?.aptitude || 0} delay={100} />
        <ScoreBar label="Domain" value={scores?.domain || 0} color="green" delay={200} />
        <ScoreBar label="Situational" value={scores?.situational || 0} color="gold" delay={300} />
        <ScoreBar label="Coding" value={scores?.coding || 0} color="purple" delay={400} />
      </div>

      {/* AI Insight */}
      {aiInsight?.insight && (
        <div className="bg-teal-xlight rounded-xl p-3 mb-4 border border-teal-light">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-5 h-5 bg-teal rounded-full flex items-center justify-center text-white text-xs">✦</div>
            <span className="text-xs font-semibold text-teal uppercase tracking-wide">AI Insight</span>
            {aiInsight.recommendation && (
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full border ${recColors[aiInsight.recommendation] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {aiInsight.recommendation}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{aiInsight.insight}</p>
          {aiInsight.topStrengths?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {aiInsight.topStrengths.map((s, i) => (
                <span key={i} className="text-xs bg-white border border-teal-light text-teal px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Skills */}
      {anonProfile?.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {anonProfile.skills.slice(0, 5).map((sk, i) => (
            <span key={i} className="text-xs bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">{sk}</span>
          ))}
        </div>
      )}

      {/* Status badge */}
      {status === 'revealed' && (
        <div className="flex items-center gap-2 bg-green-50 text-green-700 text-xs font-medium px-3 py-2 rounded-lg border border-green-200 mb-3">
          <CheckCircle size={13} /> Identity revealed
        </div>
      )}
      {status === 'shortlisted' && (
        <div className="flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-2 rounded-lg border border-amber-200 mb-3">
          <Award size={13} /> Shortlisted — click Reveal to see identity
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
        {status === 'submitted' && (
          <button
            onClick={() => onShortlist(anonId)}
            disabled={loading}
            className="flex-1 btn-outline text-sm py-2 disabled:opacity-50"
          >
            {loading ? '...' : '⭐ Shortlist'}
          </button>
        )}
        {status === 'shortlisted' && (
          <button
            onClick={() => onReveal(anonId)}
            disabled={loading}
            className="flex-1 btn-primary text-sm py-2 disabled:opacity-50 bg-amber-500 hover:bg-amber-600"
          >
            {loading ? 'Revealing...' : '🔓 Reveal Identity'}
          </button>
        )}
        {status === 'revealed' && (
          <div className="flex-1 text-center text-xs text-gray-400 py-2">Identity revealed ✓</div>
        )}
      </div>
    </div>
  );
}

/* ── Loading Spinner ─────────────────────────────────────────── */
export function Spinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-2 border-teal-light border-t-teal rounded-full animate-spin`} />
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-sora font-bold text-xl text-navy mb-2">{title}</div>
      <div className="text-gray-400 text-sm mb-6 max-width-xs mx-auto">{subtitle}</div>
      {action}
    </div>
  );
}

/* ── Toast notification ──────────────────────────────────────── */
export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    info: 'bg-teal-xlight border-teal-light text-teal',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl border text-sm font-medium shadow-lg animate-slide-up flex items-center gap-3 ${styles[type]}`}>
      {type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">✕</button>
    </div>
  );
}
