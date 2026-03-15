// ── Login Page ────────────────────────────────────────────────
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { Toast } from '../components/UI';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'recruiter' || user.role === 'admin') navigate('/recruiter');
      else navigate('/jobs');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Login failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-xlight via-white to-white flex items-center justify-center px-4 pt-20">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal rounded-2xl mb-5 shadow-lg">
            <Shield size={26} className="text-white" />
          </div>
          <h1 className="font-sora text-3xl font-extrabold text-navy">Welcome back</h1>
          <p className="text-gray-500 mt-2">Sign in to SkillMatrix</p>
        </div>

        <div className="card p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className="input pr-11" placeholder="••••••••"
                  value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-teal font-semibold hover:text-navy">Create one →</Link>
          </div>
        </div>

        {/* Demo accounts hint */}
        <div className="mt-5 p-4 bg-teal-xlight rounded-xl border border-teal-light text-xs text-teal">
          <div className="font-semibold mb-1">Demo accounts</div>
          <div>Candidate: candidate@demo.com / demo1234</div>
          <div>Recruiter: recruiter@demo.com / demo1234</div>
        </div>
      </div>
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────
export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'candidate', company: ''
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Pre-select role from URL param
  const params = new URLSearchParams(window.location.search);
  const defaultRole = params.get('role') || 'candidate';
  if (form.role === 'candidate' && defaultRole !== 'candidate' && !form.name) {
    setForm(f => ({ ...f, role: defaultRole }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { setToast({ message: 'Password must be 8+ characters', type: 'error' }); return; }
    setLoading(true);
    try {
      const user = await register(form);
      if (user.role === 'recruiter' || user.role === 'admin') navigate('/recruiter');
      else navigate('/jobs');
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Registration failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-xlight via-white to-white flex items-center justify-center px-4 pt-20 pb-10">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-navy rounded-2xl mb-5 shadow-lg">
            <Shield size={26} className="text-white" />
          </div>
          <h1 className="font-sora text-3xl font-extrabold text-navy">Create your account</h1>
          <p className="text-gray-500 mt-2">Join the bias-free hiring movement</p>
        </div>

        <div className="card p-8 shadow-lg">
          {/* Role selector */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden mb-6">
            {['candidate', 'recruiter'].map(r => (
              <button key={r} type="button" onClick={() => setForm({...form, role: r})}
                className={`flex-1 py-2.5 text-sm font-semibold capitalize transition-all ${form.role === r ? 'bg-teal text-white' : 'text-gray-400 hover:text-navy'}`}>
                {r === 'candidate' ? '👤 Candidate' : '🏢 Recruiter'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" placeholder="Priya Reddy" value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            {form.role === 'recruiter' && (
              <div>
                <label className="label">Company Name</label>
                <input className="input" placeholder="Acme Corp" value={form.company}
                  onChange={e => setForm({...form, company: e.target.value})} />
              </div>
            )}
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="Min. 8 characters" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} required />
            </div>

            {form.role === 'candidate' && (
              <div className="bg-teal-xlight border border-teal-light rounded-xl p-3.5 text-xs text-teal-mid">
                🔒 Your real identity will be <strong>encrypted and hidden</strong> from recruiters. They'll only see an anonymous ID and your skill scores.
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-60">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-teal font-semibold hover:text-navy">Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
