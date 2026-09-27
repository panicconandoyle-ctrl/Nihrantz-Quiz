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
import { playNavSound } from '../utils/audio';

interface SidebarProps {
  rootFolder: FolderNode;
  currentPath: string;
  onNavigatePath: (path: string) => void;
  favorites: string[];
  recentQuizzes: QuizItem[];
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  rootFolder,
  currentPath,
  onNavigatePath,
  favorites,
  recentQuizzes,
  isOpen,
  onCloseMobile,
}) => {
  // Track expanded folder paths in the tree
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'quizzes': true,
    'quizzes/science': true,
    'quizzes/history': true,
    'quizzes/computer_science': true,
    'quizzes/geography': true,
  });

  const toggleFolderExpand = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };

  const renderFolderTreeNode = (node: FolderNode, level: number = 0) => {
    const isExpanded = !!expandedFolders[node.path];
    const isSelected = currentPath === node.path;
    const hasChildren = node.folders && node.folders.length > 0;
    const totalCount = countFolderQuizzes(node);

    return (
      <div key={node.path} className="flex flex-col">
        <div
          onClick={() => {
            playNavSound();
            onNavigatePath(node.path);
            onCloseMobile();
          }}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors text-xs group ${
            isSelected
              ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
              : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
          }`}
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
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  currentPath === 'quizzes'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-500" />
                <span className="flex-1 text-left">All Quizzes</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/science');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  currentPath === 'quizzes/science'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <FlaskConical className="w-4 h-4 text-emerald-500" />
                <span className="flex-1 text-left">Science & Biology</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/history');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  currentPath === 'quizzes/history'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span className="flex-1 text-left">Modern History</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/computer_science');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  currentPath === 'quizzes/computer_science'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Cpu className="w-4 h-4 text-indigo-500" />
                <span className="flex-1 text-left">Computer Science</span>
              </button>

              <button
                onClick={() => {
                  playNavSound();
                  onNavigatePath('quizzes/geography');
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                  currentPath === 'quizzes/geography'
                    ? 'bg-blue-100/80 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-semibold'
                    : 'hover:bg-neutral-200/70 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Globe2 className="w-4 h-4 text-sky-500" />
                <span className="flex-1 text-left">World Geography</span>
              </button>
            </div>
          </div>

          {/* Directory Tree (This PC) */}
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" />
              <span>This PC (Directory Tree)</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {renderFolderTreeNode(rootFolder, 0)}
            </div>
          </div>

          {/* Favorites & Recent Status */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
              Activity
            </div>
            <div className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span>Starred Quizzes</span>
              </span>
              <span className="tabular-nums font-mono">{favorites.length}</span>
            </div>
            <div className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                <span>Completed Quizzes</span>
              </span>
              <span className="tabular-nums font-mono">{recentQuizzes.length}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-auto p-3 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-400 dark:text-neutral-500">
          <div className="flex items-center justify-between">
            <span>Static GitHub-Ready</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="100% Static & Online"></span>
          </div>
        </div>
      </aside>
    </>
  );
};
