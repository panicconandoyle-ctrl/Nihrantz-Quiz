import React, { useState } from 'react';
import { 
  X, 
  Folder, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  ArrowRight, 
  Check, 
  AlertCircle,
  FileCode,
  FolderInput,
  HardDrive
} from 'lucide-react';
import { FolderNode, QuizItem } from '../types';
import { playNavSound, playSuccessChime } from '../utils/audio';

export interface MoveTarget {
  type: 'quiz' | 'folder';
  quiz?: QuizItem;
  folder?: FolderNode;
}

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: MoveTarget | null;
  rootFolder: FolderNode;
  onConfirmMove: (target: MoveTarget, destinationFolderPath: string) => Promise<{ success: boolean; error?: string }>;
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({
  isOpen,
  onClose,
  target,
  rootFolder,
  onConfirmMove,
}) => {
  const [selectedDestPath, setSelectedDestPath] = useState<string>('quizzes');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['quizzes']));
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !target) return null;

  const itemName = target.type === 'quiz' ? target.quiz?.title : target.folder?.name;
  const currentItemPath = target.type === 'quiz' ? target.quiz?.path : target.folder?.path;

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const isInvalidDestination = (destPath: string): boolean => {
    if (!currentItemPath) return false;
    // Cannot move into self
    if (destPath === currentItemPath) return true;
    // If moving a folder, cannot move into own subfolder
    if (target.type === 'folder' && destPath.startsWith(currentItemPath + '/')) return true;
    // If already in this folder
    const currentParent = currentItemPath.split('/').slice(0, -1).join('/') || 'quizzes';
    if (destPath === currentParent) return true;
    return false;
  };

  const handleSelectFolder = (path: string) => {
    playNavSound();
    setSelectedDestPath(path);
    setErrorMessage(null);
  };

  const handleExecuteMove = async () => {
    if (isInvalidDestination(selectedDestPath)) {
      setErrorMessage('Cannot move item into its current location or its own subfolder.');
      return;
    }

    setIsMoving(true);
    setErrorMessage(null);
    playNavSound();

    const res = await onConfirmMove(target, selectedDestPath);
    setIsMoving(false);

    if (res.success) {
      playSuccessChime();
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to move item.');
    }
  };

  // Render tree node recursively
  const renderFolderTreeNode = (node: FolderNode, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.folders && node.folders.length > 0;
    const isSelected = selectedDestPath === node.path;
    const isInvalid = isInvalidDestination(node.path);

    return (
      <div key={node.path} className="flex flex-col">
        <div
          onClick={() => !isInvalid && handleSelectFolder(node.path)}
          style={{ paddingLeft: `${depth * 18 + 10}px` }}
          className={`flex items-center gap-1.5 py-1.5 pr-3 rounded-lg text-xs cursor-pointer transition-colors ${
            isSelected 
              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 font-semibold' 
              : isInvalid 
              ? 'opacity-40 cursor-not-allowed text-neutral-400' 
              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
          }`}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(node.path, e)}
              className="p-0.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-neutral-400"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}

          <Folder className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
          <span className="truncate">{node.name}</span>

          {isInvalid && (
            <span className="text-[10px] text-neutral-400 italic ml-auto">current/invalid</span>
          )}
          {isSelected && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-auto">Selected</span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col">
            {node.folders.map(sub => renderFolderTreeNode(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FolderInput className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Move {target.type === 'quiz' ? 'Quiz File' : 'Folder'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[260px]">
                {itemName}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Path Info */}
        <div className="px-5 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200/70 dark:border-neutral-700/60 text-xs flex items-center justify-between">
          <span className="text-neutral-500">Source:</span>
          <span className="font-mono text-neutral-700 dark:text-neutral-300 truncate max-w-[280px]">
            {currentItemPath}
          </span>
        </div>

        {/* Tree Selector */}
        <div className="p-4 flex-1 overflow-y-auto min-h-[220px] space-y-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Select Destination Folder
          </p>
          {renderFolderTreeNode(rootFolder, 0)}
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 mb-2 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Destination preview & Footer */}
        <div className="px-5 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#252525] flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 uppercase font-semibold">Moving To</span>
            <span className="font-mono text-neutral-800 dark:text-neutral-200 font-semibold truncate max-w-[180px]">
              {selectedDestPath}/
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playNavSound();
                onClose();
              }}
              className="px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 rounded-lg text-neutral-700 dark:text-neutral-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteMove}
              disabled={isMoving || isInvalidDestination(selectedDestPath)}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              {isMoving ? 'Moving...' : 'Move Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
