import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  X, 
  Github, 
  RefreshCw, 
  Key, 
  CheckCircle2, 
  Folder, 
  FileCode, 
  CheckSquare, 
  Square, 
  Search,
  Filter,
  AlertCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { playNavSound, playDeleteSound, playSuccessChime } from '../utils/audio';
import { DeleteItemTarget } from '../types';

export type { DeleteItemTarget };

interface ItemStatusState {
  status: 'idle' | 'deleting' | 'success' | 'error';
  error?: string;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: DeleteItemTarget | null;
  targets?: DeleteItemTarget[];
  availableItems?: DeleteItemTarget[];
  isAdminActive: boolean;
  ghOwner: string;
  ghRepo: string;
  onConfirmDelete: (
    targets: DeleteItemTarget[],
    onProgress?: (
      index: number,
      total: number,
      item: DeleteItemTarget,
      status: 'deleting' | 'success' | 'error',
      errorMsg?: string
    ) => void
  ) => Promise<{ success: boolean; deletedCount: number; errors: { item: DeleteItemTarget; error: string }[] }>;
  onOpenAdminConfig?: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  target,
  targets,
  availableItems,
  isAdminActive,
  ghOwner,
  ghRepo,
  onConfirmDelete,
  onOpenAdminConfig,
}) => {
  // Combine all items to be considered
  const initialItems = useMemo<DeleteItemTarget[]>(() => {
    const list: DeleteItemTarget[] = [];
    const seen = new Set<string>();

    if (targets && targets.length > 0) {
      for (const t of targets) {
        if (!seen.has(t.path)) {
          seen.add(t.path);
          list.push(t);
        }
      }
    } else if (target) {
      list.push(target);
      seen.add(target.path);
    }

    // If availableItems provided, allow user to browse and select additional items in folder
    if (availableItems && availableItems.length > 0) {
      for (const t of availableItems) {
        if (!seen.has(t.path)) {
          seen.add(t.path);
          list.push(t);
        }
      }
    }

    return list;
  }, [target, targets, availableItems]);

  // Selected item IDs (by path)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'quiz' | 'folder'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Deletion execution states
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [itemStatuses, setItemStatuses] = useState<Record<string, ItemStatusState>>({});
  const [progressInfo, setProgressInfo] = useState<{ current: number; total: number; currentItemName?: string } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [completionSummary, setCompletionSummary] = useState<{ success: boolean; deletedCount: number; failedCount: number } | null>(null);

  // Initialize selected items whenever modal opens or targets change
  useEffect(() => {
    if (isOpen) {
      const initialSelected = new Set<string>();
      if (targets && targets.length > 0) {
        targets.forEach(t => initialSelected.add(t.path));
      } else if (target) {
        initialSelected.add(target.path);
      } else if (initialItems.length > 0) {
        initialItems.forEach(t => initialSelected.add(t.path));
      }
      setSelectedPaths(initialSelected);
      setItemStatuses({});
      setProgressInfo(null);
      setGlobalError(null);
      setCompletionSummary(null);
      setSearchFilter('');
      setFilterType('all');
    }
  }, [isOpen, target, targets, initialItems]);

  if (!isOpen || initialItems.length === 0) return null;

  // Filter items based on active type tab and search filter
  const displayedItems = initialItems.filter(item => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.path.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const selectedCount = selectedPaths.size;
  const totalAvailable = initialItems.length;
  const isAllSelected = totalAvailable > 0 && selectedCount === totalAvailable;

  const toggleSelectAll = () => {
    playNavSound();
    if (isAllSelected) {
      setSelectedPaths(new Set());
    } else {
      const next = new Set<string>();
      initialItems.forEach(item => next.add(item.path));
      setSelectedPaths(next);
    }
  };

  const toggleItemSelection = (path: string) => {
    if (isDeleting) return;
    playNavSound();
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getCategoryColor = (category?: string) => {
    if (!category) return 'text-blue-500';
    switch (category.toLowerCase()) {
      case 'science': return 'text-emerald-500';
      case 'immunology': return 'text-rose-500';
      case 'history': return 'text-amber-500';
      case 'computer science': return 'text-indigo-500';
      case 'geography': return 'text-sky-500';
      default: return 'text-blue-500';
    }
  };

  // Execution: Batch deletion
  const handleExecuteDelete = async () => {
    const itemsToDelete = initialItems.filter(item => selectedPaths.has(item.path));
    if (itemsToDelete.length === 0) return;

    if (!isAdminActive) {
      setGlobalError('GitHub Personal Access Token is required to permanently delete files or folders from the repository.');
      return;
    }

    setIsDeleting(true);
    setGlobalError(null);
    setCompletionSummary(null);

    // Initialize all to idle/pending
    const statuses: Record<string, ItemStatusState> = {};
    itemsToDelete.forEach(i => {
      statuses[i.path] = { status: 'idle' };
    });
    setItemStatuses(statuses);
    setProgressInfo({ current: 0, total: itemsToDelete.length });

    try {
      const result = await onConfirmDelete(itemsToDelete, (idx, total, currentItem, status, errorMsg) => {
        setProgressInfo({ current: idx, total, currentItemName: currentItem.name });
        setItemStatuses(prev => ({
          ...prev,
          [currentItem.path]: { status, error: errorMsg },
        }));
      });

      setIsDeleting(false);

      if (result.success) {
        playDeleteSound();
        setCompletionSummary({
          success: true,
          deletedCount: result.deletedCount,
          failedCount: 0,
        });
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setCompletionSummary({
          success: false,
          deletedCount: result.deletedCount,
          failedCount: result.errors.length,
        });
        if (result.errors.length > 0) {
          setGlobalError(`${result.errors.length} item(s) failed to delete from GitHub: ${result.errors[0].error}`);
        }
      }
    } catch (err: unknown) {
      setIsDeleting(false);
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      setGlobalError(msg);
    }
  };

  const containsFolders = initialItems.some(i => selectedPaths.has(i.path) && i.type === 'folder');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <span>Delete {selectedCount > 1 ? `${selectedCount} Items` : 'Item'} Permanently</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                  GitHub Live
                </span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Select items to permanently remove from repository <strong className="font-mono text-neutral-700 dark:text-neutral-300">{ghOwner}/{ghRepo}</strong>
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
            title="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Warning / Notifications */}
        <div className="px-5 pt-3 space-y-2">
          {globalError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Deletion Error</span>
                <span>{globalError}</span>
              </div>
            </div>
          )}

          {completionSummary && completionSummary.success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Successfully deleted {completionSummary.deletedCount} item(s) from GitHub repository!</span>
            </div>
          )}

          {!isAdminActive && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>GitHub Personal Access Token required to delete files from repository.</span>
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

          {/* Destructive Warning Callout */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200/80 dark:border-neutral-700/60 flex items-start gap-2.5 text-xs text-neutral-700 dark:text-neutral-300">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                Permanent Deletion Notice:
              </span>{' '}
              Selected files and folders will be removed from <span className="font-mono">{ghOwner}/{ghRepo}</span> (branch <code className="font-mono">main</code>).
              {containsFolders && (
                <span className="block mt-1 text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠️ Folders will have all contained quizzes and files recursively deleted from GitHub.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Progress Bar (Shown during deletion) */}
        {isDeleting && progressInfo && (
          <div className="px-5 pt-3">
            <div className="bg-neutral-100 dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between text-xs mb-1.5 font-semibold text-neutral-800 dark:text-neutral-200">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Deleting from GitHub: {progressInfo.currentItemName || 'In progress...'}</span>
                </span>
                <span className="font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {progressInfo.current} / {progressInfo.total} ({Math.round((progressInfo.current / progressInfo.total) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(progressInfo.current / progressInfo.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Selection & Filter Ribbon */}
        <div className="px-5 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {/* Select All / Deselect All Button */}
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-lg font-medium transition-colors border border-neutral-300/70 dark:border-neutral-700 disabled:opacity-50"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Select All ({totalAvailable})</span>
                </>
              )}
            </button>

            {/* Type Filter Pills */}
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-800/80 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                  filterType === 'all'
                    ? 'bg-white dark:bg-[#2b2b2b] text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                All ({initialItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('quiz')}
                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                  filterType === 'quiz'
                    ? 'bg-white dark:bg-[#2b2b2b] text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                Quizzes ({initialItems.filter(i => i.type === 'quiz').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('folder')}
                className={`px-2 py-0.5 rounded-md font-medium text-[11px] transition-colors ${
                  filterType === 'folder'
                    ? 'bg-white dark:bg-[#2b2b2b] text-neutral-900 dark:text-neutral-100 shadow-2xs font-semibold'
                    : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                Folders ({initialItems.filter(i => i.type === 'folder').length})
              </button>
            </div>
          </div>

          {/* Quick Search in deletion list */}
          {initialItems.length > 3 && (
            <div className="relative flex items-center bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-700 rounded-lg px-2 py-0.5 text-neutral-700 dark:text-neutral-200 w-full sm:w-44">
              <Search className="w-3 h-3 text-neutral-400 mr-1 shrink-0" />
              <input
                type="text"
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                placeholder="Filter list..."
                className="bg-transparent border-none outline-none w-full text-xs text-neutral-800 dark:text-neutral-100 placeholder-neutral-400"
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter('')}
                  className="p-0.5 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Item Checklist */}
        <div className="px-5 py-3 flex-1 overflow-y-auto space-y-1.5 min-h-[160px] max-h-[300px]">
          {displayedItems.length === 0 ? (
            <div className="text-center py-8 text-neutral-400 text-xs">
              No items match your filter criteria.
            </div>
          ) : (
            displayedItems.map(item => {
              const isChecked = selectedPaths.has(item.path);
              const statusInfo = itemStatuses[item.path];

              return (
                <div
                  key={item.path}
                  onClick={() => !isDeleting && toggleItemSelection(item.path)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20'
                      : 'border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-800/30 opacity-60 hover:opacity-90'
                  }`}
                >
                  {/* Left: Checkbox + Icon + Details */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDeleting}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-neutral-300 dark:border-neutral-600 shrink-0 cursor-pointer"
                    />

                    {item.type === 'folder' ? (
                      <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                    ) : (
                      <FileCode className={`w-4 h-4 ${getCategoryColor(item.category)} shrink-0`} />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded uppercase tracking-wider bg-neutral-200/70 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300">
                          {item.type}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 font-mono truncate block">
                        {item.path}
                      </span>
                    </div>
                  </div>

                  {/* Right: Meta & Live Status */}
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {/* Live Deletion Status */}
                    {statusInfo && statusInfo.status === 'deleting' && (
                      <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">Deleting...</span>
                      </span>
                    )}
                    {statusInfo && statusInfo.status === 'success' && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Deleted</span>
                      </span>
                    )}
                    {statusInfo && statusInfo.status === 'error' && (
                      <span className="flex items-center gap-1 text-[11px] text-rose-600 font-semibold bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200" title={statusInfo.error}>
                        <AlertCircle className="w-3 h-3" />
                        <span>Failed</span>
                      </span>
                    )}

                    {/* Meta info when not status */}
                    {!statusInfo && item.type === 'folder' && (
                      <span className="text-[11px] text-neutral-400">
                        {item.quizCount !== undefined ? `${item.quizCount} item(s)` : 'Folder'}
                      </span>
                    )}
                    {!statusInfo && item.type === 'quiz' && (
                      <span className="text-[11px] text-neutral-400">
                        {item.size || (item.category ? item.category : 'Quiz')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Actions */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#252525] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-medium">
              {selectedCount} of {totalAvailable} item(s) selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                onClose();
              }}
              disabled={isDeleting}
              className="px-3.5 py-1.5 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 font-medium transition-colors disabled:opacity-40"
            >
              {completionSummary ? 'Close' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleExecuteDelete}
              disabled={isDeleting || selectedCount === 0 || !isAdminActive}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-lg font-bold shadow-xs transition-colors"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting ({selectedCount})...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    Delete {selectedCount > 1 ? `${selectedCount} Selected Items` : 'Permanently'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
