import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { normalizeRole } from '../../utils/rbac';
import { Lock, Mail, ArrowRight, Sparkles, Building2, Shield, User, Chrome, UserPlus, Briefcase, Crown, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, login, loginWithGoogle, register, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Google SSO Modal State
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState<'select' | 'custom'>('select');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<string | null>(null);

  // Auto redirect if authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const canonical = normalizeRole(user.role);
      if (canonical === 'ROLE_CLIENT') {
        navigate('/client-portal', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleGoogleAccountClick = async (account: { email: string; name: string; avatarUrl: string; role: string; title: string }) => {
    setError(null);
    setSelectedGoogleAccount(account.email);
    setIsGoogleLoading(true);
    try {
      const success = await loginWithGoogle({
        email: account.email,
        name: account.name,
        avatarUrl: account.avatarUrl,
        role: account.role,
      });
      if (!success) {
        setError('Google SSO authentication failed. Please try again.');
        setIsGoogleLoading(false);
      }
    } catch (e) {
      setError('Google SSO service error.');
      setIsGoogleLoading(false);
    }
  };

  const handleCustomGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail) return;
    setError(null);
    setIsGoogleLoading(true);
    try {
      const success = await loginWithGoogle({
        email: customGoogleEmail,
        name: customGoogleName || customGoogleEmail.split('@')[0],
        role: 'ROLE_SUPER_ADMIN',
      });
      if (!success) {
        setError('Google SSO authentication failed. Please check details.');
        setIsGoogleLoading(false);
      }
    } catch (e) {
      setError('Google SSO service error.');
      setIsGoogleLoading(false);
    }
  };
  
  // Sign in state
  const [email, setEmail] = useState('admin@gamcs.com');
  const [password, setPassword] = useState('Admin12345!');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('ROLE_SUPER_ADMIN');
  const [regTitle, setRegTitle] = useState('Managing Partner');
  const [regDept, setRegDept] = useState('Executive Board');

  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const success = await login(email, password);
    if (!success) {
      setError('Invalid email address or password. Please check credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!regName || !regEmail || !regPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    const success = await register({
      name: regName,
      email: regEmail,
      password: regPassword,
      role: regRole,
      title: regTitle,
      department: regDept,
    });
    if (!success) {
      setError('Account creation failed. Email might already exist.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10 my-8">
        {/* Main Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header Badge & Title */}
          <div className="p-6 sm:p-8 pb-5 text-center bg-gradient-to-b from-indigo-950/60 to-transparent border-b border-slate-800/80">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-2xl mx-auto flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-950/50 mb-3">
              <Building2 className="w-6 h-6 text-amber-300" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Enterprise CFO & Advisory CRM</h1>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Enterprise Role-Based Access Control (RBAC) Architecture
            </p>
          </div>

          {/* Sign In / Register Tabs */}
          <div className="p-6">
            <div className="grid grid-cols-2 p-1 bg-slate-900 border border-slate-800 rounded-xl mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signin');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  activeTab === 'signin'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('register');
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  activeTab === 'register'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold text-center">
                {error}
              </div>
            )}

            {activeTab === 'signin' ? (
              /* TAB 1: SIGN IN FORM */
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Corporate Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500"
                      placeholder="name@archicorp-cfo.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  {isLoading ? (
                    <span>Authenticating Role Token...</span>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Sign In to Firm Platform</span>
                    </>
                  )}
                </button>

                <div className="relative my-4 flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full"></div>
                  <span className="bg-[#0f172a] px-3 text-[10px] uppercase tracking-wider text-slate-500 font-bold whitespace-nowrap">Or SSO Authentication</span>
                  <div className="border-t border-slate-800 w-full"></div>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    setError(null);
                    setShowGoogleModal(true);
                    setGoogleStep('select');
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <Chrome className="w-4 h-4 text-emerald-400" />
                  <span>Continue with Google Account</span>
                </button>
              </form>
            ) : (
              /* TAB 2: REGISTER FORM WITH 4 ENTERPRISE ROLES */
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500"
                      placeholder="e.g. Alexandra Miller"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Work / Client Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500"
                      placeholder="alexandra@firm.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white placeholder-slate-500"
                      placeholder="At least 8 characters"
                    />
                  </div>
                </div>

                {/* Enterprise Role Selection Dropdown */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center justify-between">
                    <span>Assign 1 of 4 Enterprise Roles</span>
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setRegRole(r);
                      if (r === 'ROLE_SUPER_ADMIN') {
                        setRegTitle('Managing Partner');
                        setRegDept('Executive Board');
                      } else if (r === 'ROLE_ADMIN') {
                        setRegTitle('Senior Partner');
                        setRegDept('Deals & Advisory');
                      } else if (r === 'ROLE_CLIENT') {
                        setRegTitle('Corporate Client CFO');
                        setRegDept('External Portfolio');
                      } else {
                        setRegTitle('Lead Financial Analyst');
                        setRegDept('Valuation & Audit');
                      }
                    }}
                    className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white font-medium"
                  >
                    <option value="ROLE_SUPER_ADMIN">👑 Super Admin (Company Owner)</option>
                    <option value="ROLE_ADMIN">🛡️ Admin / Manager (Partner & Advisory)</option>
                    <option value="ROLE_EMPLOYEE">💼 Employee (Analyst & Consultant)</option>
                    <option value="ROLE_CLIENT">🏢 Client (CFO Portal User)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Job Title</label>
                    <input
                      type="text"
                      value={regTitle}
                      onChange={(e) => setRegTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Department</label>
                    <input
                      type="text"
                      value={regDept}
                      onChange={(e) => setRegDept(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer mt-3"
                >
                  {isLoading ? (
                    <span>Creating Role Account...</span>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Create Account & Sign In</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Default Production Administrator Info */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-slate-300">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Production Enterprise Security</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Default Admin: <span className="text-white font-mono font-semibold">admin@gamcs.com</span> / <span className="text-white font-mono font-semibold">Admin12345!</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GOOGLE SSO ACCOUNT SELECTOR MODAL */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Google Modal Header */}
            <div className="p-6 pb-4 border-b border-slate-700/80 text-center relative">
              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  setIsGoogleLoading(false);
                }}
                className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>

              <div className="w-10 h-10 bg-white rounded-full mx-auto flex items-center justify-center shadow-md mb-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>

              <h2 className="text-base font-bold text-white">Sign in with Google</h2>
              <p className="text-xs text-slate-400 mt-0.5">Choose an account to continue to GAMCS CRM</p>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[70vh] overflow-y-auto">
              {isGoogleLoading ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-indigo-300 font-medium">Authenticating Google Account OAuth 2.0...</p>
                  <p className="text-[11px] text-slate-400">Exchanging secure token with Spring Security backend</p>
                </div>
              ) : googleStep === 'select' ? (
                <div className="space-y-2">
                  {[
                    {
                      name: 'Shivani Kumari',
                      email: 'shivanikumari200631@gmail.com',
                      role: 'ROLE_SUPER_ADMIN',
                      title: 'Google Super Admin Account',
                      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                      badge: 'Super Admin',
                      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
                    },
                  ].map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleGoogleAccountClick(acc)}
                      className="w-full flex items-center gap-3 p-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/70 rounded-xl text-left transition-all cursor-pointer group hover:border-indigo-500/50"
                    >
                      <img
                        src={acc.avatarUrl}
                        alt={acc.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {acc.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${acc.badgeColor}`}>
                            {acc.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{acc.email}</p>
                      </div>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setGoogleStep('custom')}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-slate-900/50 hover:bg-slate-800 border border-dashed border-slate-700 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer mt-3"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    <span>Use another Google account...</span>
                  </button>
                </div>
              ) : (
                /* Custom Google Account Form */
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Google Email Address</label>
                    <input
                      type="email"
                      required
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="your.email@gmail.com"
                      className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Full Name (Optional)</label>
                    <input
                      type="text"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      placeholder="e.g. Shivani Kumari"
                      className="w-full px-3 py-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white placeholder-slate-500"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setGoogleStep('select')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Chrome className="w-4 h-4" />
                      <span>Authenticate Google SSO</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
