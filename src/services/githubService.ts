/**
 * GitHub REST API Service
 * Handles direct repository querying, Git Tree recursive auto-discovery,
 * and direct file commits using GitHub Personal Access Tokens (PAT).
 */

import { FolderNode, QuizItem } from '../types';

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

const STORAGE_KEYS = {
  OWNER: 'gh_owner',
  REPO: 'gh_repo',
  BRANCH: 'gh_branch',
  TOKEN: 'gh_token',
};

// Default fallback repository if none is configured
export const DEFAULT_GH_CONFIG: GitHubConfig = {
  owner: 'panicconandoyle-ctrl',
  repo: 'Nihrantz-Quiz-Explorer',
  branch: 'main',
  token: '',
};

export function getStoredGithubConfig(): GitHubConfig {
  try {
    const storedOwner = localStorage.getItem(STORAGE_KEYS.OWNER);
    const storedRepo = localStorage.getItem(STORAGE_KEYS.REPO);

    // If unset or matching legacy dummy values, migrate to official repo
    const owner = (storedOwner && storedOwner !== 'google-ai-studio' && storedOwner !== 'Nihrantz')
      ? storedOwner
      : DEFAULT_GH_CONFIG.owner;

    const repo = (storedRepo && storedRepo !== 'winquiz-portal')
      ? storedRepo
      : DEFAULT_GH_CONFIG.repo;

    return {
      owner,
      repo,
      branch: localStorage.getItem(STORAGE_KEYS.BRANCH) || DEFAULT_GH_CONFIG.branch,
      token: localStorage.getItem(STORAGE_KEYS.TOKEN) || '',
    };
  } catch (e) {
    return { ...DEFAULT_GH_CONFIG };
  }
}

export function saveGithubConfig(config: GitHubConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.OWNER, config.owner.trim());
    localStorage.setItem(STORAGE_KEYS.REPO, config.repo.trim());
    localStorage.setItem(STORAGE_KEYS.BRANCH, config.branch.trim() || 'main');
    if (config.token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, config.token.trim());
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
    }
  } catch (e) {}
}

export function clearGithubConfig(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.OWNER);
    localStorage.removeItem(STORAGE_KEYS.REPO);
    localStorage.removeItem(STORAGE_KEYS.BRANCH);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  } catch (e) {}
}

export function hasAdminToken(): boolean {
  try {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    return !!token && token.trim().length > 0;
  } catch (e) {
    return false;
  }
}

/**
 * UTF-8 safe Base64 encoder for GitHub REST API Content parameter
 */
export function utf8ToBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Base64 to UTF-8 decoder
 */
export function base64ToUtf8(str: string): string {
  return decodeURIComponent(escape(atob(str)));
}

/**
 * Commit a file directly to GitHub repository using REST API PUT
 * PUT https://api.github.com/repos/{owner}/{repo}/contents/{path}
 */
export async function commitFileToGitHub(
  folderPath: string,
  filename: string,
  content: string,
  commitMessage: string,
  config?: GitHubConfig
): Promise<{ success: boolean; commitUrl?: string; error?: string; sha?: string }> {
  const cfg = config || getStoredGithubConfig();

  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to commit files to GitHub.' };
  }

  // Sanitize path
  const cleanFolder = folderPath.replace(/^\/+|\/+$/g, '');
  const cleanFilename = filename.replace(/^\/+|\/+$/g, '');
  const fullPath = cleanFolder ? `${cleanFolder}/${cleanFilename}` : cleanFilename;

  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${fullPath}`;
  const base64Content = utf8ToBase64(content);

  // Check if file already exists to get its SHA (required by GitHub for updates)
  let existingSha: string | undefined = undefined;
  try {
    const checkRes = await fetch(`${url}?ref=${cfg.branch || 'main'}`, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (checkRes.ok) {
      const existingData = await checkRes.json();
      existingSha = existingData.sha;
    }
  } catch (e) {
    // File might not exist yet, which is expected for new uploads
  }

  const payload: Record<string, unknown> = {
    message: commitMessage || `Add ${cleanFilename} quiz via Nihrantz Quiz Explorer`,
    content: base64Content,
    branch: cfg.branch || 'main',
  };

  if (existingSha) {
    payload.sha = existingSha;
  }

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || `GitHub API returned status ${res.status}`,
      };
    }

    return {
      success: true,
      commitUrl: data.commit?.html_url || data.content?.html_url,
      sha: data.content?.sha,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during GitHub upload';
    return { success: false, error: msg };
  }
}

/**
 * Create a folder permanently on GitHub by committing a .gitkeep file
 * PUT https://api.github.com/repos/{owner}/{repo}/contents/{parentPath}/{folderName}/.gitkeep
 */
export async function createFolderOnGitHub(
  parentPath: string,
  folderName: string,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string; commitUrl?: string }> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to create permanent folders on GitHub.' };
  }

  const cleanParent = parentPath.replace(/^\/+|\/+$/g, '');
  const cleanName = folderName.replace(/^\/+|\/+$/g, '');
  const folderPath = cleanParent ? `${cleanParent}/${cleanName}` : cleanName;

  const content = `# Directory created by Nihrantz Quiz Explorer\n`;
  return await commitFileToGitHub(
    folderPath,
    '.gitkeep',
    content,
    `Create folder ${folderPath} via Nihrantz Quiz Explorer`,
    cfg
  );
}

