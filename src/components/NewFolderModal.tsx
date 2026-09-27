import React, { useState } from 'react';
import { X, FolderPlus, RefreshCw, CheckCircle2, AlertTriangle, Key } from 'lucide-react';
import { FolderNode } from '../types';
import { playNavSound, playSuccessChime } from '../utils/audio';
import { createFolderOnGitHub, getStoredGithubConfig, hasAdminToken } from '../services/githubService';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  rootFolder: FolderNode;
  onFolderCreated: (newFolderPath: string) => void;
  onOpenAdminConfig?: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  onClose,
  currentPath,
  rootFolder,
  onFolderCreated,
  onOpenAdminConfig,
}) => {
  const [folderName, setFolderName] = useState('');
  const [parentPath, setParentPath] = useState(currentPath || 'quizzes');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const ghConfig = getStoredGithubConfig();
  const isAdmin = hasAdminToken();

  if (!isOpen) return null;

  const getAllFolderPaths = (node: FolderNode): string[] => {
    let paths = [node.path];
    if (node.folders) {
      for (const f of node.folders) {
        paths = paths.concat(getAllFolderPaths(f));
      }
    }
    return paths;
  };

  const folderPaths = getAllFolderPaths(rootFolder);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = folderName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    if (!cleanName) {
      setError('Please provide a valid folder name (e.g. physics, biochemistry)');
      return;
    }

    if (!isAdmin) {
      setError('GitHub Personal Access Token is required to permanently create folders in the repository.');
      return;
    }

    setIsCreating(true);
    setError(null);

    const res = await createFolderOnGitHub(parentPath, cleanName, ghConfig);
    setIsCreating(false);

    if (!res.success) {
      setError(res.error || 'Failed to create directory on GitHub.');
      return;
    }

    const fullNewPath = `${parentPath}/${cleanName}`;
    setSuccessMsg(`Folder "${cleanName}" (.gitkeep) committed to ${ghConfig.owner}/${ghConfig.repo}!`);
    playSuccessChime();

    // Trigger repository refresh in App
    onFolderCreated(fullNewPath);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                New Folder
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Commit .gitkeep permanently to GitHub repository
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            disabled={isCreating}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {!isAdmin && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11.5px] text-amber-900 dark:text-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>GitHub Personal Access Token required to commit folders.</span>
              </div>
              {onOpenAdminConfig && (
                <button
                  type="button"
                  onClick={onOpenAdminConfig}
                  className="self-start px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold text-xs"
                >
                  Configure Token
                </button>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Parent Directory
            </label>
            <select
              value={parentPath}
              onChange={(e) => setParentPath(e.target.value)}
              disabled={isCreating}
              className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none disabled:opacity-50"
            >
              {folderPaths.map((p) => (
                <option key={p} value={p}>
                  📂 {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
              Folder Name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. quantum_physics"
              required
              autoFocus
              disabled={isCreating}
              className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <p className="text-[10.5px] text-neutral-400 mt-1 font-mono">
              Creates: {parentPath}/{folderName.trim() || '...'}/.gitkeep
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                onClose();
              }}
              disabled={isCreating}
              className="px-3 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !isAdmin}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-xs"
            >
              {isCreating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing .gitkeep...</span>
                </>
              ) : (
                <span>Create on GitHub</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
