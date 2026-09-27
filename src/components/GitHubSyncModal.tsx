import React, { useState, useEffect } from 'react';
import { 
  X, 
  Github, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Globe, 
  FolderTree, 
  ExternalLink,
  ArrowUpCircle,
  GitCommit,
  Clock,
  Key
} from 'lucide-react';
import { playNavSound, playSuccessChime } from '../utils/audio';
import { 
  fetchLatestGitHubCommit, 
  getStoredGithubConfig, 
  hasAdminToken,
  GitHubConfig
} from '../services/githubService';
import { QuizItem } from '../types';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDynamicTree: (owner: string, repo: string) => Promise<boolean>;
  currentOwnerRepo: { owner: string; repo: string };
  isDynamicMode: boolean;
  onToggleDynamicMode: (enabled: boolean) => void;
  pendingQuizzes?: QuizItem[];
  onSyncAllToGitHub?: () => void;
  onOpenAdminConfig?: () => void;
}

export const GitHubSyncModal: React.FC<GitHubSyncModalProps> = ({
  isOpen,
  onClose,
  onApplyDynamicTree,
  currentOwnerRepo,
  isDynamicMode,
  onToggleDynamicMode,
  pendingQuizzes = [],
  onSyncAllToGitHub,
  onOpenAdminConfig,
}) => {
  const [owner, setOwner] = useState(currentOwnerRepo.owner || 'panicconandoyle-ctrl');
  const [repo, setRepo] = useState(currentOwnerRepo.repo || 'Nihrantz-Quiz');
  const [latestCommit, setLatestCommit] = useState<{ sha: string; message: string; date: string; author: string } | null>(null);
  const [loadingCommit, setLoadingCommit] = useState(false);

  useEffect(() => {
    if (currentOwnerRepo.owner) setOwner(currentOwnerRepo.owner);
    if (currentOwnerRepo.repo) setRepo(currentOwnerRepo.repo);
  }, [currentOwnerRepo.owner, currentOwnerRepo.repo]);

  useEffect(() => {
    if (isOpen) {
      setLoadingCommit(true);
      fetchLatestGitHubCommit().then((c) => {
        setLatestCommit(c);
        setLoadingCommit(false);
      });
    }
  }, [isOpen]);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSyncFromGitHub = async () => {
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
          text: `Successfully synchronized live directory tree from GitHub: https://github.com/${owner}/${repo}/tree/main/quizzes`
        });
        playSuccessChime();
        const c = await fetchLatestGitHubCommit();
        setLatestCommit(c);
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

  const isAdmin = hasAdminToken();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Github className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                GitHub Two-Way Sync
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Synchronize quizzes to and from your GitHub repository
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
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Active Target Banner */}
          <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-neutral-500 uppercase tracking-wider block font-semibold">
                Connected Repository
              </span>
              <a
                href={`https://github.com/${owner}/${repo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono mt-0.5"
              >
                <span>{owner}/{repo}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-[11px] text-neutral-500">Branch: <strong className="text-neutral-700 dark:text-neutral-300">main</strong> · Target: <strong className="text-neutral-700 dark:text-neutral-300">quizzes/</strong></span>
            </div>
            <a
              href={`https://github.com/${owner}/${repo}/tree/main/quizzes`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 font-semibold flex items-center gap-1.5 shadow-2xs"
            >
              <span>Browse</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Latest GitHub Commit Status */}
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Latest Remote Commit</span>
              </span>
              {latestCommit && (
                <span className="font-mono text-[10px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                  {latestCommit.sha}
                </span>
              )}
            </div>
            {loadingCommit ? (
              <p className="text-neutral-500 italic">Checking GitHub for latest commit...</p>
            ) : latestCommit ? (
              <div>
                <p className="text-neutral-700 dark:text-neutral-200 font-medium truncate">
                  "{latestCommit.message}"
                </p>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-1">
                  <span>Author: {latestCommit.author}</span>
                  <span>·</span>
                  <span>{new Date(latestCommit.date).toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <p className="text-neutral-500">Repository connected. Ready for synchronization.</p>
            )}
          </div>

          {/* Pending Local Items to Sync to GitHub */}
          {pendingQuizzes.length > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-300 dark:border-amber-700/60">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                  <ArrowUpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Local Quizzes Ready to Push ({pendingQuizzes.length})</span>
                </span>
                {isAdmin ? (
                  <button
                    onClick={onSyncAllToGitHub}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs transition-colors shadow-2xs"
                  >
                    Push All to GitHub
                  </button>
                ) : (
                  <button
                    onClick={onOpenAdminConfig}
                    className="px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Enter Token to Push</span>
                  </button>
                )}
              </div>
              <ul className="space-y-1 max-h-28 overflow-y-auto">
                {pendingQuizzes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between text-[11px] text-amber-900 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/30 px-2 py-1 rounded font-mono">
                    <span className="truncate">{q.filename}</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">{q.size || 'Pending'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sync from GitHub Action */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
                Pull Updates from GitHub
              </span>
              <span className="text-[11px] text-neutral-500">
                Queries Git Trees API to fetch all new, updated, and deleted quizzes
              </span>
            </div>
            <button
              onClick={handleSyncFromGitHub}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Pulling...' : 'Sync from GitHub'}</span>
            </button>
          </div>

          {/* Feedback status message */}
          {statusMessage && (
            <div className={`p-3 rounded-lg flex items-start gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40' 
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800/40'
            }`}>
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#252525] flex items-center justify-between text-xs">
          <span className="text-neutral-500">
            Changes committed to GitHub are permanent.
          </span>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="px-4 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-lg text-neutral-800 dark:text-neutral-200 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
