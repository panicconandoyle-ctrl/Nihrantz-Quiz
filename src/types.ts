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
  gitHubUrl?: string;
  syncStatus?: 'synced' | 'pending_sync' | 'local_only';
  syncError?: string;
}

export interface FolderNode {
  id: string;
  name: string;
  path: string;
  folders: FolderNode[];
  quizzes: QuizItem[];
  gitHubUrl?: string;
  syncStatus?: 'synced' | 'pending_sync';
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

export interface DeleteItemTarget {
  type: 'quiz' | 'folder';
  id: string;
  name: string;
  path: string;
  sha?: string;
  quizCount?: number;
  category?: string;
  size?: string;
}

export interface CreatorSupportConfig {
  holderName: string;
  accountNumber: string;
  bankName: string;
  swiftCode: string;
  currency: string;
  message?: string;
  customQrImageUrl?: string;
  githubQrPath?: string;
  githubCommitUrl?: string;
}
