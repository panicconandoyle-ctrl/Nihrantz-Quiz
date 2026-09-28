import React from 'react';
import { 
  Folder, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Heart, 
  Minus, 
  Square, 
  X, 
  HelpCircle, 
  Github, 
  Upload, 
  Lock, 
  Crown, 
  LogOut,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { playNavSound } from '../utils/audio';

interface TitleBarProps {
  currentPath: string;
  isDark: boolean;
  onToggleTheme: () => void;
  isSound: boolean;
  onToggleSound: () => void;
  onOpenDonation: () => void;
  onOpenGuide: () => void;
  onOpenGitHubSync: () => void;
  onOpenUpload: () => void;
  isOwnerLoggedIn: boolean;
  onOpenOwnerLogin: () => void;
  onLogoutOwner: () => void;
  isAdminActive: boolean;
  onOpenAdminConfig: () => void;
  ghConfig: { owner: string; repo: string; branch: string };
  isSyncing?: boolean;
  lastSyncTime?: string;
  pendingSyncCount?: number;
  onTriggerSync?: () => void;
  onNavigatePath?: (path: string) => void;
}

export function formatTitleSegment(segment: string): string {
  if (!segment) return '';
  if (segment.toLowerCase() === 'quizzes') return 'Quizzes';
  if (segment.toLowerCase() === 'up') return 'UP';
  return segment
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const TitleBar: React.FC<TitleBarProps> = ({
  currentPath,
  isDark,
  onToggleTheme,
  isSound,
  onToggleSound,
  onOpenDonation,
  onOpenGuide,
  onOpenGitHubSync,
  onOpenUpload,
  isOwnerLoggedIn,
  onOpenOwnerLogin,
  onLogoutOwner,
  isAdminActive,
  onOpenAdminConfig,
  ghConfig,
  isSyncing = false,
  lastSyncTime,
  pendingSyncCount = 0,
  onTriggerSync,
  onNavigatePath,
}) => {
  const pathSegments = currentPath.split('/').filter(Boolean);
  const displaySegments = pathSegments.length > 0 ? pathSegments : ['quizzes'];
  const repoUrl = `https://github.com/${ghConfig.owner}/${ghConfig.repo}`;

  return (
    <header className="h-10 bg-[#f3f3f3] dark:bg-[#202020] border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-3 select-none text-xs text-neutral-600 dark:text-neutral-300 shrink-0">
      {/* Left: Window Tab with Clickable Breadcrumb Path + GitHub Synchronized Status Badge */}
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-[#2b2b2b] rounded-t-md border-t border-x border-neutral-200 dark:border-neutral-700 font-medium text-neutral-800 dark:text-neutral-100 shadow-xs max-w-[280px] sm:max-w-[420px] overflow-x-auto no-scrollbar">
          <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0 mr-0.5" />
          {displaySegments.map((segment, idx) => {
            const subPath = displaySegments.slice(0, idx + 1).join('/');
            const isLast = idx === displaySegments.length - 1;
            const displayName = formatTitleSegment(segment);
            return (
              <React.Fragment key={subPath}>
                <button
                  type="button"
                  onClick={() => {
                    playNavSound();
                    onNavigatePath?.(subPath);
                  }}
                  className={`px-1 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer truncate max-w-[120px] text-xs ${
                    isLast 
                      ? 'font-bold text-neutral-900 dark:text-neutral-100' 
                      : 'text-neutral-500 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline'
                  }`}
                  title={`Click to navigate directly to ${displayName} (${subPath})`}
                >
                  {displayName}
                </button>
                {!isLast && <span className="text-neutral-300 dark:text-neutral-600 text-[10px] select-none">/</span>}
              </React.Fragment>
            );
          })}
        </div>
        <span className="text-neutral-400 dark:text-neutral-500 hidden sm:inline">Nihrantz Quiz Explorer</span>

        {/* GitHub Linked Repository Link Badge */}
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 transition-colors border border-neutral-300/70 dark:border-neutral-700"
          title={`View repository on GitHub: ${ghConfig.owner}/${ghConfig.repo}`}
        >
          <Github className="w-3.5 h-3.5" />
          <span className="font-mono">{ghConfig.owner}/{ghConfig.repo}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>

        {/* GitHub Sync Status Badge */}
        <button
          onClick={() => {
            playNavSound();
            if (onTriggerSync) onTriggerSync();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all border shadow-2xs ${
            isSyncing
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/60'
              : pendingSyncCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/60 hover:bg-amber-100'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100'
          }`}
          title={
            isSyncing
              ? "Synchronizing live with GitHub..."
              : pendingSyncCount > 0
              ? `${pendingSyncCount} item(s) pending sync to GitHub (Click to sync now)`
              : `Synchronized with GitHub: ${ghConfig.owner}/${ghConfig.repo} (${lastSyncTime ? `Last sync: ${lastSyncTime}` : 'Live'})`
          }
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-600' : pendingSyncCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
          <span className="hidden md:inline">
            {isSyncing ? 'Syncing...' : pendingSyncCount > 0 ? `${pendingSyncCount} Needs Sync` : 'Synced with GitHub'}
          </span>
        </button>

        {/* GitHub Admin Mode Indicator Badge */}
        <button
          onClick={() => {
            playNavSound();
            onOpenAdminConfig();
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold transition-all border ${
            isAdminActive
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 shadow-2xs hover:bg-emerald-100'
              : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-300/60'
          }`}
          title={isAdminActive ? "Admin Active: GitHub Personal Access Token configured (Click to edit)" : "Public View: Read-only mode (Click to set Admin Token)"}
        >
          <span className={`w-2 h-2 rounded-full ${isAdminActive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'}`} />
          <span className="hidden md:inline">{isAdminActive ? 'Admin Active' : 'Public View'}</span>
        </button>
      </div>

      {/* Right: Quick Tools, Owner Status, & Window Controls */}
      <div className="flex items-center gap-1">
        {/* Owner Status / Login Pill */}
        {isOwnerLoggedIn ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-md text-amber-800 dark:text-amber-200 font-medium mr-1">
            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="hidden sm:inline">Nihrantz (Owner)</span>
            <button
              onClick={() => {
                playNavSound();
                onLogoutOwner();
              }}
              className="ml-1 p-0.5 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
              title="Log out of Owner mode"
            >
              <LogOut className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              playNavSound();
              onOpenOwnerLogin();
            }}
            className="flex items-center gap-1 px-2.5 py-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-md transition-colors font-medium border border-neutral-300/60 dark:border-neutral-700/60 mr-1"
            title="Owner Login (Nihrantz)"
          >
            <Lock className="w-3 h-3 text-neutral-500" />
            <span className="hidden sm:inline">Owner Login</span>
          </button>
        )}

        {/* Upload Quiz Button in Title Bar (Visible when Admin or Owner) */}
        {(isAdminActive || isOwnerLoggedIn) && (
          <button
            onClick={() => {
              playNavSound();
              onOpenUpload();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-md transition-colors font-semibold border border-blue-200/60 dark:border-blue-800/50 mr-1"
            title="Upload HTML Quiz Code to Folder"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Quiz</span>
          </button>
        )}

        {/* Support Creator */}
        <button
          onClick={() => {
            playNavSound();
            onOpenDonation();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-md transition-colors font-medium border border-rose-200/60 dark:border-rose-800/50 mr-1"
          title="Support the Creator (Bank QR / Buy Me a Coffee)"
        >
          <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span className="hidden md:inline">Support Creator</span>
        </button>

        {/* GitHub Two-Way Sync / Discovery */}
        <button
          onClick={() => {
            playNavSound();
            onOpenGitHubSync();
          }}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-md transition-colors"
          title="GitHub Auto-Discovery & Two-Way Sync Settings"
          aria-label="GitHub Auto-Discovery"
        >
          <Github className="w-3.5 h-3.5" />
        </button>

        {/* Deployment Guide */}
        <button
          onClick={() => {
            playNavSound();
            onOpenGuide();
          }}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-md transition-colors"
          title="GitHub Pages 2-Minute Deployment Guide"
          aria-label="GitHub Pages Deployment Guide"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        {/* Sound Toggle */}
        <button
          onClick={() => {
            onToggleSound();
          }}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-md transition-colors"
          title={isSound ? "Mute UI sounds" : "Enable UI sounds"}
          aria-label="Toggle UI Sound"
        >
          {isSound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400" />}
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => {
            playNavSound();
            onToggleTheme();
          }}
          className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-md transition-colors"
          title={isDark ? "Switch to Windows Light mode" : "Switch to Windows Dark mode"}
          aria-label="Toggle Theme"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-neutral-600" />}
        </button>

        <div className="h-4 w-[1px] bg-neutral-300 dark:bg-neutral-700 mx-1"></div>

        {/* Windows Standard Controls */}
        <button 
          className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-sm text-neutral-600 dark:text-neutral-300"
          title="Minimize"
          aria-label="Minimize"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button 
          className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700/60 rounded-sm text-neutral-600 dark:text-neutral-300"
          title="Maximize"
          aria-label="Maximize"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button 
          className="p-1.5 hover:bg-red-600 hover:text-white rounded-sm text-neutral-600 dark:text-neutral-300 transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};
