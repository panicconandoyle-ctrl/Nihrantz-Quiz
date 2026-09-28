import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  Play, 
  Star, 
  ExternalLink, 
  Share2, 
  Clock, 
  FileCode, 
  CheckCircle2,
  FolderOpen,
  Trash2,
  Github,
  ArrowUpCircle,
  RefreshCw,
  FolderInput,
  Upload,
  GripVertical,
  Check,
  CheckSquare,
  Square,
  Edit3
} from 'lucide-react';
import { FolderNode, QuizItem, ViewMode, DeleteItemTarget, QuizScoreRecord } from '../types';
import { countFolderQuizzes } from '../data/defaultManifest';
import { playOpenSound, playNavSound, playDragSound, playDropSound } from '../utils/audio';
import { SelectedExplorerItem } from '../hooks/useExplorerKeyboardShortcuts';

interface ExplorerContentProps {
  currentFolder: FolderNode;
  quizzesToDisplay: QuizItem[];
  subfoldersToDisplay: FolderNode[];
  viewMode: ViewMode;
  searchQuery: string;
  onNavigatePath: (path: string) => void;
  onOpenQuiz: (quiz: QuizItem) => void;
  favorites: string[];
  onToggleFavorite: (quizId: string) => void;
  completedQuizzes: Record<string, QuizScoreRecord>;
  canManageItems: boolean;
  onRequestDeleteQuiz: (quiz: QuizItem) => void;
  onRequestDeleteFolder: (folder: FolderNode) => void;
  onSyncQuizToGitHub?: (quiz: QuizItem) => void;
  ghConfig?: { owner: string; repo: string; branch: string };
  onDropOnFolder?: (source: { type: 'quiz' | 'folder'; quiz?: QuizItem; folder?: FolderNode }, targetFolderPath: string) => void;
  onRequestMoveItem?: (target: { type: 'quiz' | 'folder'; quiz?: QuizItem; folder?: FolderNode }) => void;
  onRequestRenameItem?: (target: { type: 'quiz' | 'folder'; quiz?: QuizItem; folder?: FolderNode }) => void;
  onDropExternalFile?: (file: File) => void;
  selectedTargets?: Map<string, DeleteItemTarget>;
  onToggleSelectTarget?: (target: DeleteItemTarget) => void;
  onSelectAllTargets?: (targets: DeleteItemTarget[]) => void;
  onClearSelection?: () => void;
  onRequestDeleteSelected?: () => void;
  selectedItem?: SelectedExplorerItem | null;
  onSelectItem?: (item: SelectedExplorerItem | null) => void;
}

