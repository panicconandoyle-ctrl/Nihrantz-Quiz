import { useEffect, useCallback } from 'react';
import { FolderNode, QuizItem, DeleteItemTarget } from '../types';

export type SelectedExplorerItem = 
  | { type: 'folder'; id: string; path: string; name: string; folder: FolderNode }
  | { type: 'quiz'; id: string; path: string; name: string; quiz: QuizItem };

export interface UseExplorerKeyboardShortcutsOptions {
  /** The currently focused / selected item in the explorer view */
  selectedItem: SelectedExplorerItem | null;
  /** Any multi-selected targets (via checkboxes) */
  selectedTargets?: Map<string, DeleteItemTarget>;
  /** Callback invoked when pressing Enter to Open / Execute the selected folder or quiz */
  onOpenItem?: (item: SelectedExplorerItem) => void;
  /** Callback invoked when pressing F2 to Rename the selected folder or quiz */
  onRenameItem?: (item: SelectedExplorerItem) => void;
  /** Callback invoked when pressing Delete to delete the selected item */
  onDeleteItem?: (item: SelectedExplorerItem) => void;
  /** Callback invoked when pressing Delete with multiple items selected */
  onDeleteMultiple?: (targets: DeleteItemTarget[]) => void;
  /** Callback to navigate selection up/left */
  onSelectPrevious?: () => void;
  /** Callback to navigate selection down/right */
  onSelectNext?: () => void;
  /** Callback to clear current selection on Escape */
  onClearSelection?: () => void;
  /** Callback to toggle Preview Pane on Alt + P */
  onTogglePreviewPane?: () => void;
  /** Master switch to enable/disable shortcuts (e.g., false when modals or players are open) */
  isEnabled?: boolean;
}

/**
 * Custom hook to handle Windows Explorer-style keyboard shortcuts:
 * - Enter: Open / Execute the selected folder or quiz
 * - F2: Rename the selected folder or quiz
 * - Delete: Delete the currently selected item or batch of selected items
 * - ArrowUp / ArrowLeft: Move selection to previous item
 * - ArrowDown / ArrowRight: Move selection to next item
 * - Escape: Deselect items
 * - Alt + P: Toggle Preview Pane
 *
 * Automatically guards against firing when typing in inputs/textareas or when modals are open.
 */
export function useExplorerKeyboardShortcuts({
  selectedItem,
  selectedTargets,
  onOpenItem,
  onRenameItem,
  onDeleteItem,
  onDeleteMultiple,
  onSelectPrevious,
  onSelectNext,
  onClearSelection,
  onTogglePreviewPane,
  isEnabled = true,
}: UseExplorerKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 1. If shortcuts are disabled (e.g., modal is open), do nothing
      if (!isEnabled) return;

      // 2. Do not trigger shortcuts when typing inside form inputs, textareas, or contentEditable
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName?.toLowerCase();
        if (
          tagName === 'input' ||
          tagName === 'textarea' ||
          tagName === 'select' ||
          target.isContentEditable ||
          target.closest('input, textarea, select, [contenteditable="true"]')
        ) {
          return;
        }
      }

      // --- KEY: Alt + P (Toggle Preview Pane) ---
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        if (onTogglePreviewPane) {
          e.preventDefault();
          onTogglePreviewPane();
          return;
        }
      }

      // Check if user is holding Ctrl/Cmd/Alt (unless specific combo)
      const hasModifier = e.ctrlKey || e.metaKey || e.altKey;

      // --- KEY: Delete / Del (Delete Key) ---
      if (e.key === 'Delete' || e.key === 'Del') {
        // If multiple items are selected via checkboxes, delete all
        if (selectedTargets && selectedTargets.size > 0 && onDeleteMultiple) {
          e.preventDefault();
          onDeleteMultiple(Array.from(selectedTargets.values()));
          return;
        }

        // If a single item is selected
        if (selectedItem && onDeleteItem) {
          e.preventDefault();
          onDeleteItem(selectedItem);
          return;
        }
      }

      // --- KEY: F2 (Rename Key) ---
      if (e.key === 'F2') {
        if (selectedItem && onRenameItem) {
          e.preventDefault();
          onRenameItem(selectedItem);
          return;
        }
      }

      // --- KEY: Enter (Open / Execute Key) ---
      if (e.key === 'Enter' && !hasModifier) {
        if (selectedItem && onOpenItem) {
          e.preventDefault();
          onOpenItem(selectedItem);
          return;
        }
      }

      // --- KEY: Escape (Deselect) ---
      if (e.key === 'Escape' && !hasModifier) {
        if (onClearSelection) {
          e.preventDefault();
          onClearSelection();
          return;
        }
      }

      // --- Arrow Keys: Selection Navigation ---
      if (!hasModifier) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          if (onSelectPrevious) {
            e.preventDefault();
            onSelectPrevious();
          }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          if (onSelectNext) {
            e.preventDefault();
            onSelectNext();
          }
        }
      }
    },
    [
      isEnabled,
      selectedItem,
      selectedTargets,
      onOpenItem,
      onRenameItem,
      onDeleteItem,
      onDeleteMultiple,
      onSelectPrevious,
      onSelectNext,
      onClearSelection,
      onTogglePreviewPane,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
