import React, { useState } from 'react';
import {
  Layers,
  ShieldCheck,
  User as UserIcon,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  UserPlus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Role } from '../types';

export const LoginPage: React.FC = () => {
  const { users, login, createUser } = useAuth();
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'quick' | 'register'>('quick');
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regRole, setRegRole] = useState<Role>('MEMBER');
  const [regTitle, setRegTitle] = useState('');

  const handleQuickLogin = async (userId: string, name: string, role: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await login(userId);
      showToast(
        'Welcome Back! 👋',
        `Logged in as ${name} (${role === 'ADMIN' ? '👑 Admin / Lead' : '👤 Club Member'})`,
        'success'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const found = users.find(u => u.email.toLowerCase() === emailInput.trim().toLowerCase());
      if (!found) {
        throw new Error(`No member account found with email "${emailInput}". Please choose from the test accounts below or register.`);
      }
      await login(found.id);
      showToast('Logged In Successfully! 🚀', `Welcome back, ${found.name}!`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const newUser = await createUser({
        name: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        role: regRole,
        title: regTitle.trim() || (regRole === 'ADMIN' ? 'Club Administrator' : 'Club Member')
      });
      showToast('Account Created! 🎉', `Welcome to the team, ${newUser.name}!`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100 relative overflow-hidden">

      {/* Background Glowing Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-2xl relative z-10 animate-in fade-in zoom-in-95 duration-200">

        {/* Header Hero */}
        <div className="p-8 pb-6 text-center border-b border-slate-800/80 bg-slate-950/50">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 ring-1 ring-white/20 mb-4">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
            CloudTrack Authentication
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Role-Aware Cloud Task Management & Real-Time Notification Engine
          </p>

          {/* Tab Switcher */}
          <div className="mt-6 flex rounded-xl bg-slate-950 p-1 border border-slate-800 max-w-xs mx-auto">
            <button
              onClick={() => { setActiveTab('quick'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'quick'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              One-Click Personas
            </button>
            <button
              onClick={() => { setActiveTab('register'); setErrorMsg(null); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'register'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              New Member
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="m-6 mb-0 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-8 pt-6">
          {activeTab === 'quick' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Select a Role-Aware Account:
                </span>
                <span className="text-[11px] text-sky-400 font-mono">
                  Enforces Server-side Rules
                </span>
              </div>

              {/* Persona Cards */}
              <div className="space-y-2.5">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleQuickLogin(u.id, u.name, u.role)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-sky-500/60 hover:shadow-lg transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-100 group-hover:text-sky-300 transition-colors">
                            {u.name}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${u.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              }`}
                          >
                            {u.role === 'ADMIN' ? '👑 Admin / Lead' : '👤 Member'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{u.title}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-sky-400 font-bold transition">
                      <span className="hidden sm:inline">Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Green"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rachel@clubtech.edu"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Role Assignment
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRegRole('MEMBER')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${regRole === 'MEMBER'
                        ? 'bg-sky-500/20 border-sky-500 text-white ring-1 ring-sky-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                  >
                    <UserIcon className="w-4 h-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-bold">Member</div>
                      <div className="text-[10px] text-slate-400">Regular Tasks</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('ADMIN')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${regRole === 'ADMIN'
                        ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-bold">Admin / Lead</div>
                      <div className="text-[10px] text-slate-400">Full Privileges</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Team Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Researcher, Backend Lead"
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-sky-500/25 mt-2"
              >
                {isSubmitting ? 'Creating...' : 'Register & Enter Workspace ➔'}
              </button>
            </form>
          )}
        </div>

        {/* Footer Security Notice */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 text-center text-[11px] text-slate-500">
          🔒 Authenticated Session with JWT Claims &amp; Role-Aware Backend Enforcement
        </div>

      </div>
    </div>
  );
};
