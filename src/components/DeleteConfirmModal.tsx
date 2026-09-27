import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, Github, RefreshCw, Key, CheckCircle2 } from 'lucide-react';
import { playNavSound, playDeleteSound } from '../utils/audio';

export interface DeleteItemTarget {
  type: 'quiz' | 'folder';
  id: string;
  name: string;
  path: string;
  sha?: string;
  quizCount?: number;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DeleteItemTarget | null;
  isAdminActive: boolean;
  ghOwner: string;
  ghRepo: string;
  onConfirmDelete: (target: DeleteItemTarget) => Promise<{ success: boolean; error?: string }>;
  onOpenAdminConfig?: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  target,
  isAdminActive,
  ghOwner,
  ghRepo,
  onConfirmDelete,
  onOpenAdminConfig,
}) => {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !target) return null;

  const handleDelete = async () => {
    if (!isAdminActive) {
      setErrorMessage('GitHub Personal Access Token is required to permanently delete items from the repository.');
      return;
    }

    setIsDeleting(true);
    setErrorMessage(null);

    const res = await onConfirmDelete(target);
    setIsDeleting(false);

    if (res.success) {
      playDeleteSound();
      setSuccessMessage(`Permanently deleted ${target.name} from ${ghOwner}/${ghRepo}!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMessage(res.error || 'Failed to complete deletion on GitHub.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Delete {target.type === 'quiz' ? 'Quiz File' : 'Folder'} Permanently
              </h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Permanent deletion via GitHub REST API
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/60">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-neutral-800 dark:text-neutral-200 text-xs font-semibold mb-1">
                Are you sure you want to permanently delete this {target.type}?
              </p>
              <p className="text-[11.5px] text-neutral-600 dark:text-neutral-300 font-mono break-all">
                {target.path}
              </p>
              {target.type === 'folder' && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 font-medium">
                  ⚠️ All contained files ({target.quizCount ?? 'multiple'} quizzes) will be deleted from GitHub.
                </p>
              )}
            </div>
          </div>

          {/* GitHub deletion target */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60">
            <div className="text-[11.5px] space-y-1">
              <div className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                <Github className="w-3.5 h-3.5" />
                <span>GitHub REST API Permanent Deletion</span>
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono break-all">
                DELETE https://api.github.com/repos/{ghOwner}/{ghRepo}/contents/{target.path}
              </div>
            </div>
          </div>

          {!isAdminActive && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11.5px] text-amber-900 dark:text-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Personal Access Token required to delete files from GitHub repository.</span>
              </div>
              {onOpenAdminConfig && (
                <button
                  type="button"
                  onClick={onOpenAdminConfig}
                  className="self-start px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded font-semibold text-xs transition-colors"
                >
                  Configure Token
                </button>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                onClose();
              }}
              disabled={isDeleting}
              className="px-3.5 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || !isAdminActive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting from GitHub...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
