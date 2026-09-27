import { QuizManifest, FolderNode, QuizItem } from '../types';

export const defaultManifest: QuizManifest = {
  name: "Interactive HTML Quizzes Repository",
  version: "1.2.0",
  lastUpdated: "2026-09-27",
  folders: [
    {
      id: "root-quizzes",
      name: "quizzes",
      path: "quizzes",
      folders: [
        {
          id: "science",
          name: "science",
          path: "quizzes/science",
          folders: [],
          quizzes: [
            {
              id: "cell-biology",
              title: "Cell Biology & Cytology",
              filename: "cell_biology.html",
              path: "quizzes/science/cell_biology.html",
              category: "Science",
              topic: "Biology",
              questionCount: 5,
              estimatedMinutes: 4,
              difficulty: "Intermediate",
              tags: ["biology", "cells", "mitosis", "organelles"],
              dateModified: "2026-09-20",
              size: "6.8 KB",
              description: "Explore fundamental cellular organelles, mitosis mechanics, and molecular respiration."
            }
          ]
        },
        {
          id: "history",
          name: "history",
          path: "quizzes/history",
          folders: [],
          quizzes: [
            {
              id: "modern-history",
              title: "Modern World History",
              filename: "modern_history.html",
              path: "quizzes/history/modern_history.html",
              category: "History",
              topic: "20th Century",
              questionCount: 4,
              estimatedMinutes: 3,
              difficulty: "Beginner",
              tags: ["history", "cold-war", "ww1", "ww2"],
              dateModified: "2026-09-18",
              size: "5.4 KB",
              description: "Major turning points from the Treaty of Versailles to the fall of the Berlin Wall."
            }
          ]
        },
        {
          id: "computer-science",
          name: "computer_science",
          path: "quizzes/computer_science",
          folders: [],
          quizzes: [
            {
              id: "algorithms",
              title: "Data Structures & Algorithms",
              filename: "algorithms.html",
              path: "quizzes/computer_science/algorithms.html",
              category: "Computer Science",
              topic: "Algorithms",
              questionCount: 4,
              estimatedMinutes: 5,
              difficulty: "Advanced",
              tags: ["cs", "sorting", "complexity", "trees"],
              dateModified: "2026-09-22",
              size: "6.1 KB",
              description: "Asymptotic notation, BFS traversals, QuickSort, and balanced tree invariants."
            }
          ]
        },
        {
          id: "geography",
          name: "geography",
          path: "quizzes/geography",
          folders: [],
          quizzes: [
            {
              id: "world-capitals",
              title: "World Capitals & Nations",
              filename: "world_capitals.html",
              path: "quizzes/geography/world_capitals.html",
              category: "Geography",
              topic: "World Capitals",
              questionCount: 4,
              estimatedMinutes: 3,
              difficulty: "Beginner",
              tags: ["geography", "capitals", "countries"],
              dateModified: "2026-09-15",
              size: "5.2 KB",
              description: "Test your geographic precision with national capitals across four continents."
            }
          ]
        }
      ],
      "quizzes": [
        {
          "id": "sample-quiz",
          "title": "Quick Trivia Challenge",
          "filename": "sample_quiz.html",
          "path": "quizzes/sample_quiz.html",
          "category": "General",
          "topic": "Trivia",
          "questionCount": 5,
          "estimatedMinutes": 3,
          "difficulty": "Beginner",
          "tags": ["trivia", "general", "science", "astronomy"],
          "dateModified": "2026-09-25",
          "size": "7.5 KB",
          "description": "Multi-disciplinary speed run testing general knowledge, science, and history."
        }
      ]
    }
  ]
};

export function getAllQuizzes(root: FolderNode): QuizItem[] {
  const result: QuizItem[] = [...(root.quizzes || [])];
  if (root.folders) {
    for (const folder of root.folders) {
      result.push(...getAllQuizzes(folder));
    }
  }
  return result;
}

export function findFolderByPath(root: FolderNode, targetPath: string): FolderNode | null {
  const cleanTarget = targetPath.replace(/^\/+|\/+$/g, '');
  const cleanRoot = root.path.replace(/^\/+|\/+$/g, '');
  if (cleanTarget === cleanRoot) return root;

  if (root.folders) {
    for (const folder of root.folders) {
      const found = findFolderByPath(folder, cleanTarget);
      if (found) return found;
    }
  }
  return null;
}

export function countFolderQuizzes(folder: FolderNode): number {
  let count = (folder.quizzes || []).length;
  if (folder.folders) {
    for (const sub of folder.folders) {
      count += countFolderQuizzes(sub);
    }
  }
  return count;
}
