import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, Code, FileText, Layers, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { Spinner, Toast } from '../components/UI';

const TYPE_ICONS = {
  mcq:         <Layers size={14}/>,
  text:        <FileText size={14}/>,
  code:        <Code size={14}/>,
  situational: '🎭',
};

const CAT_COLORS = {
  aptitude:    'bg-blue-50 text-blue-600 border-blue-200',
  domain:      'bg-teal-light text-teal border-teal-light',
  situational: 'bg-purple-50 text-purple-600 border-purple-200',
  coding:      'bg-amber-50 text-amber-700 border-amber-200',
};

export default function Assessment() {
  const { jobId } = useParams();
  const navigate  = useNavigate();

  const [job,        setJob]        = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [profile,    setProfile]    = useState({ college: '', degree: '', yearsExperience: 0, skills: [] });
  const [skillInput, setSkillInput] = useState('');
  const [answers,    setAnswers]    = useState({});
  const [current,    setCurrent]    = useState(0);
  const [timeLeft,   setTimeLeft]   = useState(0);
  const [phase,      setPhase]      = useState('profile'); // profile | test | submitting | done
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result,     setResult]     = useState(null);
  const [toast,      setToast]      = useState(null);
  const [startTime]                 = useState(Date.now());

  // ── Load job + assessment on mount ─────────────────────────────
  // Retries up to 3 times if backend is auto-generating the assessment
  useEffect(() => {
    let cancelled  = false;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const load = async () => {
      // Non-critical: load job title/company for display
      api.get(`/jobs/${jobId}`)
        .then(r => { if (!cancelled) setJob(r.data.job); })
        .catch(() => {});

      // Critical: load assessment — retry if still generating
      while (retryCount <= MAX_RETRIES) {
        try {
          const res = await api.get(`/jobs/${jobId}/assessment`);
          if (!cancelled) {
            setAssessment(res.data.assessment);
            setTimeLeft(res.data.assessment.timeLimit || 3600);
            setLoading(false);
          }
          return; // success — exit loop
        } catch (err) {
          const status = err.response?.status;
          const msg    = err.response?.data?.message || 'Failed to load assessment.';

          // 503 = backend is still generating → wait and retry
          if (status === 503 && retryCount < MAX_RETRIES) {
            retryCount++;
            if (!cancelled) setLoadError(`Generating AI assessment... (attempt ${retryCount}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, 3000)); // wait 3s
            continue;
          }

          // 404 with no assessmentId message → also retry (race condition)
          if (status === 404 && msg.includes('generating') && retryCount < MAX_RETRIES) {
            retryCount++;
            if (!cancelled) setLoadError(`Assessment is being created... (${retryCount}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, 3000));
            continue;
          }

          // Any other error — show it
          if (!cancelled) {
            setLoadError(msg);
            setLoading(false);
          }
          return;
        }
      }

      // Exceeded retries
      if (!cancelled) {
        setLoadError('Assessment generation is taking too long. Please check that GEMINI_API_KEY is set in your backend .env file, then try again.');
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [jobId]);

  // ── Countdown timer ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'test' || timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(v => {
      if (v <= 1) { clearInterval(t); handleSubmit(); return 0; }
      return v - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  // ── Submit assessment ───────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setPhase('submitting');
    try {
      const answersArr = assessment.questions.map(q => ({
        questionId: q.id,
        answer:     answers[q.id] || '',
      }));
      const { data } = await api.post('/submissions', {
        jobId,
        assessmentId: assessment._id,
        answers:      answersArr,
        profile,
        timeSpent:    Math.round((Date.now() - startTime) / 1000),
      });
      setResult(data);
      setPhase('done');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Submission failed. Please try again.', type: 'error' });
      setPhase('test');
    } finally {
      setSubmitting(false);
    }
  }, [submitting, assessment, answers, jobId, profile, startTime]);

  const fmt = s => `${Math.floor(s / 60).toString().padStart(2,'0')}:${(s % 60).toString().padStart(2,'0')}`;
  const progress = assessment
    ? Math.round((Object.keys(answers).length / assessment.questions.length) * 100)
    : 0;
  const q = assessment?.questions[current];

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4 px-4">
      <Spinner size="lg"/>
      <p className="text-gray-600 text-sm font-medium text-center max-w-sm">
        {loadError || 'Loading assessment...'}
      </p>
      {loadError && loadError.includes('Generating') && (
        <p className="text-xs text-gray-400 text-center max-w-sm">
          Gemini AI is creating bias-free questions for this role. This takes ~15 seconds.
        </p>
      )}
    </div>
  );

  // ── Load error ──────────────────────────────────────────────────
  if (loadError) return (
    <div className="flex flex-col justify-center items-center min-h-screen px-4">
      <div className="card p-8 max-w-md w-full text-center shadow-lg">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4"/>
        <h2 className="font-sora font-bold text-xl text-navy mb-2">Assessment Not Available</h2>
        <p className="text-gray-500 text-sm mb-6">{loadError}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { setLoadError(null); setLoading(true);
              api.get(`/jobs/${jobId}/assessment`)
                .then(r => { setAssessment(r.data.assessment); setTimeLeft(r.data.assessment.timeLimit || 3600); setLoading(false); })
                .catch(e => { setLoadError(e.response?.data?.message || 'Still unavailable'); setLoading(false); });
            }}
            className="btn-primary text-sm py-2 px-5"
          >
            Try Again
          </button>
          <button onClick={() => navigate('/jobs')} className="btn-outline text-sm py-2 px-5">
            Back to Jobs
          </button>
        </div>
      </div>
    </div>
  );

  // ── Profile setup phase ─────────────────────────────────────────
  if (phase === 'profile') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="font-sora text-3xl font-extrabold text-navy">{job?.title || 'Assessment'}</h1>
          <p className="text-gray-500 mt-2">{job?.company}</p>
          <div className="mt-4 p-3 bg-teal-xlight border border-teal-light rounded-xl text-sm text-teal">
            🔒 This information will be <strong>encrypted and anonymized</strong> — recruiters will not see your college name or location.
          </div>
        </div>

        <div className="card p-8 shadow-lg">
          <h2 className="font-sora font-bold text-navy text-lg mb-5">Your Professional Profile</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">College / University</label>
                <input className="input" placeholder="e.g. Delhi University"
                  value={profile.college}
                  onChange={e => setProfile({ ...profile, college: e.target.value })}/>
              </div>
              <div>
                <label className="label">Degree</label>
                <input className="input" placeholder="e.g. B.Tech CSE"
                  value={profile.degree}
                  onChange={e => setProfile({ ...profile, degree: e.target.value })}/>
              </div>
            </div>

            <div>
              <label className="label">Years of Experience</label>
              <input type="number" className="input" min="0" max="40" placeholder="0"
                value={profile.yearsExperience}
                onChange={e => setProfile({ ...profile, yearsExperience: parseInt(e.target.value) || 0 })}/>
            </div>

            <div>
              <label className="label">Skills (press Enter to add)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {profile.skills.map((sk, i) => (
                  <span key={i} className="flex items-center gap-1 text-xs bg-teal-light text-teal px-2.5 py-1 rounded-full">
                    {sk}
                    <button
                      onClick={() => setProfile({ ...profile, skills: profile.skills.filter((_, j) => j !== i) })}
                      className="hover:text-red-500 text-teal/50">✕</button>
                  </span>
                ))}
              </div>
              <input className="input" placeholder="Add a skill..."
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && skillInput.trim()) {
                    setProfile({ ...profile, skills: [...profile.skills, skillInput.trim()] });
                    setSkillInput('');
                    e.preventDefault();
                  }
                }}/>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl text-sm">
            <div className="font-semibold text-navy mb-2">📝 What to expect:</div>
            <div className="text-gray-500 space-y-1">
              <div>• <strong>{assessment?.questions?.length || 0}</strong> questions
                ({assessment?.questions?.filter(q => q.type === 'mcq').length || 0} MCQ
                + {assessment?.questions?.filter(q => q.type !== 'mcq').length || 0} open-ended)
              </div>
              <div>• Time limit: <strong>{Math.floor((assessment?.timeLimit || 3600) / 60)} minutes</strong></div>
              <div>• AI will score your text and situational answers in real-time</div>
            </div>
          </div>

          <button onClick={() => setPhase('test')} className="btn-primary w-full py-3.5 mt-6 text-base">
            Start Assessment →
          </button>
        </div>
      </div>
    </div>
  );

  // ── Submitting / AI scoring ─────────────────────────────────────
  if (phase === 'submitting') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-sm px-4">
        <div className="w-20 h-20 border-4 border-teal-light border-t-teal rounded-full animate-spin mx-auto mb-6"/>
        <h2 className="font-sora text-2xl font-bold text-navy mb-3">AI Scoring Your Answers</h2>
        <p className="text-gray-500 text-sm">Gemini is evaluating each response objectively...<br/>This takes 20–40 seconds.</p>
        <div className="mt-6 space-y-2 text-sm text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm max-w-xs mx-auto">
          {[
            { done: true,  text: 'Encrypting your identity' },
            { done: true,  text: 'Scoring MCQ answers' },
            { done: false, text: 'AI scoring text answers...' },
          ].map((step, i) => (
            <div key={i} className={`flex items-center gap-2 ${step.done ? 'text-teal' : 'text-gray-400'}`}>
              {step.done
                ? <div className="w-4 h-4 bg-teal rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">✓</div>
                : <div className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin flex-shrink-0"/>}
              {step.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Done ────────────────────────────────────────────────────────
  if (phase === 'done' && result) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="text-7xl mb-5">🎉</div>
        <h1 className="font-sora text-3xl font-extrabold text-navy mb-3">Assessment Complete!</h1>
        <p className="text-gray-500 mb-8">Your answers have been scored and anonymized. The recruiter sees only your ID and skill scores.</p>

        <div className="card p-8 mb-6 shadow-lg">
          <div className="text-6xl font-sora font-extrabold text-teal mb-1">{result.totalScore}</div>
          <div className="text-gray-400 text-sm mb-6">Overall Score / 100</div>

          <div className="grid grid-cols-2 gap-4 text-left">
            {Object.entries(result.scores || {}).map(([cat, score]) =>
              score > 0 ? (
                <div key={cat} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-xs text-gray-400 capitalize mb-1">{cat}</div>
                  <div className="font-sora font-bold text-lg text-navy">{score}%</div>
                  <div className="h-1.5 bg-gray-200 rounded-full mt-2">
                    <div className="h-full bg-teal rounded-full" style={{ width: `${score}%` }}/>
                  </div>
                </div>
              ) : null
            )}
          </div>

          <div className="mt-5 p-3 bg-teal-xlight rounded-xl border border-teal-light text-sm text-teal">
            🔒 Your anonymous ID: <span className="font-mono font-bold">{result.anonId}</span>
          </div>
        </div>

        <button onClick={() => navigate('/my-submissions')} className="btn-primary px-8 py-3">
          View My Applications →
        </button>
      </div>
    </div>
  );

  // ── Test phase ──────────────────────────────────────────────────
  if (!q) return null;

  const timerColor = timeLeft < 300
    ? 'text-red-500 bg-red-50 border-red-200'
    : timeLeft < 600
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-teal bg-teal-xlight border-teal-light';

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {toast && <Toast {...toast} onClose={() => setToast(null)}/>}

      {/* Fixed top bar */}
      <div className="fixed top-0 inset-x-0 bg-white border-b border-gray-100 z-40 h-14 flex items-center px-6 gap-4 shadow-sm">
        <div className="font-sora font-bold text-navy text-sm truncate flex-1">{assessment.title}</div>
        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold px-3 py-1.5 rounded-lg border ${timerColor}`}>
          <Clock size={14}/> {fmt(timeLeft)}
        </div>
        <div className="text-xs text-gray-400 hidden md:block">
          {Object.keys(answers).length}/{assessment.questions.length} answered
        </div>
        <button onClick={handleSubmit} className="btn-primary text-sm py-1.5 px-4" disabled={submitting}>
          Submit
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 grid md:grid-cols-[260px_1fr] gap-6">

        {/* Sidebar: question navigator */}
        <div className="hidden md:block">
          <div className="card p-4 sticky top-20">
            <div className="font-semibold text-sm text-navy mb-3">Questions</div>
            <div className="h-1.5 bg-gray-100 rounded-full mb-3">
              <div className="h-full bg-teal rounded-full transition-all" style={{ width: `${progress}%` }}/>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {assessment.questions.map((_, i) => {
                const answered = answers[assessment.questions[i].id] !== undefined;
                return (
                  <button key={i} onClick={() => setCurrent(i)}
                    className={`h-8 rounded-lg text-xs font-bold transition-all ${
                      i === current
                        ? 'bg-teal text-white'
                        : answered
                        ? 'bg-teal-light text-teal border border-teal/20'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-gray-400 space-y-1">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-teal rounded"/>Answered</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 rounded"/>Not answered</div>
            </div>
          </div>
        </div>

        {/* Main question area */}
        <div>
          <div className="card p-7 shadow-sm">

            {/* Question meta */}
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <span className="text-xs font-mono text-gray-400">Q{current + 1} / {assessment.questions.length}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${CAT_COLORS[q.category] || CAT_COLORS.domain}`}>
                {q.category}
              </span>
              <span className="text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-500 px-2.5 py-1 rounded-full capitalize flex items-center gap-1">
                {TYPE_ICONS[q.type]} {q.type}
              </span>
              <span className="ml-auto text-xs font-bold text-teal">{q.points} pts</span>
            </div>

            {/* Question text */}
            <h2 className="font-sora font-bold text-navy text-xl leading-relaxed mb-6">{q.question}</h2>

            {/* MCQ options */}
            {q.type === 'mcq' && q.options && (
              <div className="space-y-3">
                {q.options.map((opt, i) => {
                  const letter   = opt[0];
                  const selected = answers[q.id] === letter;
                  return (
                    <button key={i} onClick={() => setAnswers({ ...answers, [q.id]: letter })}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-medium ${
                        selected
                          ? 'border-teal bg-teal-xlight text-teal'
                          : 'border-gray-200 hover:border-teal-mid hover:bg-gray-50 text-gray-700'
                      }`}>
                      <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center text-xs font-bold mr-3 ${
                        selected ? 'bg-teal text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{letter}</span>
                      {opt.slice(3)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text / Situational */}
            {(q.type === 'text' || q.type === 'situational') && (
              <div>
                <textarea
                  className="input min-h-[200px] resize-y text-sm"
                  placeholder="Write your answer here. Be specific and thorough — AI evaluates depth of understanding and correctness..."
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}/>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>Scored by Gemini AI — be specific</span>
                  <span>{(answers[q.id] || '').length} chars</span>
                </div>
              </div>
            )}

            {/* Code */}
            {q.type === 'code' && (
              <div>
                <div className="flex items-center gap-2 bg-gray-800 text-gray-300 text-xs px-4 py-2 rounded-t-xl">
                  <Code size={12}/> Code Editor
                </div>
                <textarea
                  className="w-full border border-gray-700 rounded-b-xl bg-gray-900 text-green-400 font-mono text-sm p-4 min-h-[220px] resize-y focus:outline-none focus:ring-2 focus:ring-teal/30"
                  placeholder="// Write your solution here..."
                  value={answers[q.id] || ''}
                  onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  spellCheck={false}/>
                <div className="text-xs text-gray-400 mt-2">AI-scored for correctness, efficiency, and approach</div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
              <button
                onClick={() => setCurrent(Math.max(0, current - 1))}
                disabled={current === 0}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-teal disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={16}/> Previous
              </button>

              {/* Dot progress */}
              <div className="flex items-center gap-1.5">
                {assessment.questions.map((_, i) => (
                  <div key={i} className={`h-2 rounded-full transition-all ${
                    i === current ? 'bg-teal w-5' :
                    answers[assessment.questions[i].id] ? 'bg-teal/40 w-2' : 'bg-gray-200 w-2'
                  }`}/>
                ))}
              </div>

              {current < assessment.questions.length - 1 ? (
                <button onClick={() => setCurrent(current + 1)}
                  className="flex items-center gap-2 text-sm font-medium text-teal hover:text-navy">
                  Next <ChevronRight size={16}/>
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="btn-primary text-sm py-2 px-5 disabled:opacity-60">
                  Submit Assessment ✓
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}