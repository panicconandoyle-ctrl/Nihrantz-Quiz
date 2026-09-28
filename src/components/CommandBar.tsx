import React, { useState } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowUp, 
  RotateCw, 
  Search, 
  X, 
  LayoutGrid, 
  List, 
  Copy, 
  Check, 
  HardDrive,
  Folder,
  ChevronRight,
  ArrowUpDown,
  Upload,
  FolderPlus,
  Download,
  Lock,
  Github,
  ExternalLink,
  RefreshCw,
  ArrowUpCircle,
  Trash2,
  PanelRight
} from 'lucide-react';
import { ViewMode, SortField, SortDirection } from '../types';
import { playNavSound } from '../utils/audio';

interface CommandBarProps {
  currentPath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onRefresh: () => void;
  onNavigatePath: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchScope: 'current' | 'global';
  onToggleSearchScope: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField) => void;
  onOpenUpload: () => void;
  onOpenNewFolder: () => void;
  onExportManifest: () => void;
  isOwnerLoggedIn: boolean;
  isAdminActive: boolean;
  onOpenAdminConfig: () => void;
  ghConfig: { owner: string; repo: string; branch: string };
  isSyncing?: boolean;
  pendingSyncCount?: number;
  onSyncAllToGitHub?: () => void;
  selectedCount?: number;
  onDeleteSelected?: () => void;
  onOpenMultiDelete?: () => void;
  showPreviewPane?: boolean;
  onTogglePreviewPane?: () => void;
}