/**
 * Delete a file directly from GitHub repository using REST API DELETE
 * DELETE https://api.github.com/repos/{owner}/{repo}/contents/{path}
 */
export async function deleteFileFromGitHub(
  filePath: string,
  sha?: string,
  commitMessage?: string,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string }> {
  const cfg = config || getStoredGithubConfig();

  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to delete files from GitHub.' };
  }

  const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cleanPath}`;

  // Step 1: Retrieve file SHA if not provided
  let targetSha: string | undefined = sha;
  if (!targetSha) {
    try {
      const checkRes = await fetch(`${url}?ref=${cfg.branch || 'main'}`, {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (checkRes.ok) {
        const existingData = await checkRes.json();
        targetSha = existingData.sha;
      } else {
        const errData = await checkRes.json().catch(() => ({}));
        return { success: false, error: errData.message || `File not found on GitHub (${checkRes.status})` };
      }
    } catch (e) {
      return { success: false, error: 'Could not fetch file details from GitHub.' };
    }
  }

  if (!targetSha) {
    return { success: false, error: 'Unable to retrieve file SHA from GitHub.' };
  }

  // Step 2: Send DELETE request with sha
  try {
    const delRes = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: commitMessage || `Delete ${cleanPath} via Nihrantz Quiz Explorer`,
        sha: targetSha,
        branch: cfg.branch || 'main',
      }),
    });

    if (!delRes.ok) {
      const delData = await delRes.json().catch(() => ({}));
      return { success: false, error: delData.message || `GitHub returned HTTP ${delRes.status}` };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during GitHub file deletion';
    return { success: false, error: msg };
  }
}

/**
 * Delete an entire folder and all contained files permanently from GitHub
 */
export async function deleteFolderFromGitHub(
  folderPath: string,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string; deletedCount?: number }> {
  const cfg = config || getStoredGithubConfig();

  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to delete folders from GitHub.' };
  }

  const cleanPath = folderPath.replace(/^\/+|\/+$/g, '');

  try {
    // 1. Get git tree to locate all files under this folder
    const treeRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${cfg.branch || 'main'}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    let filesToDelete: { path: string; sha: string }[] = [];

    if (treeRes.ok) {
      const data = await treeRes.json();
      if (data.tree && Array.isArray(data.tree)) {
        filesToDelete = data.tree.filter((entry: GitTreeEntry) =>
          entry.type === 'blob' && (entry.path === cleanPath || entry.path.startsWith(`${cleanPath}/`))
        );
      }
    } else {
      // Fallback: Check contents API
      const contentsRes = await fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cleanPath}?ref=${cfg.branch || 'main'}`,
        {
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      if (contentsRes.ok) {
        const contents = await contentsRes.json();
        if (Array.isArray(contents)) {
          filesToDelete = contents.map((item) => ({ path: item.path, sha: item.sha }));
        }
      }
    }

    if (filesToDelete.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    // 2. Delete each file in the folder
    for (const file of filesToDelete) {
      const delRes = await fetch(
        `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${file.path}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${cfg.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Delete ${file.path} via Nihrantz Quiz Explorer`,
            sha: file.sha,
            branch: cfg.branch || 'main',
          }),
        }
      );
      if (!delRes.ok) {
        const errData = await delRes.json().catch(() => ({}));
        return { success: false, error: errData.message || `Failed to delete ${file.path}` };
      }
    }

    return { success: true, deletedCount: filesToDelete.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error deleting folder from GitHub';
    return { success: false, error: msg };
  }
}

