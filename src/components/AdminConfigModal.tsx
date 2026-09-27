import React, { useState } from 'react';
import { 
  X, 
  Key, 
  Github, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Info,
  ExternalLink 
} from 'lucide-react';
import { 
  GitHubConfig, 
  getStoredGithubConfig, 
  saveGithubConfig, 
  clearGithubConfig, 
  testGitHubConnection 
} from '../services/githubService';
import { playNavSound, playSuccessChime } from '../utils/audio';

interface AdminConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: (config: GitHubConfig) => void;
}

export const AdminConfigModal: React.FC<AdminConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<GitHubConfig>(() => getStoredGithubConfig());
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message: string; permissions?: string } | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    if (!config.owner.trim() || !config.repo.trim()) {
      setTestResult({ valid: false, message: 'Please specify both repository owner and repository name.' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    playNavSound();

    const result = await testGitHubConnection(config);
    setTestResult(result);
    if (result.valid) {
      playSuccessChime();
    }
    setTesting(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveGithubConfig(config);
    playSuccessChime();
    onConfigUpdated(config);
    onClose();
  };

  const handleClear = () => {
    playNavSound();
    clearGithubConfig();
    const emptyConfig: GitHubConfig = {
      owner: 'google-ai-studio',
      repo: 'winquiz-portal',
      branch: 'main',
      token: '',
    };
    setConfig(emptyConfig);
    setTestResult(null);
    onConfigUpdated(emptyConfig);
  };

  const hasToken = config.token && config.token.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                GitHub REST API & Admin Settings
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Configure direct browser-to-GitHub commits and repository sync
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

        {/* Status Indicator Banner */}
        <div className={`px-6 py-2.5 border-b text-xs flex items-center justify-between ${
          hasToken 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300' 
            : 'bg-neutral-50 dark:bg-neutral-800/40 border-neutral-200 dark:border-neutral-700/60 text-neutral-600 dark:text-neutral-400'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${hasToken ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            <span className="font-semibold">{hasToken ? 'Admin Mode Active' : 'Public View Mode (Read-Only)'}</span>
          </div>
          <span className="text-[11px] font-mono">
            {config.owner}/{config.repo} ({config.branch})
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-blue-900 dark:text-blue-200 leading-relaxed">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Secure Browser Storage</span>
                Your GitHub credentials are stored strictly in your local browser's <code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded text-[11px]">localStorage</code>. They never touch third-party servers.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                GitHub Owner / Username
              </label>
              <input
                type="text"
                value={config.owner}
                onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                placeholder="e.g. Nihrantz"
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Repository Name
              </label>
              <input
                type="text"
                value={config.repo}
                onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                placeholder="e.g. interactive-quizzes"
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
              Target Branch (Default: main)
            </label>
            <input
              type="text"
              value={config.branch}
              onChange={(e) => setConfig({ ...config, branch: e.target.value })}
              placeholder="main"
              required
              className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>GitHub Personal Access Token (PAT)</span>
              </label>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>Generate Token</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={config.token}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full pl-3 pr-10 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-0.5"
              >
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Requires <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">repo</code> scope for write permissions. Leave empty for public read-only browsing.
            </p>
          </div>

          {/* Test Connection Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />}
              <span>{testing ? 'Verifying with GitHub...' : 'Test API Connection'}</span>
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
              testResult.valid 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}>
              {testResult.valid ? <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
              <div>
                <span className="font-semibold block">{testResult.message}</span>
                {testResult.permissions && (
                  <span className="text-[11px] opacity-90">Permissions: {testResult.permissions}</span>
                )}
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            {hasToken ? (
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1 text-rose-600 dark:text-rose-400 hover:underline text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Admin Token</span>
              </button>
            ) : (
              <span className="text-[11px] text-neutral-400">Public Mode</span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  playNavSound();
                  onClose();
                }}
                className="px-3.5 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-xs transition-colors text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Credentials</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
