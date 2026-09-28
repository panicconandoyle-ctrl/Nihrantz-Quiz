import React, { useState } from 'react';
import { 
  X, 
  Play, 
  Share2, 
  Download, 
  ExternalLink, 
  Check, 
  FileCode, 
  Folder, 
  Award, 
  Clock, 
  HelpCircle, 
  HardDrive, 
  Calendar, 
  Layers, 
  Sparkles,
  Info,
  Edit2,
  Trash2,
  Flame,
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import { QuizItem, FolderNode, QuizScoreRecord } from '../types';
import { SelectedExplorerItem } from '../hooks/useExplorerKeyboardShortcuts';
import { countFolderQuizzes } from '../data/defaultManifest';
import { playNavSound, playOpenSound } from '../utils/audio';

interface PreviewPaneProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItem: SelectedExplorerItem | null;
  onOpenQuiz: (quiz: QuizItem) => void;
  onNavigatePath: (path: string) => void;
  completedQuizzes: Record<string, QuizScoreRecord>;
  ghConfig: { owner: string; repo: string; branch: string };
  canManageItems?: boolean;
  onRequestRenameItem?: (target: { type: 'quiz' | 'folder'; quiz?: QuizItem; folder?: FolderNode }) => void;
  onRequestDeleteQuiz?: (quiz: QuizItem) => void;
  onRequestDeleteFolder?: (folder: FolderNode) => void;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  isOpen,
  onClose,
  selectedItem,
  onOpenQuiz,
  onNavigatePath,
  completedQuizzes,
  ghConfig,
  canManageItems = false,
  onRequestRenameItem,
  onRequestDeleteQuiz,
  onRequestDeleteFolder,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyPermalink = (quiz: QuizItem) => {
    playNavSound();
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('quiz', quiz.path);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownload = (quiz: QuizItem) => {
    playNavSound();
    if (quiz.htmlContent) {
      const blob = new Blob([quiz.htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = quiz.filename || `${quiz.title.toLowerCase().replace(/\s+/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Direct raw link download
      const targetUrl = quiz.rawUrl || `https://raw.githubusercontent.com/${ghConfig.owner}/${ghConfig.repo}/${ghConfig.branch || 'main'}/${quiz.path}`;
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = quiz.filename || 'quiz.html';
      a.target = '_blank';
      a.click();
    }
  };

  const getDifficultyBadge = (difficulty: 'Beginner' | 'Intermediate' | 'Advanced') => {
    switch (difficulty) {
      case 'Beginner':
        return 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800';
      case 'Intermediate':
        return 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
      case 'Advanced':
        return 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800';
      default:
        return 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
    }
  };

  return (
    <aside
      className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-[#f9f9f9] dark:bg-[#1a1a1a] flex flex-col h-full shrink-0 select-none overflow-hidden transition-all duration-200 shadow-xs"
      aria-label="File Preview and Details Pane"
    >
      {/* Pane Header */}
      <div className="h-9 px-3.5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-300 bg-white/70 dark:bg-[#202020]/70 backdrop-blur-xs shrink-0">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span>Details &amp; Preview</span>
        </div>
        <button
          onClick={() => {
            playNavSound();
            onClose();
          }}
          className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors"
          title="Close Details Pane (Alt + P)"
          aria-label="Close Preview Pane"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pane Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedItem && selectedItem.type === 'quiz' ? (
          /* QUIZ ITEM SELECTED */
          <div className="space-y-4">
            {/* Visual Icon / Header Card */}
            <div className="p-4 bg-white dark:bg-[#232323] rounded-xl border border-neutral-200/80 dark:border-neutral-700/70 text-center flex flex-col items-center shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md mb-3">
                <FileCode className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                {selectedItem.quiz.title}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1 font-medium">
                <span>{selectedItem.quiz.category}</span>
                {selectedItem.quiz.topic && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[140px]">{selectedItem.quiz.topic}</span>
                  </>
                )}
              </p>

              {/* Difficulty, Question Count & Duration Metadata */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span className={`font-semibold ${
                  selectedItem.quiz.difficulty === 'Beginner' 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : selectedItem.quiz.difficulty === 'Intermediate' 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-purple-600 dark:text-purple-400'
                }`}>
                  {selectedItem.quiz.difficulty}
                </span>
                <span aria-hidden="true">·</span>
                <span>{selectedItem.quiz.questionCount} Questions</span>
                <span aria-hidden="true">·</span>
                <span>~{selectedItem.quiz.estimatedMinutes} min</span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="space-y-2">
              <button
                onClick={() => {
                  playOpenSound();
                  onOpenQuiz(selectedItem.quiz);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:shadow"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Quiz (Enter)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCopyPermalink(selectedItem.quiz)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-[#252525] hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Copy permalink to clipboard"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Share2 className="w-3 h-3 text-neutral-400" />}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>

                <button
                  onClick={() => handleDownload(selectedItem.quiz)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white dark:bg-[#252525] hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="Download standalone HTML file"
                >
                  <Download className="w-3 h-3 text-neutral-400" />
                  <span>Download</span>
                </button>
              </div>

              {/* External GitHub link */}
              <a
                href={selectedItem.quiz.gitHubUrl || `https://github.com/${ghConfig.owner}/${ghConfig.repo}/blob/${ghConfig.branch || 'main'}/${selectedItem.quiz.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-[11px] transition-colors"
              >
                <span>View file commit on GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>

            {/* Historical Score & Mastery Card */}
            {(() => {
              const record = completedQuizzes[selectedItem.quiz.id];
              return (
                <div className="p-3 bg-white dark:bg-[#232323] rounded-xl border border-neutral-200/80 dark:border-neutral-700/70 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-200">
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-500" />
                      <span>Historical Performance</span>
                    </span>
                    {record && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        record.percentage >= 80 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : record.percentage >= 60
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {record.percentage}%
                      </span>
                    )}
                  </div>

                  {record ? (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">Best Score:</span>
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {record.score} / {record.total}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            record.percentage >= 80
                              ? 'bg-emerald-500'
                              : record.percentage >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${record.percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-0.5">
                        <span>Status: {record.percentage >= 70 ? 'Passed' : 'Needs Practice'}</span>
                        {record.timestamp && (
                          <span>{new Date(record.timestamp).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic pt-0.5">
                      Not yet attempted. Launch quiz to record your score.
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Metadata Properties Table (Windows 11 Style) */}
            <div className="p-3 bg-white dark:bg-[#232323] rounded-xl border border-neutral-200/80 dark:border-neutral-700/70 space-y-2.5">
              <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                File Properties
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 shrink-0">Item type:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 text-right truncate font-medium">
                    HTML5 Interactive Quiz
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 shrink-0">Questions:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 text-right font-medium">
                    {selectedItem.quiz.questionCount} Questions
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 shrink-0">Est. duration:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 text-right font-medium">
                    ~{selectedItem.quiz.estimatedMinutes} minutes
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 shrink-0">File size:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 text-right font-medium">
                    {selectedItem.quiz.size || '~38 KB'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 shrink-0">Date modified:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 text-right font-medium">
                    {selectedItem.quiz.dateModified || 'Recent'}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-neutral-500 shrink-0">Location:</span>
                  <span className="text-neutral-700 dark:text-neutral-300 text-right font-mono text-[11px] truncate max-w-[170px]" title={selectedItem.quiz.path}>
                    {selectedItem.quiz.path}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Management Actions */}
            {canManageItems && (
              <div className="pt-1 flex items-center justify-between gap-2">
                {onRequestRenameItem && (
                  <button
                    onClick={() => onRequestRenameItem({ type: 'quiz', quiz: selectedItem.quiz })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                    title="Rename this quiz (F2)"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Rename (F2)</span>
                  </button>
                )}
                {onRequestDeleteQuiz && (
                  <button
                    onClick={() => onRequestDeleteQuiz(selectedItem.quiz)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                    title="Delete this quiz (Del)"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete (Del)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : selectedItem && selectedItem.type === 'folder' ? (
          /* FOLDER ITEM SELECTED */
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-[#232323] rounded-xl border border-neutral-200/80 dark:border-neutral-700/70 text-center flex flex-col items-center shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mb-3">
                <Folder className="w-7 h-7 fill-amber-500/30" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-full">
                {selectedItem.folder.name}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-mono truncate max-w-full">
                {selectedItem.folder.path}
              </p>
            </div>

            <button
              onClick={() => {
                playNavSound();
                onNavigatePath(selectedItem.folder.path);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer hover:shadow"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Open Folder (Enter)</span>
            </button>

            {/* Folder Properties */}
            <div className="p-3 bg-white dark:bg-[#232323] rounded-xl border border-neutral-200/80 dark:border-neutral-700/70 space-y-2.5">
              <h4 className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                Folder Properties
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Item type:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-medium">File Folder</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Contains Quizzes:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                    {countFolderQuizzes(selectedItem.folder)} items
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Subfolders:</span>
                  <span className="text-neutral-800 dark:text-neutral-200 font-medium">
                    {(selectedItem.folder.folders || []).length} folders
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Management Actions */}
            {canManageItems && (
              <div className="pt-1 flex items-center justify-between gap-2">
                {onRequestRenameItem && (
                  <button
                    onClick={() => onRequestRenameItem({ type: 'folder', folder: selectedItem.folder })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
                    title="Rename this folder (F2)"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Rename (F2)</span>
                  </button>
                )}
                {onRequestDeleteFolder && (
                  <button
                    onClick={() => onRequestDeleteFolder(selectedItem.folder)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1 px-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
                    title="Delete this folder (Del)"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete (Del)</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* NO ITEM SELECTED - EMPTY STATE (Windows 11 Explorer Style) */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-neutral-200/60 dark:bg-neutral-800/60 flex items-center justify-center text-neutral-400">
              <BookOpen className="w-7 h-7 stroke-1" />
            </div>
            <div>
              <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">
                Select an item to view details
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 leading-relaxed">
                Click any quiz or folder to preview properties, review scores, or launch directly.
              </p>
            </div>
            <div className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800/80 px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700/60">
              Shortcut: <kbd className="font-mono font-bold">Alt + P</kbd> toggles pane
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
