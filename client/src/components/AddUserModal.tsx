import React, { useState } from 'react';
import { X, UserPlus, Shield, User as UserIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Role } from '../types';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose
}) => {
  const { createUser } = useAuth();
  const { showToast } = useNotifications();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newUser = await createUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        title: title.trim() || (role === 'ADMIN' ? 'Club Administrator' : 'Club Member')
      });

      showToast(
        'Member Added & Logged In! 🎉',
        `Successfully registered ${newUser.name} as ${newUser.role === 'ADMIN' ? '👑 Admin' : '👤 Member'}.`,
        'success'
      );

      setName('');
      setEmail('');
      setTitle('');
      setRole('MEMBER');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Add New Team Member
              </h2>
              <p className="text-xs text-slate-400">
                Create a custom persona and switch to them immediately
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-6 mb-0 p-3 rounded-2xl bg-red-500/15 border border-red-500/40 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emma Watson"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. emma@clubtech.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Role & Permissions
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('MEMBER')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  role === 'MEMBER'
                    ? 'bg-sky-500/15 border-sky-500 text-white ring-1 ring-sky-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <UserIcon className="w-4 h-4 text-sky-400" />
                <div>
                  <div className="text-xs font-bold">Member</div>
                  <div className="text-[10px] text-slate-400">Regular worker</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 ${
                  role === 'ADMIN'
                    ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-xs font-bold">Admin / Lead</div>
                  <div className="text-[10px] text-slate-400">Full privileges</div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Job Title / Team
            </label>
            <input
              type="text"
              placeholder="e.g. Mobile Developer, Outreach Lead..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Adding...' : 'Register & Switch User'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