/**
 * Fetch raw HTML content directly from GitHub or raw URL
 */
export async function fetchQuizRawHtml(quiz: QuizItem, config?: GitHubConfig): Promise<string> {
  const cfg = config || getStoredGithubConfig();

  // Try raw URL first if provided
  const candidateUrls: string[] = [];
  if (quiz.rawUrl) {
    candidateUrls.push(quiz.rawUrl);
  }
  const cleanPath = quiz.path.replace(/^\/+/, '');
  candidateUrls.push(`https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch || 'main'}/${cleanPath}`);
  candidateUrls.push(`/${cleanPath}`);

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 0) {
          return text;
        }
      }
    } catch (e) {}
  }

  // Fallback to htmlContent if embedded
  if (quiz.htmlContent) {
    return quiz.htmlContent;
  }

  throw new Error(`Could not load quiz content from GitHub for ${quiz.path}`);
}

/**
 * Tests connection to repository using provided credentials
 */
export async function testGitHubConnection(config: GitHubConfig): Promise<{ valid: boolean; message: string; permissions?: string }> {
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
      headers,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { valid: false, message: data.message || `Repository check failed: HTTP ${res.status}` };
    }

    const repoData = await res.json();
    const canPush = repoData.permissions?.push || (config.token ? true : false);

    return {
      valid: true,
      message: `Connected to ${repoData.full_name} (${repoData.visibility || 'public'})`,
      permissions: canPush ? 'Read & Write (Commit Authorized)' : 'Read-Only (Public)',
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Connection failed';
    return { valid: false, message: msg };
  }
}

/**
 * Fetch repository contents from GitHub via REST API
 * Uses Git Trees API or Contents API to dynamically build directory tree
 */
export async function fetchGitHubQuizTree(config?: GitHubConfig): Promise<{ success: boolean; rootFolder?: FolderNode; error?: string }> {
  const cfg = config || getStoredGithubConfig();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (cfg.token) {
    headers.Authorization = `Bearer ${cfg.token}`;
  }

  try {
    // Attempt fast Git Tree recursive API first (1 single HTTP request for entire tree)
    const treeUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${cfg.branch || 'main'}?recursive=1`;
    const res = await fetch(treeUrl, { headers });

    if (res.ok) {
      const data = await res.json();
      if (data.tree && Array.isArray(data.tree)) {
        return { success: true, rootFolder: buildTreeFromGitTreeEntries(data.tree, cfg) };
      }
    }

    // Fallback to Contents API: GET /repos/{owner}/{repo}/contents/quizzes
    const contentsUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/quizzes?ref=${cfg.branch || 'main'}`;
    const contentsRes = await fetch(contentsUrl, { headers });

    if (!contentsRes.ok) {
      const errData = await contentsRes.json().catch(() => ({}));
      return { success: false, error: errData.message || `GitHub returned HTTP ${contentsRes.status}` };
    }

    const contents = await contentsRes.json();
    if (!Array.isArray(contents)) {
      return { success: false, error: 'Contents API returned unexpected response' };
    }

    const root: FolderNode = {
      id: 'root-quizzes',
      name: 'quizzes',
      path: 'quizzes',
      folders: [],
      quizzes: [],
    };

    // Process top-level items and subfolders
    for (const item of contents) {
      if (item.type === 'dir') {
        const subfolderNode: FolderNode = {
          id: item.name,
          name: item.name,
          path: `quizzes/${item.name}`,
          folders: [],
          quizzes: [],
        };
        root.folders.push(subfolderNode);

        // Fetch subfolder contents
        try {
          const subRes = await fetch(
            `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/quizzes/${item.name}?ref=${cfg.branch || 'main'}`,
            { headers }
          );
          if (subRes.ok) {
            const subContents = await subRes.json();
            if (Array.isArray(subContents)) {
              for (const subItem of subContents) {
                if (subItem.name.endsWith('.html')) {
                  const cleanTitle = subItem.name.replace('.html', '').replace(/_/g, ' ');
                  subfolderNode.quizzes.push({
                    id: subItem.sha || subItem.name,
                    title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
                    filename: subItem.name,
                    path: subItem.path || `quizzes/${item.name}/${subItem.name}`,
                    category: item.name.charAt(0).toUpperCase() + item.name.slice(1).replace(/_/g, ' '),
                    questionCount: 5,
                    estimatedMinutes: 4,
                    difficulty: 'Intermediate',
                    tags: ['github', item.name.toLowerCase()],
                    dateModified: new Date().toISOString().split('T')[0],
                    size: `${((subItem.size || 4096) / 1024).toFixed(1)} KB`,
                    author: cfg.owner,
                    rawUrl: subItem.download_url || `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch || 'main'}/${subItem.path}`,
                    sha: subItem.sha,
                  });
                }
              }
            }
          }
        } catch (e) {}
      } else if (item.name.endsWith('.html')) {
        const cleanTitle = item.name.replace('.html', '').replace(/_/g, ' ');
        root.quizzes.push({
          id: item.sha || item.name,
          title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
          filename: item.name,
          path: item.path || `quizzes/${item.name}`,
          category: 'General',
          questionCount: 5,
          estimatedMinutes: 4,
          difficulty: 'Intermediate',
          tags: ['github', 'live'],
          dateModified: new Date().toISOString().split('T')[0],
          size: `${((item.size || 4096) / 1024).toFixed(1)} KB`,
          author: cfg.owner,
          rawUrl: item.download_url || `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch || 'main'}/${item.path}`,
          sha: item.sha,
        });
      }
    }

    return { success: true, rootFolder: root };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown network failure';
    return { success: false, error: msg };
  }
}

