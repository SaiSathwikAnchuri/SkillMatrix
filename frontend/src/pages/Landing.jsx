import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, BarChart2, Eye, Zap, CheckCircle, ArrowRight, Users, TrendingUp, Globe } from 'lucide-react';

/* ── Intersection observer hook ─────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ── Animated stat number ────────────────────────────────────── */
function AnimatedNumber({ target, suffix = '' }) {
  const [val, setVal] = useState(0);
  const [ref, visible] = useReveal();
  useEffect(() => {
    if (!visible) return;
    const step = target / 40;
    const interval = setInterval(() => {
      setVal(v => { const n = v + step; if (n >= target) { clearInterval(interval); return target; } return n; });
    }, 40);
    return () => clearInterval(interval);
  }, [visible, target]);
  return <span ref={ref}>{Math.round(val)}{suffix}</span>;
}

/* ── Pipeline Step ───────────────────────────────────────────── */
function PipeStep({ num, emoji, label, sub, color, delay }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={`flex flex-col items-center text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className={`relative w-20 h-20 rounded-full border-3 bg-white flex flex-col items-center justify-center shadow-md hover:scale-110 transition-transform cursor-default mb-4`}
        style={{ borderColor: color, borderWidth: 3 }}>
        <span className="absolute -top-2.5 bg-white px-1.5 text-xs font-mono font-medium text-gray-400">{String(num).padStart(2, '0')}</span>
        <span className="text-2xl">{emoji}</span>
      </div>
      <div className="font-sora font-bold text-sm text-navy mb-1">{label}</div>
      <div className="text-xs text-gray-400 leading-relaxed max-w-[90px]">{sub}</div>
    </div>
  );
}

export default function Landing() {
  const [heroRef, heroVisible] = useReveal();

  // Scroll progress
  useEffect(() => {
    const el = document.getElementById('scroll-progress');
    const fn = () => {
      const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
      if (el) el.style.width = pct + '%';
    };
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const steps = [
    { num: 1, emoji: '👤', label: 'Candidate Registers', sub: 'Creates account & submits profile', color: '#0D7C8E' },
    { num: 2, emoji: '🔒', label: 'Anonymization', sub: 'PII stripped → Token ID assigned', color: '#6145A0' },
    { num: 3, emoji: '🧠', label: 'Assessment Engine', sub: 'Coding / Aptitude / Domain test assigned', color: '#15967A' },
    { num: 4, emoji: '⚡', label: 'Auto-Scoring & Ranking', sub: 'Weighted scores computed by AI', color: '#F4622A' },
    { num: 5, emoji: '⚖️', label: 'Fairness Monitoring', sub: 'Bias metrics checked across cohort', color: '#C27F00' },
    { num: 6, emoji: '📊', label: 'Recruiter Dashboard', sub: 'Anonymized rankings + fairness report', color: '#1A7A5F' },
    { num: 7, emoji: '🎯', label: 'Shortlist & Reveal', sub: 'Identity revealed ONLY after selection', color: '#0C2340' },
  ];

  const features = [
    { icon: <Lock size={22}/>, title: 'Split-Key Cryptography', desc: "Candidate identity is split into two encrypted vaults. No single person can reconstruct it — reveal only happens with dual-admin approval, fully logged.", color: 'bg-teal-light text-teal' },
    { icon: <Zap size={22}/>, title: 'AI-Powered Scoring', desc: 'Gemini AI scores every text, situational, and coding answer — objective, rubric-based, with structured feedback. MCQs auto-graded instantly.', color: 'bg-purple-50 text-purple-600' },
    { icon: <BarChart2 size={22}/>, title: 'Bias Audit Engine', desc: 'The only platform that audits its own assessments. Live fairness score, demographic parity checks, and bias flags on the recruiter dashboard.', color: 'bg-amber-50 text-amber-600' },
    { icon: <Globe size={22}/>, title: 'India-Specific NLP', desc: 'Filters caste-indicating surnames, IIT/IIM vs tier-3 college signals, and regional identifiers — bias challenges unique to India, solved.', color: 'bg-green-50 text-green-600' },
    { icon: <Eye size={22}/>, title: 'Full Audit Trail', desc: 'Every recruiter action — views, shortlists, reveals — is timestamped, IP-logged, and immutably recorded. Complete accountability.', color: 'bg-red-50 text-red-500' },
    { icon: <Shield size={22}/>, title: 'AI Assessment Generator', desc: 'Post a job and SkillMatrix auto-generates 8 bias-free, role-specific questions — aptitude, domain, situational, coding — in seconds.', color: 'bg-teal-light text-teal' },
  ];

  const stats = [
    { val: 35, suffix: '–64%', label: 'More applications needed by ethnic-sounding names', color: 'text-red-500' },
    { val: 48, suffix: '%', label: 'YoY increase in reported hiring bias (2024)', color: 'text-orange-500' },
    { val: 30, suffix: '%', label: 'More diverse hires with blind hiring methods', color: 'text-green-600' },
    { val: 78, suffix: '%', label: 'Managers admit snap resume judgements under 10 seconds', color: 'text-amber-600' },
  ];

  return (
    <div className="overflow-x-hidden">
      {/* Scroll progress */}
      <div id="scroll-progress" className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-teal to-accent z-50 transition-all duration-100" style={{width:'0%'}} />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="min-h-screen pt-24 pb-20 bg-gradient-to-br from-teal-xlight via-white to-white relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 left-1/5 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div ref={heroRef} className={`transition-all duration-700 ${heroVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="inline-flex items-center gap-2 bg-teal-light border border-teal/20 rounded-full px-4 py-1.5 text-sm text-teal font-medium mb-7">
                <span className="w-2 h-2 bg-teal rounded-full animate-pulse-slow" />
                AI-Powered Blind Recruitment
              </div>

              <h1 className="font-sora text-5xl xl:text-6xl font-extrabold text-navy leading-[1.1] mb-5">
                Hire for what people{' '}
                <span className="text-teal relative">
                  can do
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] bg-teal-mid rounded-full" />
                </span>
                , not who they are
              </h1>

              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                SkillMatrix anonymizes candidates end-to-end, uses AI to evaluate skills objectively, and monitors for bias in real time — making fair hiring structurally enforced, not just a policy.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link to="/register?role=candidate" className="btn-primary flex items-center gap-2">
                  Start as Candidate <ArrowRight size={16}/>
                </Link>
                <Link to="/register?role=recruiter" className="btn-outline flex items-center gap-2">
                  Post a Job <Briefcase size={16}/>
                </Link>
              </div>

              {/* Stats strip */}
              <div className="flex gap-8 pt-7 border-t border-gray-100">
                {[['30%', 'More diverse hires'], ['100%', 'Skill-based scoring'], ['6', 'Research papers']].map(([v, l]) => (
                  <div key={l}>
                    <div className="font-sora text-2xl font-bold text-teal">{v}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Dashboard mockup */}
            <div className="relative">
              <div className="absolute -top-4 -right-4 animate-float" style={{animationDelay:'0.5s'}}>
                <div className="card px-4 py-3 shadow-lg">
                  <div className="text-xs text-gray-400 mb-1">Fairness Score</div>
                  <div className="font-sora text-2xl font-bold text-green-600">94 / 100</div>
                </div>
              </div>

              <div className="card shadow-xl overflow-hidden">
                {/* Browser chrome */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"/>
                    <div className="w-3 h-3 rounded-full bg-amber-400"/>
                    <div className="w-3 h-3 rounded-full bg-green-400"/>
                  </div>
                  <div className="flex-1 text-center text-xs font-mono text-gray-400">SkillMatrix Dashboard — Live</div>
                  <div className="px-2 py-0.5 bg-green-50 text-green-600 text-xs font-medium rounded-full border border-green-200">🔒 Identities Hidden</div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-sora font-bold text-navy">Candidate Rankings</div>
                    <div className="text-xs text-gray-400">Software Engineer — 24 applicants</div>
                  </div>

                  {[
                    { id: 'A-047', score: 94, rank: '🥇', color: 'teal', bg: 'bg-teal-xlight', tc: 'text-teal' },
                    { id: 'B-119', score: 88, rank: '🥈', color: 'green', bg: 'bg-green-50', tc: 'text-green-600' },
                    { id: 'C-203', score: 81, rank: '🥉', color: 'amber', bg: 'bg-amber-50', tc: 'text-amber-600' },
                    { id: 'D-071', score: 77, rank: '4', bg: 'bg-purple-50', tc: 'text-purple-600' },
                  ].map(c => (
                    <div key={c.id} className={`flex items-center gap-3 p-3 rounded-xl mb-2 hover:${c.bg} transition-colors cursor-default border border-transparent hover:border-gray-100`}>
                      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center text-sm font-bold ${c.tc}`}>
                        {c.rank}
                      </div>
                      <div className="flex-1">
                        <span className="font-mono text-sm text-gray-500">Candidate #{c.id}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
                            <div className={`h-full rounded-full bg-teal`} style={{width: `${c.score}%`}} />
                          </div>
                        </div>
                      </div>
                      <div className={`font-sora font-bold text-lg ${c.tc}`}>{c.score}</div>
                    </div>
                  ))}

                  <div className="mt-4 p-3 bg-teal-xlight rounded-xl flex items-center gap-3 border border-teal-light">
                    <span className="text-lg">⚖️</span>
                    <div>
                      <div className="text-xs text-gray-400">Bias Audit Status</div>
                      <div className="text-sm font-semibold text-green-600">✓ No skew detected across groups</div>
                    </div>
                    <div className="ml-auto font-sora font-bold text-2xl text-green-600">94</div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-3 -left-6 animate-float" style={{animationDelay:'1.8s'}}>
                <div className="card px-4 py-3 shadow-lg">
                  <div className="text-xs text-gray-400 mb-1">Identity Reveal</div>
                  <div className="text-sm font-semibold text-navy">🔐 Locked until shortlisted</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEM (dark) ───────────────────────────────────── */}
      <section id="problem" className="py-24 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_80%_at_10%_50%,rgba(19,162,184,0.08)_0%,transparent_60%)]" />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block bg-white/10 text-teal-mid text-xs font-mono font-medium px-3 py-1 rounded-full uppercase tracking-wider mb-4">The Problem</span>
            <h2 className="font-sora text-4xl font-extrabold text-white leading-tight">
              Traditional hiring is{' '}
              <em className="text-teal-mid not-italic">fundamentally broken</em>
            </h2>
            <p className="text-white/50 mt-4 max-w-lg mx-auto">Unconscious bias eliminates qualified candidates before their skills are ever evaluated.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-14">
            {stats.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:bg-teal/10 hover:border-teal/30 hover:-translate-y-1 transition-all duration-300">
                <div className={`font-sora text-4xl font-extrabold mb-2 ${s.color}`}>
                  <AnimatedNumber target={s.val} suffix={s.suffix} />
                </div>
                <div className="text-sm text-white/50 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { e: '😔', t: 'Snap-Judgment Bias', b: 'Recruiters form impressions within 6 seconds. Name, college, and location cues override actual skill signals before a single qualification is evaluated.' },
              { e: '🇮🇳', t: 'India-Specific Layers', b: 'Surnames reveal caste background. College names reveal socioeconomic tier. Even well-intentioned managers cannot override structural cultural bias.' },
              { e: '⚙️', t: 'No Existing Solution', b: 'HackerRank, LinkedIn, Naukri — all expose full profiles. No existing tool offers real-time fairness monitoring or cryptographic identity protection.' },
            ].map((c, i) => (
              <div key={i} className="bg-white/4 border border-white/8 rounded-2xl p-7 hover:bg-white/7 hover:border-white/14 transition-all">
                <div className="text-3xl mb-4">{c.e}</div>
                <div className="font-sora font-bold text-white text-lg mb-3">{c.t}</div>
                <div className="text-white/50 text-sm leading-relaxed">{c.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how" className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="tag mb-4">The Solution</span>
            <h2 className="font-sora text-4xl font-extrabold text-navy mt-4">
              7-stage pipeline that makes bias{' '}
              <em className="text-teal not-italic">structurally impossible</em>
            </h2>
            <p className="text-gray-500 mt-4 max-w-lg mx-auto">Every stage removes a specific opportunity for bias — structurally enforced, not just a policy.</p>
          </div>

          <div className="relative grid grid-cols-4 md:grid-cols-7 gap-3">
            <div className="hidden md:block absolute top-10 left-[5%] right-[5%] h-0.5 bg-gradient-to-r from-teal-light via-teal to-teal-light z-0" />
            {steps.map((s, i) => (
              <PipeStep key={i} {...s} delay={i * 80} />
            ))}
          </div>

          {/* Exact flow trace */}
          <div className="mt-10 card p-5 bg-teal-xlight border-teal-light">
            <div className="font-sora font-bold text-navy text-sm mb-3">Exact System Flow</div>
            <div className="flex flex-col gap-2 text-sm text-gray-600">
              {[
                'Candidate Registers',
                'Anonymization Module — PII stripped, Token ID assigned',
                'Assessment Engine — Coding / Aptitude / Domain Test assigned',
                'Auto-Scoring & Ranking Engine — Weighted scores computed',
                'Fairness Monitoring System — Bias metrics checked across cohort',
                'Recruiter Dashboard — Anonymized rankings + fairness report shown',
                'Recruiter Shortlists → Identity Revealed ONLY after selection',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="bg-teal text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4 module detail cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
            {[
              { e: '🔒', t: 'Anonymization Module', bc: 'border-teal', pts: ['Strips name, photo, age, gender', 'Masks college tier & location', 'India-specific caste surname filter', 'AES-256 split-key identity vault', 'Assigns Token ID (e.g. A-047)'] },
              { e: '🧠', t: 'Assessment Engine', bc: 'border-purple-400', pts: ['Coding tests (Judge0 sandbox)', 'Aptitude / logical MCQs', 'Domain-specific questions', 'Situational judgment tests', 'AI-generated, bias-free questions'] },
              { e: '⚡', t: 'Auto-Scoring & Ranking', bc: 'border-orange-400', pts: ['MCQs auto-graded instantly', 'Gemini AI scores text answers', 'Weighted score computation', 'Percentile ranking generated', 'Skill breakdown per category'] },
              { e: '⚖️', t: 'Fairness Monitoring', bc: 'border-amber-400', pts: ['Demographic parity check', 'Bias metrics across cohort', 'Live Fairness Score (0–100)', 'Bias flag alerts for recruiter', 'Full timestamped audit trail'] },
            ].map((c, i) => (
              <div key={i} className={`card p-5 border-t-4 ${c.bc} card-hover`}>
                <div className="text-2xl mb-3">{c.e}</div>
                <div className="font-sora font-bold text-navy text-base mb-3">{c.t}</div>
                <ul className="space-y-1.5">
                  {c.pts.map((p, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-500">
                      <span className="text-teal font-bold mt-0.5 flex-shrink-0">→</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="tag mb-4">Features</span>
            <h2 className="font-sora text-4xl font-extrabold text-navy mt-4">Everything working as one system</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="card p-6 card-hover group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color} group-hover:scale-110 transition-transform`}>
                  {f.icon}
                </div>
                <div className="font-sora font-bold text-navy text-base mb-2">{f.title}</div>
                <div className="text-sm text-gray-500 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 bg-navy text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_50%,rgba(11,124,142,0.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6">
          <span className="inline-block bg-white/10 text-teal-mid text-xs font-mono px-3 py-1 rounded-full uppercase tracking-wider mb-6">Get Started</span>
          <h2 className="font-sora text-4xl md:text-5xl font-extrabold text-white mb-5">
            Ready to hire for <em className="text-teal-mid not-italic">skills</em>, not stories?
          </h2>
          <p className="text-white/50 text-lg mb-10">Join the movement building a fairer future for hiring.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/register?role=candidate" className="btn-primary bg-white text-navy hover:bg-teal-light text-base px-8 py-3.5">
              I'm a Candidate →
            </Link>
            <Link to="/register?role=recruiter" className="btn-outline border-white/30 text-white hover:bg-white/10 text-base px-8 py-3.5">
              I'm a Recruiter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#061828] py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-6">
          <div className="font-sora font-bold text-xl text-teal">SkillMatrix</div>
          <div className="flex gap-8">
            {['Problem', 'How It Works', 'Features'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="text-white/30 text-sm hover:text-teal transition-colors">{l}</a>
            ))}
          </div>
          <div className="text-white/20 text-sm italic">"Not just blind to names — blind to bias itself."</div>
        </div>
      </footer>
    </div>
  );
}

// Missing import
function Briefcase({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>; }
