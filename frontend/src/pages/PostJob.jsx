import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Plus, X, Loader } from 'lucide-react';
import api from '../api/axios';
import { Toast } from '../components/UI';

export default function PostJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', difficulty: 'medium', skills: [] });
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('form'); // form | generating | done
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      setForm({ ...form, skills: [...form.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description) { setToast({ message: 'Title and description required', type: 'error' }); return; }
    setLoading(true);
    setStep('generating');
    try {
      const { data } = await api.post('/jobs', form);
      setResult(data);
      setStep('done');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to post job', type: 'error' });
      setStep('form');
    } finally { setLoading(false); }
  };

  // ── Generating state ──────────────────────────────────────
  if (step === 'generating') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 border-4 border-teal-light border-t-teal rounded-full animate-spin mx-auto mb-7" />
        <h2 className="font-sora text-2xl font-bold text-navy mb-3">AI Generating Assessment</h2>
        <p className="text-gray-500 mb-6">Claude is creating bias-free, role-specific questions for your job posting...</p>
        <div className="space-y-3 text-sm text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          {[
            { done: true, text: 'Analyzing job description...' },
            { done: true, text: 'Generating aptitude questions...' },
            { done: true, text: 'Generating domain questions...' },
            { done: false, text: 'Running bias audit on questions...' },
            { done: false, text: 'Finalizing assessment...' },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-3 ${s.done ? 'text-teal' : 'text-gray-400'}`}>
              {s.done
                ? <div className="w-5 h-5 bg-teal rounded-full flex items-center justify-center text-white text-xs">✓</div>
                : <Loader size={18} className="animate-spin text-teal/60"/>}
              {s.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Done state ────────────────────────────────────────────
  if (step === 'done' && result) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 pt-20">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🚀</div>
          <h1 className="font-sora text-3xl font-extrabold text-navy">Job Posted Successfully!</h1>
          <p className="text-gray-500 mt-2">AI has generated a bias-free assessment for your posting</p>
        </div>

        <div className="card p-7 shadow-lg mb-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-sora font-bold text-xl text-navy">{result.job.title}</h2>
              <div className="text-sm text-gray-400">{result.job.company}</div>
            </div>
            <div className="bg-green-50 text-green-700 border border-green-200 text-sm font-semibold px-4 py-1.5 rounded-full">✓ Live</div>
          </div>

          {result.assessment && (
            <div className="bg-teal-xlight border border-teal-light rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={16} className="text-teal"/>
                <span className="font-semibold text-teal text-sm">AI-Generated Assessment</span>
                {result.assessment.biasAudit && (
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                    result.assessment.biasAudit.overallBiasRisk === 'low' ? 'bg-green-100 text-green-700' :
                    result.assessment.biasAudit.overallBiasRisk === 'medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    Bias Risk: {result.assessment.biasAudit.overallBiasRisk || 'low'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white rounded-lg p-2.5">
                  <div className="font-sora font-bold text-teal text-xl">{result.assessment.questions?.length || 0}</div>
                  <div className="text-xs text-gray-400">Questions</div>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <div className="font-sora font-bold text-teal text-xl">{result.assessment.totalPoints || 0}</div>
                  <div className="text-xs text-gray-400">Total Points</div>
                </div>
                <div className="bg-white rounded-lg p-2.5">
                  <div className="font-sora font-bold text-teal text-xl">{Math.floor((result.assessment.timeLimit || 3600) / 60)}m</div>
                  <div className="text-xs text-gray-400">Time Limit</div>
                </div>
              </div>
              {result.assessment.biasAudit?.summary && (
                <p className="text-xs text-teal mt-3 bg-white/60 rounded-lg p-2.5">{result.assessment.biasAudit.summary}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate('/recruiter')} className="btn-primary flex-1 py-3">
            Go to Dashboard →
          </button>
          <button onClick={() => { setStep('form'); setResult(null); }} className="btn-outline flex-1 py-3">
            Post Another Job
          </button>
        </div>
      </div>
    </div>
  );

  // ── Form ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="max-w-2xl mx-auto px-6">
        <div className="py-10">
          <span className="tag mb-4">Post a Job</span>
          <h1 className="font-sora text-4xl font-extrabold text-navy mt-4">Create a new job listing</h1>
          <p className="text-gray-500 mt-3">
            Fill in the details — <strong className="text-teal">Claude AI will automatically generate</strong> a bias-free assessment for your role.
          </p>
        </div>

        <div className="card p-8 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">Job Title *</label>
              <input className="input text-base" placeholder="e.g. Senior React Developer"
                value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>

            <div>
              <label className="label">Job Description *</label>
              <textarea className="input min-h-[140px] resize-y text-sm" rows={5}
                placeholder="Describe the role, responsibilities, and what the ideal candidate would bring. The more detail you provide, the better AI can generate relevant questions."
                value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
              <div className="text-xs text-gray-400 mt-1.5">AI uses this to generate role-specific assessment questions</div>
            </div>

            <div>
              <label className="label">Assessment Difficulty</label>
              <div className="flex gap-3">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} type="button" onClick={() => setForm({...form, difficulty: d})}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold capitalize transition-all ${
                      form.difficulty === d ? 'border-teal bg-teal text-white' : 'border-gray-200 text-gray-500 hover:border-teal-mid'
                    }`}>
                    {d === 'easy' ? '🟢' : d === 'medium' ? '🟡' : '🔴'} {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Required Skills</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.skills.map((sk, i) => (
                  <span key={i} className="flex items-center gap-1 text-sm bg-teal-light text-teal px-3 py-1 rounded-full border border-teal/20">
                    {sk}
                    <button type="button" onClick={() => setForm({...form, skills: form.skills.filter((_, j) => j !== i)})} className="hover:text-red-500">
                      <X size={12}/>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="Add skill and press Enter or +"
                  value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }} />
                <button type="button" onClick={addSkill} className="btn-outline px-4 py-2">
                  <Plus size={18}/>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-teal-xlight to-white border border-teal-light rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Zap size={18} className="text-teal mt-0.5 flex-shrink-0"/>
                <div>
                  <div className="font-semibold text-navy text-sm">AI Assessment Generation</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Claude will auto-generate 8 bias-free questions (aptitude + domain + situational) tailored to this role description. A bias audit will run automatically on all generated questions.
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base font-bold flex items-center justify-center gap-2 disabled:opacity-60">
              <Zap size={18}/>
              Post Job & Generate Assessment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