interface GitTreeEntry {
  path: string;
  mode: string;
  type: 'tree' | 'blob';
  sha: string;
  size?: number;
  url: string;
}

function buildTreeFromGitTreeEntries(entries: GitTreeEntry[], cfg: GitHubConfig): FolderNode {
  const root: FolderNode = {
    id: 'root-quizzes',
    name: 'quizzes',
    path: 'quizzes',
    folders: [],
    quizzes: [],
  };

  // Filter entries under quizzes/
  const quizEntries = entries.filter((e) => e.path.startsWith('quizzes/') || e.path === 'quizzes');

  for (const entry of quizEntries) {
    if (entry.path === 'quizzes') continue;
    const parts = entry.path.split('/'); // e.g. ["quizzes", "science", "cell_biology.html"]

    if (entry.type === 'tree') {
      // It's a folder
      ensureFolderExists(root, parts.slice(1));
    } else if (entry.type === 'blob' && entry.path.endsWith('.gitkeep')) {
      // Directory preserved via .gitkeep
      const folderParts = parts.slice(1, -1);
      ensureFolderExists(root, folderParts);
    } else if (entry.type === 'blob' && entry.path.endsWith('.html')) {
      // It's an HTML quiz file
      const folderParts = parts.slice(1, -1);
      const filename = parts[parts.length - 1];
      const targetFolder = ensureFolderExists(root, folderParts);

      const categoryName = folderParts.length > 0 
        ? folderParts[0].charAt(0).toUpperCase() + folderParts[0].slice(1).replace(/_/g, ' ')
        : 'General';
      const cleanTitle = filename.replace('.html', '').replace(/_/g, ' ');

      targetFolder.quizzes = targetFolder.quizzes || [];
      targetFolder.quizzes.push({
        id: entry.sha || filename,
        title: cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1),
        filename,
        path: entry.path,
        category: categoryName,
        questionCount: 5,
        estimatedMinutes: 4,
        difficulty: 'Intermediate',
        tags: ['github', categoryName.toLowerCase()],
        dateModified: new Date().toISOString().split('T')[0],
        size: entry.size ? `${(entry.size / 1024).toFixed(1)} KB` : '4.5 KB',
        author: cfg.owner,
        rawUrl: `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch || 'main'}/${entry.path}`,
        sha: entry.sha,
      });
    }
  }

  return root;
}

function ensureFolderExists(root: FolderNode, parts: string[]): FolderNode {
  let curr = root;
  let cumulative = root.path;

  for (const part of parts) {
    cumulative += `/${part}`;
    curr.folders = curr.folders || [];
    let found = curr.folders.find((f) => f.name === part);
    if (!found) {
      found = {
        id: part,
        name: part,
        path: cumulative,
        folders: [],
        quizzes: [],
      };
      curr.folders.push(found);
    }
    curr = found;
  }

  return curr;
}
