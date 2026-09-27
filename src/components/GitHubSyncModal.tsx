import React, { useState } from 'react';
import { 
  X, 
  Github, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Globe, 
  FolderTree, 
  ExternalLink 
} from 'lucide-react';
import { playNavSound, playSuccessChime } from '../utils/audio';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDynamicTree: (owner: string, repo: string) => Promise<boolean>;
  currentOwnerRepo: { owner: string; repo: string };
  isDynamicMode: boolean;
  onToggleDynamicMode: (enabled: boolean) => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({
  isOpen,
  onClose,
  onApplyDynamicTree,
  currentOwnerRepo,
  isDynamicMode,
  onToggleDynamicMode,
}) => {
  const [owner, setOwner] = useState(currentOwnerRepo.owner || 'google-ai-studio');
  const [repo, setRepo] = useState(currentOwnerRepo.repo || 'winquiz-portal');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    if (!owner.trim() || !repo.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter both owner/organization and repository name.' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    playNavSound();

    try {
      const ok = await onApplyDynamicTree(owner.trim(), repo.trim());
      if (ok) {
        setStatusMessage({
          type: 'success',
          text: `Successfully synced directory tree from https://api.github.com/repos/${owner}/${repo}/contents/quizzes`
        });
        playSuccessChime();
      } else {
        setStatusMessage({
          type: 'error',
          text: `Could not fetch repo contents or rate-limited. Reverted to quizzes.json fallback.`
        });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown network failure';
      setStatusMessage({
        type: 'error',
        text: `Error connecting to GitHub API: ${errorMessage}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                GitHub Auto-Discovery
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Live GitHub API Repository Sync
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
            By default, WinQuiz Explorer reads from the static <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">quizzes.json</code> manifest.
            Enable GitHub Auto-Discovery to scan your public GitHub repository's <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">/quizzes</code> directory on-the-fly via GitHub's public API.
          </p>

          {/* Toggle Dynamic Mode */}
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <div>
              <span className="font-semibold block text-neutral-900 dark:text-neutral-100">
                Auto-Discovery Mode
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isDynamicMode ? "Active: Syncs via GitHub Public API" : "Standard: Reading from quizzes.json manifest"}
              </span>
            </div>
            <button
              onClick={() => {
                playNavSound();
                onToggleDynamicMode(!isDynamicMode);
              }}
              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isDynamicMode ? 'bg-blue-600' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isDynamicMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Repository Target Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                GitHub Owner / Organization
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. your-username"
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Repository Name
              </label>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="e.g. interactive-quizzes"
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Endpoint Reference */}
          <div className="p-2.5 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg font-mono text-[10.5px] text-neutral-600 dark:text-neutral-400 break-all">
            Target: GET https://api.github.com/repos/{owner || '{owner}'}/{repo || '{repo}'}/contents/quizzes
          </div>

          {/* Status feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#252525] flex items-center justify-between">
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            Close
          </button>
          <button
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Repo...</span>
              </>
            ) : (
              <>
                <FolderTree className="w-3.5 h-3.5" />
                <span>Sync with GitHub</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
