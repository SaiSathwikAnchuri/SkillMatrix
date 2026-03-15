import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, Menu, X, LayoutDashboard, Briefcase } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const handleLogout = () => { logout(); navigate('/'); };

  const navLinks = !user
    ? [{ to: '/#problem', label: 'Problem' }, { to: '/#how', label: 'How It Works' }, { to: '/#features', label: 'Features' }]
    : user.role === 'recruiter' || user.role === 'admin'
    ? [{ to: '/recruiter', label: 'Dashboard', icon: <LayoutDashboard size={15}/> }, { to: '/post-job', label: 'Post Job', icon: <Briefcase size={15}/> }]
    : [{ to: '/jobs', label: 'Browse Jobs' }, { to: '/my-submissions', label: 'My Applications' }];

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-teal-light' : 'bg-white/80 backdrop-blur-sm'}`}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-teal rounded-lg flex items-center justify-center group-hover:bg-navy transition-colors">
              <Shield size={16} className="text-white" />
            </div>
            <span className="font-sora font-800 text-xl">
              <span className="text-teal font-bold">Skill</span>
              <span className="text-navy font-bold">Matrix</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-teal
                  ${location.pathname === l.to ? 'text-teal' : 'text-gray-500'}`}>
                {l.icon}{l.label}
              </Link>
            ))}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-medium text-navy">{user.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{user.role}</div>
                </div>
                <div className="w-8 h-8 bg-teal-light rounded-full flex items-center justify-center text-teal font-bold text-sm">
                  {user.name[0].toUpperCase()}
                </div>
                <button onClick={handleLogout} className="btn-ghost flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500">
                  <LogOut size={15}/> Logout
                </button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-5">Get Started</Link>
              </>
            )}
          </div>

          {/* Mobile menu */}
          <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
            {open ? <X size={20}/> : <Menu size={20}/>}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="md:hidden py-4 border-t border-gray-100 animate-fade-in">
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2 py-3 text-sm text-gray-600 hover:text-teal">
                {l.icon}{l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-gray-100 mt-2 flex flex-col gap-2">
              {user ? (
                <button onClick={handleLogout} className="text-sm text-red-500 text-left px-2">Logout</button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost text-sm text-center">Sign In</Link>
                  <Link to="/register" onClick={() => setOpen(false)} className="btn-primary text-sm text-center">Get Started</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
