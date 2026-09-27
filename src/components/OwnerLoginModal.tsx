import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Eye, EyeOff, UserCheck, AlertCircle } from 'lucide-react';
import { playNavSound, playSuccessChime } from '../utils/audio';

interface OwnerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
  actionReason?: string;
}

export const OwnerLoginModal: React.FC<OwnerLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  actionReason,
}) => {
  const [username, setUsername] = useState('Nihrantz');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate owner credentials as specified by user
    const validUser = username.trim().toLowerCase() === 'nihrantz';
    const validPass = password === 'Iamagoodboy66';

    if (validUser && validPass) {
      playSuccessChime();
      onLoginSuccess();
      setPassword('');
      onClose();
    } else {
      setError('Access Denied: Invalid owner username or password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Owner Authentication
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Sign in to upload quizzes & manage files
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason banner if triggered by an action */}
        {actionReason && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 text-[11.5px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{actionReason}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Owner Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nihrantz"
              required
              className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••"
                required
                autoFocus
                className="w-full pl-3 pr-9 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Regular users can browse & play quizzes freely.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                onClose();
              }}
              className="px-3.5 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sign In as Owner</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
