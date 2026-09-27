import React, { useState, useEffect } from 'react';
import { Edit3, Folder, FileCode, X, RefreshCw, Key, AlertCircle, ArrowRight } from 'lucide-react';
import { FolderNode, QuizItem } from '../types';
import { playNavSound, playSuccessChime } from '../utils/audio';

export type RenameTarget = {
  type: 'quiz' | 'folder';
  quiz?: QuizItem;
  folder?: FolderNode;
};

interface RenameItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: RenameTarget | null;
  isAdminActive: boolean;
  ghOwner: string;
  ghRepo: string;
  onConfirmRename: (
    target: RenameTarget,
    newName: string,
    newTitle?: string
  ) => Promise<{ success: boolean; error?: string }>;
  onOpenAdminConfig?: () => void;
}

export const RenameItemModal: React.FC<RenameItemModalProps> = ({
  isOpen,
  onClose,
  target,
  isAdminActive,
  ghOwner,
  ghRepo,
  onConfirmRename,
  onOpenAdminConfig,
}) => {
  const [nameValue, setNameValue] = useState<string>('');
  const [titleValue, setTitleValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && target) {
      if (target.type === 'folder' && target.folder) {
        setNameValue(target.folder.name);
        setTitleValue('');
      } else if (target.type === 'quiz' && target.quiz) {
        // Strip .html extension for editing filename
        const filenameWithoutExt = target.quiz.filename.replace(/\.html$/i, '');
        setNameValue(filenameWithoutExt);
        setTitleValue(target.quiz.title);
      }
      setIsSubmitting(false);
      setErrorMessage(null);
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const isFolder = target.type === 'folder' && target.folder;
  const isQuiz = target.type === 'quiz' && target.quiz;

  // Calculate parent directory path
  const currentPath = isFolder ? target.folder!.path : target.quiz!.path;
  const pathParts = currentPath.split('/');
  pathParts.pop();
  const parentDirectory = pathParts.join('/');

  // Preview new path
  const previewFilename = nameValue.trim() 
    ? (nameValue.trim().toLowerCase().endsWith('.html') ? nameValue.trim() : `${nameValue.trim()}.html`)
    : '';
  const previewNewPath = isFolder
    ? (parentDirectory ? `${parentDirectory}/${nameValue.trim()}` : nameValue.trim())
    : (parentDirectory ? `${parentDirectory}/${previewFilename}` : previewFilename);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameValue.trim()) {
      setErrorMessage('Name cannot be empty.');
      return;
    }

    if (!isAdminActive) {
      setErrorMessage('GitHub Personal Access Token is required to rename items in the repository.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const finalFilename = isFolder ? nameValue.trim() : previewFilename;
      const res = await onConfirmRename(target, finalFilename, isQuiz ? titleValue.trim() : undefined);
      setIsSubmitting(false);
      if (res.success) {
        playSuccessChime();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to rename item.');
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : 'Unknown error during rename';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Rename {isFolder ? 'Folder' : 'Quiz'}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900/60">
                  GitHub Live
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Update name and commit changes directly to <strong className="font-mono text-neutral-700 dark:text-neutral-300">{ghOwner}/{ghRepo}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors disabled:opacity-40 cursor-pointer"
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Rename Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {!isAdminActive && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>GitHub Personal Access Token required to rename files or folders in the repository.</span>
              </div>
              {onOpenAdminConfig && (
                <button
                  type="button"
                  onClick={onOpenAdminConfig}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-xs transition-colors shrink-0 shadow-2xs"
                >
                  Configure Token
                </button>
              )}
            </div>
          )}

          {/* Current Path Info Box */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700/70 text-xs space-y-2">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
              {isFolder ? (
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              ) : (
                <FileCode className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <span className="font-semibold">Current Path:</span>
              <code className="font-mono text-neutral-800 dark:text-neutral-200 truncate flex-1">{currentPath}</code>
            </div>

            {previewNewPath && previewNewPath !== currentPath && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 pt-1 border-t border-neutral-200/60 dark:border-neutral-700/60">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">New Path:</span>
                <code className="font-mono truncate flex-1">{previewNewPath}</code>
              </div>
            )}
          </div>

          {/* Input for Quiz Title if Quiz */}
          {isQuiz && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Display Title
              </label>
              <input
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                placeholder="e.g. Immunology Chapter 5: T Cell Mediated Immunity"
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Updates the internal quiz title and HTML &lt;title&gt; header.
              </p>
            </div>
          )}

          {/* Input for File Name or Folder Name */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {isFolder ? 'Folder Name' : 'File Name (HTML)'}
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                placeholder={isFolder ? 'e.g. year_iv' : 'e.g. immunology_quiz'}
                className="w-full px-3 py-2 bg-white dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                disabled={isSubmitting}
                autoFocus
              />
              {isQuiz && !nameValue.toLowerCase().endsWith('.html') && (
                <span className="absolute right-3 text-xs text-neutral-400 font-mono pointer-events-none">
                  .html
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              {isFolder 
                ? 'Renaming the folder moves all nested files to the new folder path automatically on GitHub.'
                : 'Renaming the file updates its GitHub repository file path and permalink.'}
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                onClose();
              }}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium text-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !nameValue.trim() || !isAdminActive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Renaming...</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Rename</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