// Format path segments cleanly (e.g. quizzes -> Quizzes, year_iii -> Year III)
export function formatSegmentName(segment: string): string {
  if (!segment) return '';
  if (segment.toLowerCase() === 'quizzes') return 'Quizzes';
  if (segment.toLowerCase() === 'up') return 'UP';
  return segment
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const CommandBar: React.FC<CommandBarProps> = ({
  currentPath,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onGoUp,
  onRefresh,
  onNavigatePath,
  searchQuery,
  onSearchChange,
  searchScope,
  onToggleSearchScope,
  viewMode,
  onViewModeChange,
  sortField,
  sortDirection,
  onSortChange,
  onOpenUpload,
  onOpenNewFolder,
  onExportManifest,
  isOwnerLoggedIn,
  isAdminActive,
  onOpenAdminConfig,
  ghConfig,
  isSyncing = false,
  pendingSyncCount = 0,
  onSyncAllToGitHub,
  selectedCount = 0,
  onDeleteSelected,
  onOpenMultiDelete,
  showPreviewPane = false,
  onTogglePreviewPane,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Compute breadcrumbs
  const pathParts = currentPath.split('/').filter(Boolean);
  const displayParts = pathParts.length > 0 ? pathParts : ['quizzes'];
  
  const handleCopyPath = () => {
    navigator.clipboard.writeText(currentPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const folderGitHubUrl = `https://github.com/${ghConfig.owner}/${ghConfig.repo}/tree/${ghConfig.branch || 'main'}/${currentPath}`;

  return (
    <div className="bg-[#f9f9f9] dark:bg-[#252525] border-b border-neutral-200 dark:border-neutral-800 px-3 py-1.5 flex flex-col md:flex-row items-stretch md:items-center gap-2 select-none text-xs">
      {/* Top / Left: Navigation controls + Address Bar */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        {/* Navigation Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => {
              playNavSound();
            }}
            disabled={!canGoBack}
            className={`p-1.5 rounded-md transition-colors ${
              canGoBack 
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200 cursor-pointer' 
                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
            }`}
            title="Back (Alt + Left Arrow)"
            aria-label="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              playNavSound();
            }}
            disabled={!canGoForward}
            className={`p-1.5 rounded-md transition-colors ${
              canGoForward 
                ? 'hover:bg-neutral-200 dark:hover:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200 cursor-pointer' 
                : 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
            }`}
            title="Forward (Alt + Right Arrow)"
            aria-label="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              playNavSound();
              onGoUp();
            }}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200 rounded-md transition-colors"
            title="Up to higher directory (Alt + Up Arrow)"
            aria-label="Up One Level"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          {/* Sync / Refresh from GitHub Button */}
          <button
            onClick={() => {
              playNavSound();
              onRefresh();
            }}
            disabled={isSyncing}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
              isSyncing
                ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 cursor-wait'
                : 'hover:bg-neutral-200 dark:hover:bg-neutral-700/60 text-neutral-700 dark:text-neutral-200'
            }`}
            title="Synchronize live from GitHub (pull latest commits & quizzes)"
            aria-label="Sync from GitHub"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Address / Breadcrumb Bar */}
        <div className="flex-1 flex items-center bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1 text-neutral-700 dark:text-neutral-200 shadow-2xs overflow-hidden h-8">
          <HardDrive className="w-3.5 h-3.5 text-blue-500 shrink-0 mr-1.5" />
          <button
            onClick={() => {
              playNavSound();
              onNavigatePath('quizzes');
            }}
            className="hover:underline text-neutral-500 dark:text-neutral-400 shrink-0 font-medium"
          >
            This PC
          </button>

          <ChevronRight className="w-3 h-3 text-neutral-400 mx-1 shrink-0" />

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar whitespace-nowrap min-w-0 flex-1">
            {displayParts.map((part, index) => {
              const subPath = displayParts.slice(0, index + 1).join('/');
              const isLast = index === displayParts.length - 1;
              const formattedName = formatSegmentName(part);
              return (
                <React.Fragment key={subPath}>
                  <button
                    type="button"
                    onClick={() => {
                      playNavSound();
                      onNavigatePath(subPath);
                    }}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer text-xs ${
                      isLast 
                        ? 'font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100/80 dark:bg-neutral-800/80 shadow-2xs' 
                        : 'text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:underline'
                    }`}
                    title={`Click to navigate to ${formattedName} (${subPath})`}
                  >
                    <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                    <span>{formattedName}</span>
                  </button>
                  {!isLast && <ChevronRight className="w-3 h-3 text-neutral-400 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Open Current Folder in GitHub */}
          <a
            href={folderGitHubUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 shrink-0 transition-colors ml-1 flex items-center gap-0.5"
            title={`View ${currentPath} folder on GitHub`}
          >
            <Github className="w-3 h-3" />
            <ExternalLink className="w-2.5 h-2.5" />
          </a>

          <button
            onClick={handleCopyPath}
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 shrink-0 transition-colors ml-0.5"
            title="Copy path to clipboard"
            aria-label="Copy Path"
          >
            {copiedPath ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Center/Right: Action Buttons + Search Box + View Switcher + Sort */}
      <div className="flex items-center gap-1.5 shrink-0 justify-between md:justify-end flex-wrap">
        {/* Sync to GitHub Button (Shown if there are pending items) */}
        {pendingSyncCount > 0 && onSyncAllToGitHub && (
          <button
            onClick={() => {
              playNavSound();
              onSyncAllToGitHub();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-semibold text-xs transition-colors shadow-2xs h-8 animate-pulse"
            title={`${pendingSyncCount} local quiz(zes) pending sync to GitHub (Click to push now)`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>Sync to GitHub ({pendingSyncCount})</span>
          </button>
        )}

        {/* Windows 11 Ribbon Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Admin / Public Status Badge */}
          <button
            onClick={() => {
              playNavSound();
              onOpenAdminConfig();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all h-8 ${
              isAdminActive
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 shadow-2xs hover:bg-emerald-100'
                : 'bg-white dark:bg-[#1f1f1f] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
            title={isAdminActive ? "Admin Active: GitHub Token Configured (Click to edit)" : "Public View: Read-Only Mode (Click to set Token)"}
          >
            <span className={`w-2 h-2 rounded-full ${isAdminActive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
            <span className="hidden sm:inline">{isAdminActive ? 'Admin Active' : 'Public View'}</span>
          </button>

          {/* Admin Action Buttons (Visible only when Admin or Owner is active) */}
          {(isAdminActive || isOwnerLoggedIn) && (
            <>
              <button
                onClick={() => {
                  playNavSound();
                  onOpenUpload();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold text-xs transition-colors shadow-2xs h-8"
                title="Upload HTML Quiz file and commit directly to GitHub repository"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Quiz</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onOpenNewFolder();
                }}
                className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-md font-medium text-xs transition-colors h-8"
                title="Create a new subfolder permanently in GitHub"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">New Folder</span>
              </button>

              {/* Multi-Delete or Clean Up action */}
              {selectedCount > 0 ? (
                <button
                  onClick={() => {
                    playNavSound();
                    onDeleteSelected?.();
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-xs transition-colors shadow-2xs h-8 animate-in fade-in zoom-in-95"
                  title={`Delete ${selectedCount} selected items permanently from repository`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedCount})</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    playNavSound();
                    onOpenMultiDelete?.();
                  }}
                  className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-700 dark:text-neutral-200 hover:text-rose-600 dark:hover:text-rose-400 rounded-md font-medium text-xs transition-colors h-8"
                  title="Select and delete multiple quizzes or folders"
                >
                  <Trash2 className="w-3.5 h-3.5 text-neutral-400 group-hover:text-rose-500" />
                  <span className="hidden sm:inline">Clean Up</span>
                </button>
              )}

              <button
                onClick={() => {
                  playNavSound();
                  onExportManifest();
                }}
                className="p-1.5 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-md transition-colors h-8"
                title="Export / Download updated quizzes.json manifest"
                aria-label="Export Manifest"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Search Box */}
        <div className="relative flex items-center bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 rounded-md px-2.5 py-1 text-neutral-700 dark:text-neutral-200 shadow-2xs h-8 w-full md:w-52 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${searchScope === 'global' ? 'all quizzes...' : 'current folder...'}`}
            className="bg-transparent border-none outline-none w-full text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              title="Clear search"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => {
              playNavSound();
              onToggleSearchScope();
            }}
            className="ml-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-500 dark:text-neutral-400 shrink-0"
            title={searchScope === 'global' ? "Searching all subfolders (Click to switch to current folder)" : "Searching current folder only (Click to switch to global)"}
          >
            {searchScope}
          </button>
        </div>

        {/* Sort Menu */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="p-1.5 bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-md transition-colors flex items-center gap-1 h-8"
            title="Sort items"
            aria-label="Sort Options"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden lg:inline capitalize">{sortField}</span>
          </button>

          {showSortMenu && (
            <div className="absolute right-0 top-9 w-44 bg-white dark:bg-[#252525] border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg p-1 z-30 flex flex-col gap-0.5 text-xs text-neutral-700 dark:text-neutral-200">
              <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Sort by</div>
              {(['name', 'difficulty', 'questions', 'time', 'date'] as SortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => {
                    playNavSound();
                    onSortChange(field);
                    setShowSortMenu(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700/60 capitalize flex items-center justify-between ${
                    sortField === field ? 'font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40' : ''
                  }`}
                >
                  <span>{field === 'time' ? 'Duration' : field}</span>
                  {sortField === field && (
                    <span className="text-[10px] text-neutral-400">{sortDirection.toUpperCase()}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Switcher: Grid vs Details */}
        <div className="flex items-center bg-white dark:bg-[#1f1f1f] border border-neutral-200 dark:border-neutral-700 rounded-md p-0.5 h-8">
          <button
            onClick={() => {
              playNavSound();
              onViewModeChange('grid');
            }}
            className={`p-1 rounded transition-colors ${
              viewMode === 'grid'
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-medium shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
            title="Grid View (Large Icons & Cards)"
            aria-label="Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              playNavSound();
              onViewModeChange('details');
            }}
            className={`p-1 rounded transition-colors ${
              viewMode === 'details'
                ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white font-medium shadow-2xs'
                : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
            title="Details View (List with Columns)"
            aria-label="Details View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Toggle Details & Preview Pane (Windows 11 Explorer Preview) */}
        <button
          onClick={() => {
            playNavSound();
            onTogglePreviewPane?.();
          }}
          className={`p-1.5 border rounded-md transition-colors flex items-center gap-1.5 h-8 ${
            showPreviewPane
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-300 font-semibold shadow-2xs'
              : 'bg-white dark:bg-[#1f1f1f] border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          }`}
          title="Toggle Details & Preview Pane (Alt + P)"
          aria-label="Toggle Details & Preview Pane"
          aria-pressed={showPreviewPane}
        >
          <PanelRight className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px]">Preview</span>
        </button>
      </div>
    </div>
  );
};
