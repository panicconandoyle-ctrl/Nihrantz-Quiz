import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  Star, 
  Clock, 
  HardDrive, 
  FlaskConical, 
  BookOpen, 
  Cpu, 
  Globe2, 
  Layers
} from 'lucide-react';
import { FolderNode, QuizItem } from '../types';
import { countFolderQuizzes } from '../data/defaultManifest';
import { playNavSound, playDragSound, playDropSound } from '../utils/audio';

interface SidebarProps {
  rootFolder: FolderNode;
  currentPath: string;
  onNavigatePath: (path: string) => void;
  favorites: string[];
  recentQuizzes: QuizItem[];
  isOpen: boolean;
  onCloseMobile: () => void;
  onDropOnFolder?: (source: { type: 'quiz' | 'folder'; quiz?: QuizItem; folder?: FolderNode }, targetFolderPath: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rootFolder,
  currentPath,
  onNavigatePath,
  favorites,
  recentQuizzes,
  isOpen,
  onCloseMobile,
  onDropOnFolder,
}) => {
  // Track expanded folder paths in the tree
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'quizzes': true,
    'quizzes/science': true,
    'quizzes/history': true,
    'quizzes/computer_science': true,
    'quizzes/geography': true,
  });

  const [dragOverPath, setDragOverPath] = useState<string | null>(null);

  const toggleFolderExpand = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const handleDragOver = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverPath !== folderPath) {
      setDragOverPath(folderPath);
    }
  };

  const handleDragLeave = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverPath === folderPath) {
      setDragOverPath(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetFolderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);

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

  const renderFolderTreeNode = (node: FolderNode, level: number = 0) => {
    const isExpanded = !!expandedFolders[node.path];
    const isSelected = currentPath === node.path;
    const hasChildren = node.folders && node.folders.length > 0;
    const totalCount = countFolderQuizzes(node);
    const isDragOver = dragOverPath === node.path;

    return (
      <div key={node.path} className="flex flex-col">
        <div
          onClick={() => {
            playNavSound();
            onNavigatePath(node.path);
            onCloseMobile();
          }}
          onDragOver={(e) => handleDragOver(e, node.path)}
          onDragLeave={(e) => handleDragLeave(e, node.path)}
          onDrop={(e) => handleDrop(e, node.path)}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-all text-xs group ${
            isDragOver
              ? 'bg-blue-200 dark:bg-blue-800/80 text-blue-950 dark:text-white font-bold ring-2 ring-blue-500 scale-[1.02]'
              : isSelected
              ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
              : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
          }`}
          title={`Folder: ${node.name} (Drop file or folder here to move into ${node.name})`}
        >
          {/* Expand/Collapse Chevron */}
          <button
            onClick={(e) => hasChildren ? toggleFolderExpand(node.path, e) : null}
            className={`p-0.5 rounded hover:bg-neutral-300/60 dark:hover:bg-neutral-700 ${!hasChildren ? 'opacity-0 cursor-default' : 'opacity-80'}`}
            tabIndex={-1}
          >
            {hasChildren && isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
            )}
          </button>

          {/* Folder Icon */}
          {isSelected || isExpanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          )}

          <span className="truncate flex-1">{node.name}</span>

          {/* Item Count */}
          <span className="text-[11px] text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 tabular-nums">
            {totalCount}
          </span>
        </div>

        {/* Subfolders */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.folders.map(sub => renderFolderTreeNode(sub, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`w-64 bg-[#fbfbfb] dark:bg-[#1b1b1b] border-r border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 select-none overflow-y-auto z-20 transition-transform duration-200 ease-in-out md:static fixed inset-y-0 left-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-2 space-y-4">
          {/* Quick Access Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Quick Access
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors text-xs text-left ${
                  currentPath === 'quizzes'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <HardDrive className="w-4 h-4 text-blue-500 shrink-0" />
                <span>All Quizzes (Root)</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/science');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors text-xs text-left ${
                  currentPath === 'quizzes/science'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Science</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/history');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors text-xs text-left ${
                  currentPath === 'quizzes/history'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-500 shrink-0" />
                <span>History</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/computer_science');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors text-xs text-left ${
                  currentPath === 'quizzes/computer_science'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Computer Science</span>
              </button>
            </div>
          </div>

          {/* Directory Tree Navigation */}
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center justify-between">
              <span>Repository Tree</span>
              <span className="text-[10px] lowercase text-neutral-400">drop zone</span>
            </div>
            <div className="space-y-0.5">
              {renderFolderTreeNode(rootFolder, 0)}
            </div>
          </div>

          {/* Starred / Favorites */}
          {favorites.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Starred Quizzes ({favorites.length})</span>
              </div>
              <div className="space-y-0.5">
                {favorites.map((favId) => (
                  <div
                    key={favId}
                    className="py-1 px-2 text-xs text-neutral-600 dark:text-neutral-300 truncate"
                  >
                    ★ {favId}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Completed Quizzes */}
          {recentQuizzes.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Recent Completed ({recentQuizzes.length})</span>
              </div>
              <div className="space-y-1">
                {recentQuizzes.slice(0, 5).map((q) => (
                  <div
                    key={q.id}
                    className="p-1.5 rounded bg-white dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs"
                  >
                    <div className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                      {q.title}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {q.category} · {q.questionCount} Questions
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
