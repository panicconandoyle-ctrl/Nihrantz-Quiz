import React from 'react';
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
  Trash2
} from 'lucide-react';
import { FolderNode, QuizItem, ViewMode } from '../types';
import { countFolderQuizzes } from '../data/defaultManifest';
import { playOpenSound, playNavSound } from '../utils/audio';

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
  completedQuizzes: Record<string, { score: number; total: number; percentage: number }>;
  canManageItems: boolean;
  onRequestDeleteQuiz: (quiz: QuizItem) => void;
  onRequestDeleteFolder: (folder: FolderNode) => void;
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
}) => {
  const totalItems = subfoldersToDisplay.length + quizzesToDisplay.length;

  const [copiedPath, setCopiedPath] = React.useState<string | null>(null);

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
      case 'history': return 'text-amber-500';
      case 'computer science': return 'text-indigo-500';
      case 'geography': return 'text-sky-500';
      default: return 'text-blue-500';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#191919] overflow-hidden select-none">
      {/* Scrollable Viewport */}
      <div className="flex-1 overflow-y-auto p-4">
        {totalItems === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-400">
            <FolderOpen className="w-12 h-12 stroke-1 mb-3 text-neutral-300 dark:text-neutral-600" />
            <p className="text-base font-medium text-neutral-700 dark:text-neutral-300">This folder is empty</p>
            {searchQuery ? (
              <p className="text-xs text-neutral-500 mt-1">No items match "{searchQuery}". Try searching globally or clear your filter.</p>
            ) : (
              <p className="text-xs text-neutral-500 mt-1">No subfolders or HTML quizzes located here.</p>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View Mode */
          <div className="space-y-6">
            {/* Subfolders Section */}
            {subfoldersToDisplay.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                  Folders ({subfoldersToDisplay.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {subfoldersToDisplay.map((folder) => {
                    const count = countFolderQuizzes(folder);
                    return (
                      <div
                        key={folder.path}
                        onClick={() => {
                          playNavSound();
                          onNavigatePath(folder.path);
                        }}
                        className="group relative flex flex-col items-center p-3 rounded-lg border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/60 hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 cursor-pointer transition-all text-center"
                      >
                        {canManageItems && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestDeleteFolder(folder);
                            }}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-all"
                            title={`Delete folder ${folder.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <Folder className="w-12 h-12 text-amber-500 fill-amber-500 group-hover:scale-105 transition-transform drop-shadow-2xs mb-1.5" />
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate w-full">
                          {folder.name}
                        </span>
                        <span className="text-[11px] text-neutral-400 tabular-nums">
                          {count} {count === 1 ? 'quiz' : 'quizzes'}
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
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2 uppercase tracking-wider">
                  Interactive Quizzes ({quizzesToDisplay.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                  {quizzesToDisplay.map((quiz) => {
                    const isFav = favorites.includes(quiz.id);
                    const record = completedQuizzes[quiz.id];

                    return (
                      <div
                        key={quiz.id}
                        onClick={() => {
                          playOpenSound();
                          onOpenQuiz(quiz);
                        }}
                        className="group relative flex flex-col justify-between p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-white dark:bg-[#202020] hover:border-blue-400/80 dark:hover:border-blue-500/80 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div>
                          {/* Header: Icon + Category + Favorite */}
                          <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                              <FileCode className={`w-5 h-5 ${getCategoryColor(quiz.category)}`} />
                              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                                {quiz.category}
                              </span>
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

                          {/* Zero-Pill Metadata Discipline: unboxed text with · separators */}
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums mb-3">
                            <span>{quiz.questionCount} Questions</span>
                            <span aria-hidden="true">·</span>
                            <span>{quiz.estimatedMinutes} min</span>
                            <span aria-hidden="true">·</span>
                            <span>{quiz.difficulty}</span>
                          </div>
                        </div>

                        {/* Bottom Row: Completed status or Launch button */}
                        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/60 flex items-center justify-between">
                          {record ? (
                            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="tabular-nums">Best: {record.percentage}% ({record.score}/{record.total})</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {quiz.filename}
                            </span>
                          )}

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            {canManageItems && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRequestDeleteQuiz(quiz);
                                }}
                                className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                title={`Delete quiz ${quiz.title}`}
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
                  <th className="py-2 px-3 font-semibold">Name</th>
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
                  return (
                    <tr
                      key={folder.path}
                      onClick={() => {
                        playNavSound();
                        onNavigatePath(folder.path);
                      }}
                      className="hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-2 px-3 flex items-center gap-2 font-medium text-neutral-800 dark:text-neutral-200">
                        <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        <span>{folder.name}</span>
                      </td>
                      <td className="py-2 px-3 text-neutral-500">Folder</td>
                      <td className="py-2 px-3 text-right text-neutral-500 tabular-nums">{count} items</td>
                      <td className="py-2 px-3 text-right text-neutral-400">—</td>
                      <td className="py-2 px-3 text-neutral-400">—</td>
                      <td className="py-2 px-3 text-neutral-400 tabular-nums">2026-09-20</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                  const record = completedQuizzes[quiz.id];

                  return (
                    <tr
                      key={quiz.id}
                      onClick={() => {
                        playOpenSound();
                        onOpenQuiz(quiz);
                      }}
                      className="hover:bg-neutral-100/70 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors group"
                    >
                      <td className="py-2 px-3 font-medium text-neutral-900 dark:text-neutral-100">
                        <div className="flex items-center gap-2">
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
                      <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">{quiz.category}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">{quiz.questionCount} Qs</td>
                      <td className="py-2 px-3 text-right tabular-nums text-neutral-600 dark:text-neutral-300">{quiz.estimatedMinutes} min</td>
                      <td className="py-2 px-3 text-neutral-600 dark:text-neutral-300">{quiz.difficulty}</td>
                      <td className="py-2 px-3 text-neutral-500 dark:text-neutral-400 tabular-nums">{quiz.dateModified}</td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
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

      {/* Windows 11 Status Bar */}
      <div className="h-6 bg-[#f3f3f3] dark:bg-[#1e1e1e] border-t border-neutral-200 dark:border-neutral-800 px-3 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 shrink-0">
        <div className="flex items-center gap-3">
          <span className="tabular-nums">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline tabular-nums">{quizzesToDisplay.length} quizzes available</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Path: <code className="font-mono text-[10px]">{currentFolder.path}</code></span>
        </div>
      </div>
    </div>
  );
};
