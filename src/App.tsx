/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { CommandBar } from './components/CommandBar';
import { Sidebar } from './components/Sidebar';
import { ExplorerContent } from './components/ExplorerContent';
import { QuizPlayerModal } from './components/QuizPlayerModal';
import { DonationModal } from './components/DonationModal';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { UploadQuizModal } from './components/UploadQuizModal';
import { NewFolderModal } from './components/NewFolderModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { AdminConfigModal } from './components/AdminConfigModal';
import { DeleteConfirmModal, DeleteItemTarget } from './components/DeleteConfirmModal';
import { 
  GitHubConfig, 
  getStoredGithubConfig, 
  hasAdminToken, 
  fetchGitHubQuizTree,
  deleteFileFromGitHub,
  deleteFolderFromGitHub
} from './services/githubService';
import { 
  QuizManifest, 
  FolderNode, 
  QuizItem, 
  ViewMode, 
  SortField, 
  SortDirection 
} from './types';
import { 
  defaultManifest, 
  findFolderByPath, 
  getAllQuizzes,
  countFolderQuizzes
} from './data/defaultManifest';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  playNavSound,
  playSuccessChime
} from './utils/audio';

export default function App() {
  // Manifest & Tree Data
  const [manifest, setManifest] = useState<QuizManifest>(defaultManifest);
  const rootFolder: FolderNode = manifest.folders[0] || defaultManifest.folders[0];

  // Path & History Navigation
  const [currentPath, setCurrentPath] = useState<string>('quizzes');
  const [navHistory, setNavHistory] = useState<string[]>(['quizzes']);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<'current' | 'global'>('current');

  // View & Sort Options
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Preferences & Persistence
  const [isDark, setIsDark] = useState<boolean>(false);
  const [isSound, setIsSound] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [completedQuizzes, setCompletedQuizzes] = useState<Record<string, { score: number; total: number; percentage: number }>>({});

  // Owner Authentication (Role-Based Access)
  const [isOwnerLoggedIn, setIsOwnerLoggedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('winquiz_owner_auth') === '1';
    } catch (e) {
      return false;
    }
  });
  const [showOwnerLoginModal, setShowOwnerLoginModal] = useState<boolean>(false);
  const [loginActionReason, setLoginActionReason] = useState<string>('');

  // Modals & Overlays
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [showDonation, setShowDonation] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showGitHubSync, setShowGitHubSync] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // GitHub Admin Mode & Configuration
  const [isAdminActive, setIsAdminActive] = useState<boolean>(() => hasAdminToken());
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => getStoredGithubConfig());

  // Deletion Management
  const [deleteTarget, setDeleteTarget] = useState<DeleteItemTarget | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Dynamic GitHub Sync State
  const [isDynamicMode, setIsDynamicMode] = useState<boolean>(false);
  const [githubRepoInfo, setGithubRepoInfo] = useState<{ owner: string; repo: string }>(() => {
    const cfg = getStoredGithubConfig();
    return { owner: cfg.owner, repo: cfg.repo };
  });

  // Dynamic Repository Fetching: Reads from GitHub REST API (Public or Authenticated)
  const [isLoadingRepo, setIsLoadingRepo] = useState<boolean>(true);

  const loadRepositoryData = useCallback(async () => {
    setIsLoadingRepo(true);
    const currentCfg = getStoredGithubConfig();
    setGhConfig(currentCfg);
    setGithubRepoInfo({ owner: currentCfg.owner, repo: currentCfg.repo });
    setIsAdminActive(hasAdminToken());

    // Attempt to fetch live repository tree from GitHub REST API
    if (currentCfg.owner && currentCfg.repo) {
      try {
        const ghResult = await fetchGitHubQuizTree(currentCfg);
        if (ghResult.success && ghResult.rootFolder && (ghResult.rootFolder.folders.length > 0 || ghResult.rootFolder.quizzes.length > 0)) {
          const liveManifest: QuizManifest = {
            name: `${currentCfg.owner}/${currentCfg.repo} Quizzes`,
            version: 'GitHub Live',
            lastUpdated: new Date().toISOString().split('T')[0],
            folders: [ghResult.rootFolder],
          };
          setManifest(liveManifest);
          setIsLoadingRepo(false);
          return;
        }
      } catch (e) {
        console.warn('GitHub live fetch failed, trying local manifest:', e);
      }
    }

    // Fallback: Fetch local quizzes.json
    try {
      const res = await fetch('/quizzes.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.folders) {
          setManifest(data);
          setIsLoadingRepo(false);
          return;
        }
      }
    } catch (e) {}

    // Ultimate fallback: embedded defaultManifest
    setManifest(defaultManifest);
    setIsLoadingRepo(false);
  }, []);

  // Load preferences from localStorage on mount and purge quiz/folder storage
  useEffect(() => {
    try {
      // Purge all browser storage for quizzes and folders as required
      localStorage.removeItem('winquiz_uploaded_quizzes');
      localStorage.removeItem('winquiz_custom_folders');
      localStorage.removeItem('winquiz_deleted_items');

      const savedTheme = localStorage.getItem('winquiz_theme');
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      }

      setIsSound(isSoundEnabled());

      const savedFavs = localStorage.getItem('winquiz_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));

      const savedScores = localStorage.getItem('winquiz_scores');
      if (savedScores) setCompletedQuizzes(JSON.parse(savedScores));

      const savedView = localStorage.getItem('winquiz_view_mode') as ViewMode;
      if (savedView) setViewMode(savedView);
    } catch (e) {}

    loadRepositoryData();
  }, [loadRepositoryData]);

  // Sync theme changes with DOM
  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('winquiz_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('winquiz_theme', 'light');
    }
  };

  const handleToggleSound = () => {
    const nextSound = !isSound;
    setIsSound(nextSound);
    setSoundEnabled(nextSound);
  };

  // URL Query Parameters auto-open
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quizParam = params.get('quiz');
    const folderParam = params.get('folder');

    if (folderParam) {
      setCurrentPath(folderParam);
    }

    if (quizParam) {
      const all = getAllQuizzes(rootFolder);
      const targetQuiz = all.find(q => q.path.endsWith(quizParam) || quizParam.endsWith(q.filename));
      if (targetQuiz) {
        setActiveQuiz(targetQuiz);
      }
    }
  }, [rootFolder]);

  // Navigate to path
  const handleNavigatePath = useCallback((newPath: string) => {
    const cleanPath = newPath.replace(/^\/+|\/+$/g, '');
    if (cleanPath === currentPath) return;

    setCurrentPath(cleanPath);
    // Push to history
    const updatedHistory = navHistory.slice(0, historyIndex + 1);
    updatedHistory.push(cleanPath);
    setNavHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setSearchQuery('');
  }, [currentPath, navHistory, historyIndex]);

  // History Back
  const handleGoBack = () => {
    if (historyIndex > 0) {
      playNavSound();
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentPath(navHistory[prevIndex]);
    }
  };

  // History Forward
  const handleGoForward = () => {
    if (historyIndex < navHistory.length - 1) {
      playNavSound();
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentPath(navHistory[nextIndex]);
    }
  };

  // Go Up One Level
  const handleGoUp = () => {
    if (currentPath === 'quizzes' || !currentPath.includes('/')) {
      handleNavigatePath('quizzes');
      return;
    }
    const parts = currentPath.split('/');
    parts.pop();
    handleNavigatePath(parts.join('/'));
  };

  // Refresh current folder
  const handleRefresh = () => {
    fetch('/quizzes.json')
      .then(res => res.json())
      .then(data => {
        if (data && data.folders) setManifest(data);
      })
      .catch(() => {});
  };

  // Favorites toggle
  const handleToggleFavorite = (quizId: string) => {
    setFavorites(prev => {
      const updated = prev.includes(quizId)
        ? prev.filter(id => id !== quizId)
        : [...prev, quizId];
      try {
        localStorage.setItem('winquiz_favorites', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Record quiz completion score
  const handleRecordScore = (quizId: string, score: number, total: number, percentage: number) => {
    setCompletedQuizzes(prev => {
      const updated = {
        ...prev,
        [quizId]: { score, total, percentage }
      };
      try {
        localStorage.setItem('winquiz_scores', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Handle Sort Change
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle View Mode Change
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('winquiz_view_mode', mode);
    } catch (e) {}
  };

  // Authentication Request Gatekeepers
  const handleRequestUpload = () => {
    if (isOwnerLoggedIn || isAdminActive) {
      setShowUploadModal(true);
    } else {
      setLoginActionReason('Admin authorization (GitHub token) or Owner login is required to upload new HTML quizzes.');
      setShowOwnerLoginModal(true);
    }
  };

  const handleRequestNewFolder = () => {
    if (isOwnerLoggedIn || isAdminActive) {
      setShowNewFolderModal(true);
    } else {
      setLoginActionReason('Admin authorization (GitHub token) or Owner login is required to create new folders.');
      setShowOwnerLoginModal(true);
    }
  };

  const handleRequestExportManifest = () => {
    if (isOwnerLoggedIn || isAdminActive) {
      handleExportManifest();
    } else {
      setLoginActionReason('Admin authorization or Owner login is required to export or update the manifest.');
      setShowOwnerLoginModal(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsOwnerLoggedIn(true);
    try {
      localStorage.setItem('winquiz_owner_auth', '1');
    } catch (e) {}
  };

  const handleLogoutOwner = () => {
    setIsOwnerLoggedIn(false);
    try {
      localStorage.removeItem('winquiz_owner_auth');
    } catch (e) {}
  };

  // Handle Export Manifest
  const handleExportManifest = () => {
    playSuccessChime();
    const cleanManifest = JSON.parse(JSON.stringify(manifest), (key, value) => {
      if (key === 'blobUrl') return undefined;
      return value;
    });
    const blob = new Blob([JSON.stringify(cleanManifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quizzes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Handle quiz committed to GitHub: refresh repository data directly from GitHub
  const handleQuizCommitted = async () => {
    await loadRepositoryData();
  };

  // Handle folder created on GitHub: refresh repository data and navigate to new folder
  const handleFolderCreated = async (newFolderPath: string) => {
    await loadRepositoryData();
    handleNavigatePath(newFolderPath);
  };

  // Item Deletion Handlers (Owner/Admin authenticated)
  const handleRequestDeleteQuiz = (quiz: QuizItem) => {
    if (!isOwnerLoggedIn && !isAdminActive) {
      setLoginActionReason('Owner login or GitHub Admin credentials required to delete quizzes.');
      setShowOwnerLoginModal(true);
      return;
    }
    setDeleteTarget({
      type: 'quiz',
      id: quiz.id,
      name: quiz.title,
      path: quiz.path,
      sha: quiz.sha,
    });
    setIsDeleteModalOpen(true);
  };

  const handleRequestDeleteFolder = (folder: FolderNode) => {
    if (!isOwnerLoggedIn && !isAdminActive) {
      setLoginActionReason('Owner login or GitHub Admin credentials required to delete folders.');
      setShowOwnerLoginModal(true);
      return;
    }
    setDeleteTarget({
      type: 'folder',
      id: folder.id,
      name: folder.name,
      path: folder.path,
      quizCount: countFolderQuizzes(folder),
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (
    target: DeleteItemTarget
  ): Promise<{ success: boolean; error?: string }> => {
    if (target.type === 'quiz') {
      const ghRes = await deleteFileFromGitHub(target.path, target.sha, undefined, ghConfig);
      if (!ghRes.success) {
        return { success: false, error: `GitHub delete failed: ${ghRes.error}` };
      }
    } else {
      const ghRes = await deleteFolderFromGitHub(target.path, ghConfig);
      if (!ghRes.success) {
        return { success: false, error: `GitHub folder delete failed: ${ghRes.error}` };
      }
    }

    // Refresh live from GitHub
    await loadRepositoryData();

    // If currentPath is deleted folder or inside it, navigate up
    if (target.type === 'folder' && (currentPath === target.path || currentPath.startsWith(target.path + '/'))) {
      const parts = target.path.split('/');
      parts.pop();
      const parentPath = parts.join('/') || 'quizzes';
      handleNavigatePath(parentPath);
    }

    return { success: true };
  };

  // Auto-Discovery GitHub API fetch
  const handleApplyDynamicTree = async (owner: string, repo: string): Promise<boolean> => {
    try {
      setGithubRepoInfo({ owner, repo });
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/quizzes`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) return false;

      // Build folder tree dynamically from GitHub public contents
      const dynamicFolder: FolderNode = {
        id: 'root-quizzes',
        name: 'quizzes',
        path: 'quizzes',
        folders: [],
        quizzes: []
      };

      for (const item of data) {
        if (item.type === 'dir') {
          dynamicFolder.folders.push({
            id: item.name,
            name: item.name,
            path: `quizzes/${item.name}`,
            folders: [],
            quizzes: []
          });
        } else if (item.name.endsWith('.html')) {
          const cleanTitle = item.name.replace('.html', '').replace(/_/g, ' ');
          dynamicFolder.quizzes.push({
            id: item.name,
            title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
            filename: item.name,
            path: `quizzes/${item.name}`,
            category: 'Dynamic GitHub',
            questionCount: 5,
            estimatedMinutes: 3,
            difficulty: 'Intermediate',
            tags: ['github', 'dynamic'],
            dateModified: new Date().toISOString().split('T')[0],
            size: `${(item.size / 1024).toFixed(1)} KB`
          });
        }
      }

      setManifest({
        name: `${owner}/${repo} Quizzes`,
        version: "Dynamic API",
        lastUpdated: new Date().toISOString().split('T')[0],
        folders: [dynamicFolder]
      });
      setIsDynamicMode(true);
      return true;
    } catch (e) {
      console.warn("GitHub API error, using default manifest:", e);
      return false;
    }
  };

  // Find Current Folder in Manifest
  const currentFolder = useMemo(() => {
    return findFolderByPath(rootFolder, currentPath) || rootFolder;
  }, [rootFolder, currentPath]);

  // Compute Display Items (Quizzes & Subfolders)
  const { quizzesToDisplay, subfoldersToDisplay } = useMemo(() => {
    let rawQuizzes: QuizItem[] = [];
    let rawFolders: FolderNode[] = [];

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const pool = searchScope === 'global' ? getAllQuizzes(rootFolder) : currentFolder.quizzes || [];
      rawQuizzes = pool.filter(item => 
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.topic && item.topic.toLowerCase().includes(q)) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(q))) ||
        item.filename.toLowerCase().includes(q)
      );
      rawFolders = searchScope === 'global' ? [] : (currentFolder.folders || []).filter(f => f.name.toLowerCase().includes(q));
    } else {
      rawQuizzes = [...(currentFolder.quizzes || [])];
      rawFolders = [...(currentFolder.folders || [])];
    }

    // Sort Quizzes
    rawQuizzes.sort((a, b) => {
      let comp = 0;
      switch (sortField) {
        case 'name':
          comp = a.title.localeCompare(b.title);
          break;
        case 'category':
          comp = a.category.localeCompare(b.category);
          break;
        case 'questions':
          comp = a.questionCount - b.questionCount;
          break;
        case 'time':
          comp = a.estimatedMinutes - b.estimatedMinutes;
          break;
        case 'difficulty': {
          const rank = { Beginner: 1, Intermediate: 2, Advanced: 3 };
          comp = rank[a.difficulty] - rank[b.difficulty];
          break;
        }
        case 'date':
          comp = a.dateModified.localeCompare(b.dateModified);
          break;
      }
      return sortDirection === 'asc' ? comp : -comp;
    });

    return { quizzesToDisplay: rawQuizzes, subfoldersToDisplay: rawFolders };
  }, [rootFolder, currentFolder, searchQuery, searchScope, sortField, sortDirection]);

  // List of all completed quiz objects for sidebar stats
  const recentCompletedQuizObjects = useMemo(() => {
    const all = getAllQuizzes(rootFolder);
    return all.filter(q => completedQuizzes[q.id]);
  }, [rootFolder, completedQuizzes]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#f3f3f3] dark:bg-[#202020] text-neutral-800 dark:text-neutral-100 font-sans">
      {/* 1. Windows 11 Title Bar */}
      <TitleBar
        currentPath={currentPath}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        isSound={isSound}
        onToggleSound={handleToggleSound}
        onOpenDonation={() => setShowDonation(true)}
        onOpenGuide={() => setShowGuide(true)}
        onOpenGitHubSync={() => setShowGitHubSync(true)}
        onOpenUpload={handleRequestUpload}
        isOwnerLoggedIn={isOwnerLoggedIn}
        onOpenOwnerLogin={() => {
          setLoginActionReason('');
          setShowOwnerLoginModal(true);
        }}
        onLogoutOwner={handleLogoutOwner}
        isAdminActive={isAdminActive}
        onOpenAdminConfig={() => setShowAdminModal(true)}
      />

      {/* 2. Ribbon & Command / Breadcrumb Bar */}
      <CommandBar
        currentPath={currentPath}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < navHistory.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onGoUp={handleGoUp}
        onRefresh={loadRepositoryData}
        onNavigatePath={handleNavigatePath}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchScope={searchScope}
        onToggleSearchScope={() => setSearchScope(prev => (prev === 'current' ? 'global' : 'current'))}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        onOpenUpload={handleRequestUpload}
        onOpenNewFolder={handleRequestNewFolder}
        onExportManifest={handleRequestExportManifest}
        isOwnerLoggedIn={isOwnerLoggedIn}
        isAdminActive={isAdminActive}
        onOpenAdminConfig={() => setShowAdminModal(true)}
      />

      {/* 3. Main Workspace: Sidebar + Explorer Content */}
      <div className="flex-1 flex min-h-0 relative">
        <Sidebar
          rootFolder={rootFolder}
          currentPath={currentPath}
          onNavigatePath={handleNavigatePath}
          favorites={favorites}
          recentQuizzes={recentCompletedQuizObjects}
          isOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        <ExplorerContent
          currentFolder={currentFolder}
          quizzesToDisplay={quizzesToDisplay}
          subfoldersToDisplay={subfoldersToDisplay}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onNavigatePath={handleNavigatePath}
          onOpenQuiz={(quiz) => setActiveQuiz(quiz)}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
          completedQuizzes={completedQuizzes}
          canManageItems={isOwnerLoggedIn || isAdminActive}
          onRequestDeleteQuiz={handleRequestDeleteQuiz}
          onRequestDeleteFolder={handleRequestDeleteFolder}
        />
      </div>

      {/* 4. Interactive HTML Quiz Player Modal */}
      {activeQuiz && (
        <QuizPlayerModal
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onRecordScore={handleRecordScore}
        />
      )}

      {/* 5. Creator Bank QR Donation Modal */}
      <DonationModal
        isOpen={showDonation}
        onClose={() => setShowDonation(false)}
      />

      {/* 6. GitHub Auto-Discovery Modal */}
      <GitHubSyncModal
        isOpen={showGitHubSync}
        onClose={() => setShowGitHubSync(false)}
        onApplyDynamicTree={handleApplyDynamicTree}
        currentOwnerRepo={githubRepoInfo}
        isDynamicMode={isDynamicMode}
        onToggleDynamicMode={(enabled) => {
          setIsDynamicMode(enabled);
          if (!enabled) loadRepositoryData();
        }}
      />

      {/* 7. GitHub Pages 2-Minute Deployment Guide Modal */}
      <DeploymentGuideModal
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />

      {/* 8. Upload & Add HTML Quiz Modal */}
      <UploadQuizModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        rootFolder={rootFolder}
        currentPath={currentPath}
        onGitHubCommitted={handleQuizCommitted}
        onOpenAdminConfig={() => {
          setShowUploadModal(false);
          setShowAdminModal(true);
        }}
      />

      {/* 9. Create New Folder Modal */}
      <NewFolderModal
        isOpen={showNewFolderModal}
        onClose={() => setShowNewFolderModal(false)}
        currentPath={currentPath}
        rootFolder={rootFolder}
        onFolderCreated={handleFolderCreated}
        onOpenAdminConfig={() => {
          setShowNewFolderModal(false);
          setShowAdminModal(true);
        }}
      />

      {/* 10. Owner Login Modal */}
      <OwnerLoginModal
        isOpen={showOwnerLoginModal}
        onClose={() => setShowOwnerLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
        actionReason={loginActionReason}
      />

      {/* 11. GitHub Admin Settings Modal */}
      <AdminConfigModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onConfigUpdated={(newCfg) => {
          setGhConfig(newCfg);
          setIsAdminActive(hasAdminToken());
          loadRepositoryData();
        }}
      />

      {/* 12. Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        target={deleteTarget}
        isAdminActive={isAdminActive}
        ghOwner={ghConfig.owner}
        ghRepo={ghConfig.repo}
        onConfirmDelete={handleConfirmDelete}
        onOpenAdminConfig={() => {
          setIsDeleteModalOpen(false);
          setShowAdminModal(true);
        }}
      />
    </div>
  );
}
