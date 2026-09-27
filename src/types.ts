export interface QuizItem {
  id: string;
  title: string;
  filename: string;
  path: string;
  category: string;
  topic?: string;
  questionCount: number;
  estimatedMinutes: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  dateModified: string;
  size?: string;
  author?: string;
  description?: string;
  htmlContent?: string;
  blobUrl?: string;
  isUploaded?: boolean;
  rawUrl?: string;
  sha?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  folders: FolderNode[];
  quizzes: QuizItem[];
}

export interface QuizManifest {
  name: string;
  version: string;
  lastUpdated: string;
  folders: FolderNode[];
}

export type ViewMode = 'grid' | 'details' | 'compact';

export type SortField = 'name' | 'category' | 'questions' | 'time' | 'difficulty' | 'date';
export type SortDirection = 'asc' | 'desc';

export interface QuizScoreRecord {
  quizId: string;
  score: number;
  total: number;
  percentage: number;
  timestamp: number;
}