export const ExplorerContent: React.FC<ExplorerContentProps> = ({
  currentFolder,
  quizzesToDisplay,
  subfoldersToDisplay,
  viewMode,
  searchQuery,
  onNavigatePath,
  onOpenQuiz,
  favorites,
  onToggleFavorite,
  completedQuizzes,
  canManageItems,
  onRequestDeleteQuiz,
  onRequestDeleteFolder,
  onSyncQuizToGitHub,
  ghConfig = { owner: 'panicconandoyle-ctrl', repo: 'Nihrantz-Quiz', branch: 'main' },
  onDropOnFolder,
  onRequestMoveItem,
  onRequestRenameItem,
  onDropExternalFile,
  selectedTargets,
  onToggleSelectTarget,
  onSelectAllTargets,
  onClearSelection,
  onRequestDeleteSelected,
  selectedItem = null,
  onSelectItem,
}) => {
  const totalItems = subfoldersToDisplay.length + quizzesToDisplay.length;

  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [hoveredFolderPath, setHoveredFolderPath] = useState<string | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState<boolean>(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  // Compute all visible items as DeleteItemTarget objects
  const allVisibleTargets = useMemo<DeleteItemTarget[]>(() => {
    const list: DeleteItemTarget[] = [];
    subfoldersToDisplay.forEach((f) => {
      list.push({
        type: 'folder',
        id: f.id,
        name: f.name,
        path: f.path,
        quizCount: countFolderQuizzes(f),
      });
    });
    quizzesToDisplay.forEach((q) => {
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
  }, [subfoldersToDisplay, quizzesToDisplay]);

  const selectedCount = selectedTargets ? selectedTargets.size : 0;
  const isAllSelected = allVisibleTargets.length > 0 && selectedCount === allVisibleTargets.length;

  const handleShareQuiz = (quiz: QuizItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set('quiz', quiz.path);
    navigator.clipboard.writeText(url.toString());
    setCopiedPath(quiz.path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'science': return 'text-emerald-500';
      case 'immunology': return 'text-rose-500';
      case 'history': return 'text-amber-500';
      case 'computer science': return 'text-indigo-500';
      case 'geography': return 'text-sky-500';
      default: return 'text-blue-500';
    }
  };

  const getGitHubFileUrl = (quiz: QuizItem) => {
    if (quiz.gitHubUrl) return quiz.gitHubUrl;
    return `https://github.com/${ghConfig.owner}/${ghConfig.repo}/blob/${ghConfig.branch || 'main'}/${quiz.path}`;
  };

  const getGitHubFolderUrl = (folder: FolderNode) => {
    return `https://github.com/${ghConfig.owner}/${ghConfig.repo}/tree/${ghConfig.branch || 'main'}/${folder.path}`;
  };

  // Internal Drag & Drop handlers
  const handleDragStartQuiz = (e: React.DragEvent, quiz: QuizItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'quiz', quiz }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItemId(quiz.id);
    playDragSound();
  };

  const handleDragStartFolder = (e: React.DragEvent, folder: FolderNode) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'folder', folder }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItemId(folder.path);
    playDragSound();
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setHoveredFolderPath(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoveredFolderPath !== folderPath) {
      setHoveredFolderPath(folderPath);
    }
  };

  const handleFolderDragLeave = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoveredFolderPath === folderPath) {
      setHoveredFolderPath(null);
    }
  };

  const handleFolderDrop = (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredFolderPath(null);
    setDraggingItemId(null);

    // Check if external file dropped onto a folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.html') && onDropExternalFile) {
        playDropSound();
        onDropExternalFile(file);
      }
      return;
    }

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const data = JSON.parse(dataStr);
      playDropSound();
      if (onDropOnFolder) {
        onDropOnFolder(data, targetFolderPath);
      }
    } catch (err) {}
  };

  // External Desktop File Drag Over Whole Viewport
  const handleViewportDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDraggingExternal(true);
    }
  };

  const handleViewportDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving viewport completely
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingExternal(false);
  };

  const handleViewportDrop = (e: React.DragEvent) => {
    setIsDraggingExternal(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.html') && onDropExternalFile) {
        playDropSound();
        onDropExternalFile(file);
      }
    }
  };

  return (
    <div 
      onDragOver={handleViewportDragOver}
      onDragLeave={handleViewportDragLeave}
      onDrop={handleViewportDrop}
      className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191919] overflow-hidden select-none relative"
    >
      {/* Desktop External File Drop Overlay */}
      {isDraggingExternal && (
        <div className="absolute inset-0 z-40 bg-blue-600/20 backdrop-blur-xs border-4 border-dashed border-blue-500 rounded-xl m-2 flex flex-col items-center justify-center text-blue-800 dark:text-blue-200 pointer-events-none animate-pulse">
          <Upload className="w-14 h-14 text-blue-600 dark:text-blue-400 mb-3" />
          <h3 className="text-base font-bold">Drop HTML Quiz Here</h3>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
            Upload directly into <span className="font-mono font-semibold">{currentFolder.path}/</span>
          </p>
        </div>
      )}

      {/* Scrollable Viewport */}
      <div 
        className="flex-1 overflow-y-auto p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onSelectItem?.(null);
            onClearSelection?.();
          }
        }}
      >
        {totalItems === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <FolderOpen className="w-12 h-12 stroke-1 mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">This folder is empty</p>
            {searchQuery ? (
              <p className="text-xs text-neutral-500 mt-1">No items match "{searchQuery}". Try searching globally or clear your filter.</p>
            ) : (
              <p className="text-xs text-neutral-500 mt-1">
                Drag and drop HTML quiz files here, or create a folder.
              </p>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Mode */
          <div className="space-y-6">
            {/* Subfolders Section */}
            {subfoldersToDisplay.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                  <span>Folders ({subfoldersToDisplay.length})</span>
                  <span className="text-[10px] font-normal lowercase text-neutral-400">drag files into folders to move</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {subfoldersToDisplay.map((folder) => {
                    const count = countFolderQuizzes(folder);
                    const isHovered = hoveredFolderPath === folder.path;
                    const isDragging = draggingItemId === folder.path;
                    const isMultiSelectedFolder = selectedTargets ? selectedTargets.has(folder.path) : false;
                    const isFolderSelected = selectedItem?.path === folder.path || isMultiSelectedFolder;

                    return (
                      <div
                        key={folder.path}
                        draggable={true}
                        onDragStart={(e) => handleDragStartFolder(e, folder)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleFolderDragOver(e, folder.path)}
                        onDragLeave={(e) => handleFolderDragLeave(e, folder.path)}
                        onDrop={(e) => handleFolderDrop(e, folder.path)}
                        onClick={() => {
                          if (selectedItem?.path === folder.path) {
                            playNavSound();
                            onNavigatePath(folder.path);
                          } else {
                            playNavSound();
                            onSelectItem?.({
                              type: 'folder',
                              id: folder.id,
                              name: folder.name,
                              path: folder.path,
                              folder,
                            });
                          }
                        }}
                        onDoubleClick={() => {
                          playNavSound();
                          onNavigatePath(folder.path);
                        }}
                        className={`group relative flex flex-col items-center p-3 rounded-xl border cursor-pointer transition-all text-center ${
                          isDragging
                            ? 'opacity-40 border-dashed border-blue-400'
                            : isMultiSelectedFolder
                            ? 'border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 shadow-xs'
                            : isFolderSelected
                            ? 'border-2 border-blue-500 bg-blue-50/80 dark:bg-blue-950/40 shadow-xs ring-2 ring-blue-500/20'
                            : isHovered
                            ? 'border-2 border-blue-500 bg-blue-100/70 dark:bg-blue-900/50 scale-105 shadow-md'
                            : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/60 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                        }`}
                        title={`Folder: ${folder.name} (Click to select, double-click or Enter to open)`}
                      >
                        {/* Checkbox for Multi-Select */}
                        {canManageItems && (
                          <div
                            className={`absolute top-2 left-2 z-20 transition-opacity ${
                              isFolderSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playNavSound();
                              onToggleSelectTarget?.({
                                type: 'folder',
                                id: folder.id,
                                name: folder.name,
                                path: folder.path,
                                quizCount: count,
                              });
                            }}
                            title={isFolderSelected ? 'Deselect folder' : 'Select folder for action'}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                              isFolderSelected 
                                ? 'bg-rose-600 border-rose-600 text-white' 
                                : 'bg-white dark:bg-[#2a2a2a] border-neutral-300 dark:border-neutral-600 hover:border-rose-400'
                            }`}>
                              {isFolderSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        )}

                        {/* Action buttons (Move & Delete) */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all z-10">
                          {/* Move Folder button */}
                          {onRequestMoveItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestMoveItem({ type: 'folder', folder });
                              }}
                              className="p-1 rounded-md text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              title={`Move folder ${folder.name}`}
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Rename Folder button */}
                          {canManageItems && onRequestRenameItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playNavSound();
                                onRequestRenameItem({ type: 'folder', folder });
                              }}
                              className="p-1 rounded-md text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                              title={`Rename folder ${folder.name}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Open folder on GitHub */}
                          <a
                            href={getGitHubFolderUrl(folder)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60"
                            title={`View ${folder.name} on GitHub`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {canManageItems && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteFolder(folder);
                              }}
                              className="p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title={`Delete folder ${folder.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <Folder className="w-12 h-12 text-amber-500 fill-amber-500 group-hover:scale-105 transition-transform drop-shadow-2xs mb-1.5" />
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate w-full">
                          {folder.name}
                        </span>
                        <span className="text-[11px] text-neutral-400 tabular-nums">
                          {isHovered ? 'Drop to move here' : `${count} ${count === 1 ? 'quiz' : 'quizzes'}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quizzes Section */}
            {quizzesToDisplay.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider flex items-center justify-between">
                  <span>Interactive Quizzes ({quizzesToDisplay.length})</span>
                  <span className="text-[10px] font-normal text-neutral-400">drag & drop to move to folder</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {quizzesToDisplay.map((quiz) => {
                    const isFav = favorites.includes(quiz.id);
                    const record = completedQuizzes[quiz.id];
                    const isPendingSync = quiz.syncStatus === 'pending_sync';
                    const isDragging = draggingItemId === quiz.id;
                    const isMultiSelectedQuiz = selectedTargets ? selectedTargets.has(quiz.path) : false;
                    const isQuizSelected = selectedItem?.path === quiz.path || isMultiSelectedQuiz;

                    return (
                      <div
                        key={quiz.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStartQuiz(e, quiz)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (selectedItem?.path === quiz.path) {
                            playOpenSound();
                            onOpenQuiz(quiz);
                          } else {
                            playNavSound();
                            onSelectItem?.({
                              type: 'quiz',
                              id: quiz.id,
                              name: quiz.title,
                              path: quiz.path,
                              quiz,
                            });
                          }
                        }}
                        onDoubleClick={() => {
                          playOpenSound();
                          onOpenQuiz(quiz);
                        }}
                        className={`group relative flex flex-col justify-between p-4 rounded-xl border bg-white dark:bg-[#202020] hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? 'opacity-40 border-dashed border-blue-400'
                            : isMultiSelectedQuiz
                            ? 'border-2 border-rose-500 bg-rose-50/30 dark:bg-rose-950/30 shadow-xs'
                            : isQuizSelected
                            ? 'border-2 border-blue-500 bg-blue-50/60 dark:bg-blue-950/30 shadow-xs ring-2 ring-blue-500/20'
                            : isPendingSync
                            ? 'border-amber-300 dark:border-amber-700/70 hover:border-amber-400'
                            : 'border-neutral-200/80 dark:border-neutral-800/80 hover:border-blue-400/80 dark:hover:border-blue-500/80'
                        }`}
                        title="Click to select, double-click or Enter to play, drag to move"
                      >
                        <div>
                          {/* Header: Icon + Category + Sync Status Badge + Favorite */}
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Multi-Select Checkbox */}
                              {canManageItems && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playNavSound();
                                    onToggleSelectTarget?.({
                                      type: 'quiz',
                                      id: quiz.id,
                                      name: quiz.title,
                                      path: quiz.path,
                                      sha: quiz.sha,
                                      category: quiz.category,
                                    });
                                  }}
                                  className={`p-0.5 rounded border transition-colors cursor-pointer mr-0.5 ${
                                    isQuizSelected 
                                      ? 'bg-rose-600 border-rose-600 text-white' 
                                      : 'bg-white dark:bg-[#2a2a2a] border-neutral-300 dark:border-neutral-600 hover:border-rose-400 opacity-60 group-hover:opacity-100'
                                  }`}
                                  title={isQuizSelected ? 'Deselect quiz' : 'Select quiz for action'}
                                >
                                  {isQuizSelected ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : (
                                    <div className="w-3 h-3" />
                                  )}
                                </button>
                              )}

                              <span className="text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-400 cursor-grab">
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              <FileCode className={`w-4 h-4 ${getCategoryColor(quiz.category)}`} />
                              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                                {quiz.category}
                              </span>

                              {/* GitHub Sync Status Badge */}
                              {isPendingSync ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60" title="Local quiz pending sync to GitHub repository">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Needs Sync
                                </span>
                              ) : (
                                <a
                                  href={getGitHubFileUrl(quiz)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                  title={`Live on GitHub: ${quiz.sha ? `SHA ${quiz.sha.substring(0, 7)}` : 'main branch'}`}
                                >
                                  <Github className="w-2.5 h-2.5" />
                                  <span>GitHub</span>
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFavorite(quiz.id);
                                }}
                                className="p-1 text-neutral-400 hover:text-amber-500 transition-colors"
                                title={isFav ? "Remove from Starred" : "Add to Starred"}
                              >
                                <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>
                            </div>
                          </div>

                          {/* Quiz Title */}
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5 line-clamp-1">
                            {quiz.title}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
                            {quiz.description || "Standalone interactive HTML quiz ready for execution."}
                          </p>

                          {/* Metadata: unboxed text with · separators */}
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums mb-3">
                            <span>{quiz.questionCount} Questions</span>
                            <span aria-hidden="true">·</span>
                            <span>{quiz.estimatedMinutes} min</span>
                            <span aria-hidden="true">·</span>
                            <span>{quiz.difficulty}</span>
                            {quiz.size && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{quiz.size}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Row: Actions */}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
                          {record ? (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="tabular-nums">Best: {record.percentage}% ({record.score}/{record.total})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-mono truncate max-w-[110px]">
                              {quiz.filename}
                            </span>
                          )}

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            {/* Move item button */}
                            {onRequestMoveItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestMoveItem({ type: 'quiz', quiz });
                                }}
                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title={`Move quiz to another folder`}
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Push to GitHub button for pending quizzes */}
                            {isPendingSync && onSyncQuizToGitHub && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSyncQuizToGitHub(quiz);
                                }}
                                className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded text-amber-600 dark:text-amber-400 transition-colors flex items-center gap-1 text-[11px] font-semibold"
                                title={`Push ${quiz.filename} to GitHub repository`}
                              >
                                <ArrowUpCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Push</span>
                              </button>
                            )}

                            {/* View file on GitHub */}
                            {!isPendingSync && (
                              <a
                                href={getGitHubFileUrl(quiz)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                                title="View source on GitHub"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Rename Quiz button */}
                            {canManageItems && onRequestRenameItem && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playNavSound();
                                  onRequestRenameItem({ type: 'quiz', quiz });
                                }}
                                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title={`Rename quiz ${quiz.title}`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canManageItems && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestDeleteQuiz(quiz);
                                }}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                title={`Delete quiz ${quiz.title} permanently from GitHub`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={(e) => handleShareQuiz(quiz, e)}
                              className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                              title="Copy Direct Link permalink"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            <span className="px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 rounded-md flex items-center gap-1 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Play className="w-3 h-3 fill-current" />
                              <span>Play</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Details / Table List View Mode */
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-neutral-50 dark:bg-[#202020] text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 select-none">
                  {canManageItems && (
                    <th className="py-2 px-2.5 w-8 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          playNavSound();
                          if (isAllSelected) {
                            onClearSelection?.();
                          } else {
                            onSelectAllTargets?.(allVisibleTargets);
                          }
                        }}
                        className="p-0.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        title={isAllSelected ? 'Deselect All' : `Select All (${allVisibleTargets.length})`}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-rose-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="py-2 px-3 font-semibold">Name</th>
                  <th className="py-2 px-3 font-semibold">GitHub Sync</th>
                  <th className="py-2 px-3 font-semibold">Category</th>
                  <th className="py-2 px-3 font-semibold text-right">Questions</th>
                  <th className="py-2 px-3 font-semibold text-right">Est. Time</th>
                  <th className="py-2 px-3 font-semibold">Difficulty</th>
                  <th className="py-2 px-3 font-semibold">Date Modified</th>
                  <th className="py-2 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
                {/* Subfolder rows */}
                {subfoldersToDisplay.map((folder) => {
                  const count = countFolderQuizzes(folder);
                  const isHovered = hoveredFolderPath === folder.path;
                  const isMultiSelectedFolder = selectedTargets ? selectedTargets.has(folder.path) : false;
                  const isFolderSelected = selectedItem?.path === folder.path || isMultiSelectedFolder;

                  return (
                    <tr
                      key={folder.path}
                      draggable={true}
                      onDragStart={(e) => handleDragStartFolder(e, folder)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleFolderDragOver(e, folder.path)}
                      onDragLeave={(e) => handleFolderDragLeave(e, folder.path)}
                      onDrop={(e) => handleFolderDrop(e, folder.path)}
                      onClick={() => {
                        if (selectedItem?.path === folder.path) {
                          playNavSound();
                          onNavigatePath(folder.path);
                        } else {
                          playNavSound();
                          onSelectItem?.({
                            type: 'folder',
                            id: folder.id,
                            name: folder.name,
                            path: folder.path,
                            folder,
                          });
                        }
                      }}
                      onDoubleClick={() => {
                        playNavSound();
                        onNavigatePath(folder.path);
                      }}
                      className={`cursor-pointer transition-colors group ${
                        isMultiSelectedFolder
                          ? 'bg-rose-50/70 dark:bg-rose-950/40 font-semibold'
                          : isFolderSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-semibold shadow-2xs'
                          : isHovered 
                          ? 'bg-blue-100 dark:bg-blue-900/60 font-bold' 
                          : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      {canManageItems && (
                        <td className="py-2 px-2.5 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isFolderSelected}
                            onChange={() => {
                              playNavSound();
                              onToggleSelectTarget?.({
                                type: 'folder',
                                id: folder.id,
                                name: folder.name,
                                path: folder.path,
                                quizCount: count,
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-2 px-3 flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
                        <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                        <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        <span>{folder.name}</span>
                        {isHovered && <span className="text-[10px] text-blue-600 font-bold ml-1">(Drop to move here)</span>}
                      </td>
                      <td className="py-2 px-3">
                        <a
                          href={getGitHubFolderUrl(folder)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                        >
                          <Github className="w-3 h-3" />
                          <span>repo folder</span>
                        </a>
                      </td>
                      <td className="py-2 px-3 text-neutral-500">Folder</td>
                      <td className="py-2 px-3 text-right text-neutral-500 tabular-nums">{count} items</td>
                      <td className="py-2 px-3 text-right text-neutral-400">—</td>
                      <td className="py-2 px-3 text-neutral-400">—</td>
                      <td className="py-2 px-3 text-neutral-400 tabular-nums">2026-09-27</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onRequestMoveItem && (
                            <button
                              onClick={() => onRequestMoveItem({ type: 'folder', folder })}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={`Move folder ${folder.name}`}
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManageItems && onRequestRenameItem && (
                            <button
                              onClick={() => {
                                playNavSound();
                                onRequestRenameItem({ type: 'folder', folder });
                              }}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={`Rename folder ${folder.name}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManageItems && (
                            <button
                              onClick={() => onRequestDeleteFolder(folder)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title={`Delete folder ${folder.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-neutral-400 hover:text-blue-500">Open →</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Quiz rows */}
                {quizzesToDisplay.map((quiz) => {
                  const isFav = favorites.includes(quiz.id);
                  const isPendingSync = quiz.syncStatus === 'pending_sync';
                  const isMultiSelectedQuiz = selectedTargets ? selectedTargets.has(quiz.path) : false;
                  const isQuizSelected = selectedItem?.path === quiz.path || isMultiSelectedQuiz;

                  return (
                    <tr
                      key={quiz.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStartQuiz(e, quiz)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        if (selectedItem?.path === quiz.path) {
                          playOpenSound();
                          onOpenQuiz(quiz);
                        } else {
                          playNavSound();
                          onSelectItem?.({
                            type: 'quiz',
                            id: quiz.id,
                            name: quiz.title,
                            path: quiz.path,
                            quiz,
                          });
                        }
                      }}
                      onDoubleClick={() => {
                        playOpenSound();
                        onOpenQuiz(quiz);
                      }}
                      className={`cursor-pointer transition-colors group ${
                        isMultiSelectedQuiz 
                          ? 'bg-rose-50/60 dark:bg-rose-950/30 font-semibold' 
                          : isQuizSelected
                          ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-900 dark:text-blue-100 font-semibold shadow-2xs'
                          : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60'
                      }`}
                    >
                      {canManageItems && (
                        <td className="py-2 px-2.5 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isQuizSelected}
                            onChange={() => {
                              playNavSound();
                              onToggleSelectTarget?.({
                                type: 'quiz',
                                id: quiz.id,
                                name: quiz.title,
                                path: quiz.path,
                                sha: quiz.sha,
                                category: quiz.category,
                              });
                            }}
                            className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-2 px-3 font-medium text-neutral-900 dark:text-neutral-100">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 cursor-grab" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(quiz.id);
                            }}
                            className="text-neutral-300 hover:text-amber-400"
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>
                          <FileCode className={`w-4 h-4 ${getCategoryColor(quiz.category)} shrink-0`} />
                          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {quiz.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        {isPendingSync ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300">
                              ● Pending
                            </span>
                            {onSyncQuizToGitHub && (
                              <button
                                onClick={() => onSyncQuizToGitHub(quiz)}
                                className="text-amber-600 hover:underline text-[11px] font-semibold"
                              >
                                Push
                              </button>
                            )}
                          </div>
                        ) : (
                          <a
                            href={getGitHubFileUrl(quiz)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
                            title={quiz.sha ? `Git SHA: ${quiz.sha}` : 'Synced with GitHub'}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Synced</span>
                          </a>
                        )}
                      </td>
                      <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">{quiz.category}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">{quiz.questionCount} Qs</td>
                      <td className="py-2 px-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">{quiz.estimatedMinutes} min</td>
                      <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">{quiz.difficulty}</td>
                      <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 tabular-nums">{quiz.dateModified}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {onRequestMoveItem && (
                            <button
                              onClick={() => onRequestMoveItem({ type: 'quiz', quiz })}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={`Move quiz to another folder`}
                            >
                              <FolderInput className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canManageItems && onRequestRenameItem && (
                            <button
                              onClick={() => {
                                playNavSound();
                                onRequestRenameItem({ type: 'quiz', quiz });
                              }}
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={`Rename quiz ${quiz.title}`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isPendingSync && (
                            <a
                              href={getGitHubFileUrl(quiz)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                              title="Open on GitHub"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {canManageItems && (
                            <button
                              onClick={() => onRequestDeleteQuiz(quiz)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title={`Delete quiz ${quiz.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleShareQuiz(quiz, e)}
                            className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                            title="Copy permalink"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenQuiz(quiz)}
                            className="px-2 py-0.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                          >
                            Launch
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectedCount > 0 && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/95 dark:bg-[#202020]/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-neutral-700/80 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 bg-rose-600 text-white rounded-full">
              {selectedCount} selected
            </span>
            <button
              onClick={() => {
                playNavSound();
                if (isAllSelected) {
                  onClearSelection?.();
                } else {
                  onSelectAllTargets?.(allVisibleTargets);
                }
              }}
              className="text-xs text-neutral-300 hover:text-white font-medium hover:underline cursor-pointer"
            >
              {isAllSelected ? 'Deselect All' : `Select All (${allVisibleTargets.length})`}
            </button>
            <button
              onClick={() => {
                playNavSound();
                onClearSelection?.();
              }}
              className="text-xs text-neutral-400 hover:text-white font-medium hover:underline cursor-pointer ml-1"
            >
              Clear
            </button>
          </div>

          <div className="h-4 w-px bg-neutral-700" />

          {canManageItems && onRequestDeleteSelected && (
            <button
              onClick={() => {
                playNavSound();
                onRequestDeleteSelected();
              }}
              className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              title="Delete all selected items permanently from repository"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedCount})</span>
            </button>
          )}
        </div>
      )}

      {/* Windows 11 Status Bar */}
      <div className="h-6 bg-[#f3f3f3] dark:bg-[#1e1e1e] border-t border-neutral-200 dark:border-neutral-800 px-3 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline tabular-nums">{quizzesToDisplay.length} quizzes available</span>
          <span className="hidden md:inline">|</span>
          <span className="hidden md:inline text-neutral-500">
            Drag items to move · Drop .html file to upload
          </span>
          <span className="hidden lg:inline">|</span>
          <span className="hidden lg:inline text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
            <Github className="w-3 h-3" />
            <span>panicconandoyle-ctrl/Nihrantz-Quiz (main)</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Path: <code className="font-mono text-[10px]">{currentFolder.path}</code></span>
        </div>
      </div>
    </div>
  );
};
