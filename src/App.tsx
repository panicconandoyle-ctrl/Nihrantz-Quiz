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
import { DonationModal, DEFAULT_CREATOR_SUPPORT } from './components/DonationModal';
import { SupportCreatorWidget } from './components/SupportCreatorWidget';
import { GitHubSyncModal } from './components/GitHubSyncModal';
import { DeploymentGuideModal } from './components/DeploymentGuideModal';
import { UploadQuizModal } from './components/UploadQuizModal';
import { NewFolderModal } from './components/NewFolderModal';
import { OwnerLoginModal } from './components/OwnerLoginModal';
import { AdminConfigModal } from './components/AdminConfigModal';
import { DeleteConfirmModal, DeleteItemTarget } from './components/DeleteConfirmModal';
import { MoveItemModal, MoveTarget } from './components/MoveItemModal';
import { RenameItemModal, RenameTarget } from './components/RenameItemModal';
import { 
  GitHubConfig, 
  getStoredGithubConfig, 
  hasAdminToken, 
  fetchGitHubQuizTree,
  deleteFileFromGitHub,
  deleteFolderFromGitHub,
  batchDeleteFromGitHub,
  syncLocalQuizToGitHub,
  moveQuizOnGitHub,
  moveFolderOnGitHub,
  renameQuizOnGitHub,
  renameFolderOnGitHub
} from './services/githubService';
import { 
  QuizManifest, 
  FolderNode, 
  QuizItem, 
  ViewMode, 
  SortField, 
  SortDirection,
  CreatorSupportConfig
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
  playSuccessChime,
  playDropSound
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
  const [isDonationEditMode, setIsDonationEditMode] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [showGitHubSync, setShowGitHubSync] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Creator Support Configuration (stored locally or updated by Owner)
  const [supportConfig, setSupportConfig] = useState<CreatorSupportConfig>(() => {
    try {
      const saved = localStorage.getItem('nihrantz_creator_support_config');
      if (saved) {
        return { ...DEFAULT_CREATOR_SUPPORT, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load saved creator support config:', e);
    }
    return DEFAULT_CREATOR_SUPPORT;
  });

  const handleUpdateSupportConfig = (newConfig: CreatorSupportConfig) => {
    setSupportConfig(newConfig);
    try {
      localStorage.setItem('nihrantz_creator_support_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to persist creator support config:', e);
    }
  };

  // Move Management
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<boolean>(false);
  const [droppedDesktopFile, setDroppedDesktopFile] = useState<{ name: string; content: string } | null>(null);

  // GitHub Admin Mode & Configuration
  const [isAdminActive, setIsAdminActive] = useState<boolean>(() => hasAdminToken());
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => getStoredGithubConfig());

  // Deletion Management
  const [deleteTarget, setDeleteTarget] = useState<DeleteItemTarget | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<DeleteItemTarget[]>([]);
  const [selectedDeleteTargets, setSelectedDeleteTargets] = useState<Map<string, DeleteItemTarget>>(new Map());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // Renaming Management
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<boolean>(false);

  // Dynamic GitHub Sync State
  const [isDynamicMode, setIsDynamicMode] = useState<boolean>(true);
  const [githubRepoInfo, setGithubRepoInfo] = useState<{ owner: string; repo: string }>(() => {
    const cfg = getStoredGithubConfig();
    return { owner: cfg.owner, repo: cfg.repo };
  });

  // Dynamic Repository Fetching: Reads from GitHub REST API
  const [isLoadingRepo, setIsLoadingRepo] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Identify all quizzes that are pending sync to GitHub
  const allCurrentQuizzes = useMemo(() => {
    return getAllQuizzes(rootFolder);
  }, [rootFolder]);

  const pendingSyncQuizzes = useMemo(() => {
    return allCurrentQuizzes.filter(q => q.syncStatus === 'pending_sync');
  }, [allCurrentQuizzes]);

  const loadRepositoryData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoadingRepo(true);
    const currentCfg = getStoredGithubConfig();
    setGhConfig(currentCfg);
    setGithubRepoInfo({ owner: currentCfg.owner, repo: currentCfg.repo });
    setIsAdminActive(hasAdminToken());

    // 1. Fetch live repository tree directly from GitHub REST API
    let gitHubRoot: FolderNode | null = null;
    if (currentCfg.owner && currentCfg.repo) {
      try {
        const ghResult = await fetchGitHubQuizTree(currentCfg);
        if (ghResult.success && ghResult.rootFolder) {
          gitHubRoot = ghResult.rootFolder;
        }
      } catch (e) {
        console.warn('GitHub live fetch error:', e);
      }
    }

    // 2. Fetch local manifest to discover any local quizzes not yet pushed to GitHub
    let localManifest = defaultManifest;
    try {
      const res = await fetch('/quizzes.json');
      if (res.ok) {
        const data = await res.json();
        if (data && data.folders) {
          localManifest = data;
        }
      }
    } catch (e) {}

    const localQuizzes = getAllQuizzes(localManifest.folders[0] || defaultManifest.folders[0]);

    // 3. Merge: If we have GitHub tree, merge any local quizzes not present in remote
    if (gitHubRoot) {
      const remoteQuizzes = getAllQuizzes(gitHubRoot);
      const remotePaths = new Set(remoteQuizzes.map(q => q.path.toLowerCase()));

      for (const lq of localQuizzes) {
        if (!remotePaths.has(lq.path.toLowerCase())) {
          // Local quiz needs sync to GitHub! Find or create target folder in gitHubRoot
          const folderParts = lq.path.split('/');
          folderParts.pop(); // remove filename
          const targetPath = folderParts.join('/') || 'quizzes';

          let targetFolder = findFolderByPath(gitHubRoot, targetPath);
          if (!targetFolder) {
            targetFolder = gitHubRoot;
          }

          targetFolder.quizzes = targetFolder.quizzes || [];
          targetFolder.quizzes.push({
            ...lq,
            syncStatus: 'pending_sync',
            isUploaded: true,
          });
        }
      }

      const mergedManifest: QuizManifest = {
        name: `${currentCfg.owner}/${currentCfg.repo} Quizzes`,
        version: 'GitHub Live Synchronized',
        lastUpdated: new Date().toISOString().split('T')[0],
        folders: [gitHubRoot],
      };

      setManifest(mergedManifest);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (!isSilent) setIsLoadingRepo(false);
      return;
    }

    // Fallback: If GitHub network unavailable, use local manifest
    setManifest(localManifest);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    if (!isSilent) setIsLoadingRepo(false);
  }, []);

  // Periodic Auto-Sync from GitHub (checks for updates every 45s)
  useEffect(() => {
    const timer = setInterval(() => {
      loadRepositoryData(true);
    }, 45000);
    return () => clearInterval(timer);
  }, [loadRepositoryData]);

  // Initial load
  useEffect(() => {
    try {
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

  // Push a single local quiz to GitHub
  const handleSyncQuizToGitHub = async (quiz: QuizItem) => {
    if (!isAdminActive) {
      setLoginActionReason('GitHub Personal Access Token (PAT with repo scope) is required to push files to the repository.');
      setShowAdminModal(true);
      return;
    }

    setIsLoadingRepo(true);
    setSyncToast({ type: 'info', text: `Pushing ${quiz.filename} to GitHub repository...` });
    playNavSound();

    const res = await syncLocalQuizToGitHub(quiz, ghConfig);
    setIsLoadingRepo(false);

    if (res.success) {
      playSuccessChime();
      setSyncToast({
        type: 'success',
        text: `Successfully synchronized ${quiz.filename} to ${ghConfig.owner}/${ghConfig.repo}!`,
      });
      await loadRepositoryData();
    } else {
      setSyncToast({
        type: 'error',
        text: `Sync to GitHub failed: ${res.error || 'Unknown error'}`,
      });
    }

    setTimeout(() => setSyncToast(null), 4000);
  };

  // Push all pending local quizzes to GitHub
  const handleSyncAllToGitHub = async () => {
    if (!isAdminActive) {
      setLoginActionReason('GitHub Personal Access Token is required to push pending items to GitHub.');
      setShowAdminModal(true);
      return;
    }

    if (pendingSyncQuizzes.length === 0) {
      setSyncToast({ type: 'info', text: 'All quizzes are already synchronized with GitHub.' });
      setTimeout(() => setSyncToast(null), 3000);
      return;
    }

    setIsLoadingRepo(true);
    setSyncToast({ type: 'info', text: `Pushing ${pendingSyncQuizzes.length} quiz(zes) to GitHub repository...` });
    playNavSound();

    let successCount = 0;
    for (const q of pendingSyncQuizzes) {
      const res = await syncLocalQuizToGitHub(q, ghConfig);
      if (res.success) successCount++;
    }

    setIsLoadingRepo(false);
    playSuccessChime();
    setSyncToast({
      type: 'success',
      text: `Successfully synchronized ${successCount} of ${pendingSyncQuizzes.length} quiz(zes) to GitHub!`,
    });
    await loadRepositoryData();
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Manual Trigger Sync from GitHub
  const handleTriggerSync = async () => {
    playNavSound();
    setSyncToast({ type: 'info', text: `Synchronizing from GitHub repository ${ghConfig.owner}/${ghConfig.repo}...` });
    await loadRepositoryData();
    playSuccessChime();
    setSyncToast({
      type: 'success',
      text: `Live sync completed with GitHub: ${allCurrentQuizzes.length} quizzes loaded!`,
    });
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Execute Move Operation (Files or Folders)
  const handleConfirmMove = async (
    target: MoveTarget,
    destinationFolderPath: string
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoadingRepo(true);
    const itemName = target.type === 'quiz' ? target.quiz?.title : target.folder?.name;
    setSyncToast({ type: 'info', text: `Moving ${itemName} to ${destinationFolderPath}...` });

    if (target.type === 'quiz' && target.quiz) {
      if (isAdminActive) {
        const ghRes = await moveQuizOnGitHub(target.quiz, destinationFolderPath, ghConfig);
        if (!ghRes.success) {
          setIsLoadingRepo(false);
          return { success: false, error: ghRes.error };
        }
      }
    } else if (target.type === 'folder' && target.folder) {
      if (isAdminActive) {
        const ghRes = await moveFolderOnGitHub(target.folder.path, destinationFolderPath, ghConfig);
        if (!ghRes.success) {
          setIsLoadingRepo(false);
          return { success: false, error: ghRes.error };
        }
      }
    }

    await loadRepositoryData();
    playDropSound();
    setSyncToast({
      type: 'success',
      text: `Successfully moved ${itemName} to ${destinationFolderPath}!`,
    });
    setTimeout(() => setSyncToast(null), 3500);

    return { success: true };
  };

  // Handle Drag and Drop of items onto a folder
  const handleDropOnFolder = async (
    source: { type: 'quiz' | 'folder'; quiz?: QuizItem; folder?: FolderNode },
    targetFolderPath: string
  ) => {
    if (source.type === 'quiz' && source.quiz) {
      // Check if dropped onto same parent folder
      const currentParent = source.quiz.path.split('/').slice(0, -1).join('/') || 'quizzes';
      if (currentParent === targetFolderPath) return;
      await handleConfirmMove({ type: 'quiz', quiz: source.quiz }, targetFolderPath);
    } else if (source.type === 'folder' && source.folder) {
      if (source.folder.path === targetFolderPath || targetFolderPath.startsWith(source.folder.path + '/')) return;
      await handleConfirmMove({ type: 'folder', folder: source.folder }, targetFolderPath);
    }
  };

  // Handle External Desktop File Drag and Drop into viewport
  const handleDropExternalFile = (file: File) => {
    if (!file.name.endsWith('.html')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setDroppedDesktopFile({ name: file.name, content });
        setShowUploadModal(true);
      }
    };
    reader.readAsText(file);
  };

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
    const updatedHistory = navHistory.slice(0, historyIndex + 1);
    updatedHistory.push(cleanPath);
    setNavHistory(updatedHistory);
    setHistoryIndex(updatedHistory.length - 1);
    setSearchQuery('');
    setSelectedDeleteTargets(new Map());
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
      setDroppedDesktopFile(null);
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

  // Handle quiz committed to GitHub
  const handleQuizCommitted = async () => {
    await loadRepositoryData();
  };

  // Handle folder created on GitHub
  const handleFolderCreated = async (newFolderPath: string) => {
    await loadRepositoryData();
    handleNavigatePath(newFolderPath);
  };

  // Item Deletion Handlers
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
    setDeleteTargets([]);
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
    setDeleteTargets([]);
    setIsDeleteModalOpen(true);
  };

  const handleToggleSelectTarget = (target: DeleteItemTarget) => {
    setSelectedDeleteTargets((prev) => {
      const next = new Map(prev);
      if (next.has(target.path)) {
        next.delete(target.path);
      } else {
        next.set(target.path, target);
      }
      return next;
    });
  };

  const handleSelectAllTargets = (targets: DeleteItemTarget[]) => {
    setSelectedDeleteTargets(() => {
      const next = new Map<string, DeleteItemTarget>();
      targets.forEach((t) => next.set(t.path, t));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedDeleteTargets(new Map());
  };

  const handleRequestDeleteSelected = () => {
    if (!isOwnerLoggedIn && !isAdminActive) {
      setLoginActionReason('Owner login or GitHub Admin credentials required to delete items.');
      setShowOwnerLoginModal(true);
      return;
    }
    const targets = Array.from(selectedDeleteTargets.values());
    if (targets.length === 0) return;
    setDeleteTargets(targets);
    setDeleteTarget(null);
    setIsDeleteModalOpen(true);
  };

  const handleOpenMultiDelete = () => {
    if (!isOwnerLoggedIn && !isAdminActive) {
      setLoginActionReason('Owner login or GitHub Admin credentials required to delete items.');
      setShowOwnerLoginModal(true);
      return;
    }
    setDeleteTargets(availableDeleteItemsInCurrentFolder);
    setDeleteTarget(null);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmBatchDelete = async (
    targets: DeleteItemTarget[],
    onProgress?: (
      index: number,
      total: number,
      item: DeleteItemTarget,
      status: 'deleting' | 'success' | 'error',
      errorMsg?: string
    ) => void
  ): Promise<{
    success: boolean;
    deletedCount: number;
    errors: { item: DeleteItemTarget; error: string }[];
  }> => {
    const res = await batchDeleteFromGitHub(targets, ghConfig, onProgress);

    // Refresh live from GitHub
    await loadRepositoryData();

    // Clear selection after deletion
    setSelectedDeleteTargets(new Map());

    // If currentPath is deleted folder or inside it, navigate up
    const deletedFolders = targets.filter(t => t.type === 'folder');
    for (const f of deletedFolders) {
      if (currentPath === f.path || currentPath.startsWith(f.path + '/')) {
        const parts = f.path.split('/');
        parts.pop();
        const parentPath = parts.join('/') || 'quizzes';
        handleNavigatePath(parentPath);
        break;
      }
    }

    return res;
  };

  // Renaming Handlers
  const handleRequestRenameItem = (target: RenameTarget) => {
    if (!isOwnerLoggedIn && !isAdminActive) {
      setLoginActionReason('Owner login or GitHub Admin credentials required to rename items.');
      setShowOwnerLoginModal(true);
      return;
    }
    setRenameTarget(target);
    setShowRenameModal(true);
  };

  const handleConfirmRename = async (
    target: RenameTarget,
    newName: string,
    newTitle?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (target.type === 'quiz' && target.quiz) {
      const res = await renameQuizOnGitHub(target.quiz, newName, newTitle, ghConfig);
      if (res.success) {
        await loadRepositoryData();
        return { success: true };
      }
      return { success: false, error: res.error };
    } else if (target.type === 'folder' && target.folder) {
      const res = await renameFolderOnGitHub(target.folder.path, newName, ghConfig);
      if (res.success) {
        await loadRepositoryData();
        if (res.newFolderPath && (currentPath === target.folder.path || currentPath.startsWith(target.folder.path + '/'))) {
          const suffix = currentPath.slice(target.folder.path.length);
          handleNavigatePath(`${res.newFolderPath}${suffix}`);
        }
        return { success: true };
      }
      return { success: false, error: res.error };
    }
    return { success: false, error: 'Invalid rename target' };
  };

  // Auto-Discovery GitHub API fetch
  const handleApplyDynamicTree = async (owner: string, repo: string): Promise<boolean> => {
    try {
      setGithubRepoInfo({ owner, repo });
      const currentCfg = { ...ghConfig, owner, repo };
      setGhConfig(currentCfg);
      const ghResult = await fetchGitHubQuizTree(currentCfg);
      if (ghResult.success && ghResult.rootFolder) {
        setManifest({
          name: `${owner}/${repo} Quizzes`,
          version: "GitHub Live Synchronized",
          lastUpdated: new Date().toISOString().split('T')[0],
          folders: [ghResult.rootFolder]
        });
        setIsDynamicMode(true);
        return true;
      }
      return false;
    } catch (e) {
      console.warn("GitHub API error, using default manifest:", e);
      return false;
    }
  };

  // Find Current Folder in Manifest
  const currentFolder = useMemo(() => {
    return findFolderByPath(rootFolder, currentPath) || rootFolder;
  }, [rootFolder, currentPath]);

  // Compute all available items in current folder as DeleteItemTarget objects
  const availableDeleteItemsInCurrentFolder = useMemo<DeleteItemTarget[]>(() => {
    const list: DeleteItemTarget[] = [];
    (currentFolder.folders || []).forEach((f) => {
      list.push({
        type: 'folder',
        id: f.id,
        name: f.name,
        path: f.path,
        quizCount: countFolderQuizzes(f),
      });
    });
    (currentFolder.quizzes || []).forEach((q) => {
      list.push({
        type: 'quiz',
        id: q.id,
        name: q.title,
        path: q.path,
        sha: q.sha,
        category: q.category,
      });
    });
    return list;
  }, [currentFolder]);

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
      {/* Toast Notification */}
      {syncToast && (
        <div className={`fixed top-12 right-4 z-50 px-4 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 border transition-all animate-bounce ${
          syncToast.type === 'success' 
            ? 'bg-emerald-600 text-white border-emerald-500' 
            : syncToast.type === 'error'
            ? 'bg-rose-600 text-white border-rose-500'
            : 'bg-blue-600 text-white border-blue-500'
        }`}>
          <span>{syncToast.text}</span>
        </div>
      )}

      {/* 1. Windows 11 Title Bar with GitHub Live Synchronized status */}
      <TitleBar
        currentPath={currentPath}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        isSound={isSound}
        onToggleSound={handleToggleSound}
        onOpenDonation={() => {
          setIsDonationEditMode(false);
          setShowDonation(true);
        }}
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
        ghConfig={ghConfig}
        isSyncing={isLoadingRepo}
        lastSyncTime={lastSyncTime}
        pendingSyncCount={pendingSyncQuizzes.length}
        onTriggerSync={handleTriggerSync}
      />

      {/* 2. Ribbon & Command / Breadcrumb Bar with GitHub Sync tools */}
      <CommandBar
        currentPath={currentPath}
        canGoBack={historyIndex > 0}
        canGoForward={historyIndex < navHistory.length - 1}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onGoUp={handleGoUp}
        onRefresh={handleTriggerSync}
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
        ghConfig={ghConfig}
        isSyncing={isLoadingRepo}
        pendingSyncCount={pendingSyncQuizzes.length}
        onSyncAllToGitHub={handleSyncAllToGitHub}
        selectedCount={selectedDeleteTargets.size}
        onDeleteSelected={handleRequestDeleteSelected}
        onOpenMultiDelete={handleOpenMultiDelete}
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
          onDropOnFolder={handleDropOnFolder}
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
          onSyncQuizToGitHub={handleSyncQuizToGitHub}
          ghConfig={ghConfig}
          onDropOnFolder={handleDropOnFolder}
          onRequestMoveItem={(target) => {
            setMoveTarget(target);
            setShowMoveModal(true);
          }}
          onRequestRenameItem={handleRequestRenameItem}
          onDropExternalFile={handleDropExternalFile}
          selectedTargets={selectedDeleteTargets}
          onToggleSelectTarget={handleToggleSelectTarget}
          onSelectAllTargets={handleSelectAllTargets}
          onClearSelection={handleClearSelection}
          onRequestDeleteSelected={handleRequestDeleteSelected}
        />
      </div>

      {/* 4. Interactive HTML Quiz Player Modal with distinct correct/incorrect sound effects */}
      {activeQuiz && (
        <QuizPlayerModal
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onRecordScore={handleRecordScore}
          onSyncQuizToGitHub={handleSyncQuizToGitHub}
        />
      )}

      {/* 5. Creator Bank QR Donation Modal */}
      <DonationModal
        isOpen={showDonation}
        onClose={() => {
          setShowDonation(false);
          setIsDonationEditMode(false);
        }}
        isOwnerLoggedIn={isOwnerLoggedIn}
        isAdminActive={isAdminActive}
        supportConfig={supportConfig}
        onUpdateSupportConfig={handleUpdateSupportConfig}
        initialEditMode={isDonationEditMode}
        onOpenOwnerLogin={() => {
          setLoginActionReason('Owner login required to upload QR and update support details.');
          setShowOwnerLoginModal(true);
        }}
      />

      {/* 6. GitHub Two-Way Sync Modal */}
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
        pendingQuizzes={pendingSyncQuizzes}
        onSyncAllToGitHub={handleSyncAllToGitHub}
        onOpenAdminConfig={() => {
          setShowGitHubSync(false);
          setShowAdminModal(true);
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
        onClose={() => {
          setShowUploadModal(false);
          setDroppedDesktopFile(null);
        }}
        rootFolder={rootFolder}
        currentPath={currentPath}
        onGitHubCommitted={handleQuizCommitted}
        onOpenAdminConfig={() => {
          setShowUploadModal(false);
          setShowAdminModal(true);
        }}
        initialFile={droppedDesktopFile}
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

      {/* 12. Delete Confirmation Modal (Multi-Select Supported) */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
          setDeleteTargets([]);
        }}
        target={deleteTarget}
        targets={deleteTargets}
        availableItems={availableDeleteItemsInCurrentFolder}
        isAdminActive={isAdminActive}
        ghOwner={ghConfig.owner}
        ghRepo={ghConfig.repo}
        onConfirmDelete={handleConfirmBatchDelete}
        onOpenAdminConfig={() => {
          setIsDeleteModalOpen(false);
          setShowAdminModal(true);
        }}
      />

      {/* 13. Move File or Folder Modal */}
      <MoveItemModal
        isOpen={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setMoveTarget(null);
        }}
        target={moveTarget}
        rootFolder={rootFolder}
        onConfirmMove={handleConfirmMove}
      />

      {/* 14. Rename File or Folder Modal */}
      <RenameItemModal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setRenameTarget(null);
        }}
        target={renameTarget}
        isAdminActive={isAdminActive}
        ghOwner={ghConfig.owner}
        ghRepo={ghConfig.repo}
        onConfirmRename={handleConfirmRename}
        onOpenAdminConfig={() => {
          setShowRenameModal(false);
          setShowAdminModal(true);
        }}
      />

      {/* 15. Floating Support Creator Widget (Bottom-Right, shows uploaded QR) */}
      <SupportCreatorWidget
        supportConfig={supportConfig}
        onOpenDonationModal={(editMode) => {
          setIsDonationEditMode(Boolean(editMode));
          setShowDonation(true);
        }}
        isOwnerLoggedIn={isOwnerLoggedIn}
        isAdminActive={isAdminActive}
        onOpenOwnerLogin={() => {
          setLoginActionReason('Owner login required to upload QR and update support details.');
          setShowOwnerLoginModal(true);
        }}
      />
    </div>
  );
}
