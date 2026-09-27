/**
 * GitHub REST API Service
 * Handles direct repository querying, Git Tree recursive auto-discovery,
 * and direct file commits using GitHub Personal Access Tokens (PAT).
 */

import { FolderNode, QuizItem, DeleteItemTarget } from '../types';

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
  repo: 'Nihrantz-Quiz',
  branch: 'main',
  token: '',
};

export function getStoredGithubConfig(): GitHubConfig {
  try {
    const storedOwner = localStorage.getItem(STORAGE_KEYS.OWNER);
    const storedRepo = localStorage.getItem(STORAGE_KEYS.REPO);

    // If unset or matching legacy dummy values or previous repo, migrate to official new repo
    const owner = (storedOwner && storedOwner !== 'google-ai-studio' && storedOwner !== 'Nihrantz')
      ? storedOwner
      : DEFAULT_GH_CONFIG.owner;

    const repo = (storedRepo && storedRepo !== 'winquiz-portal' && storedRepo !== 'Nihrantz-Quiz-Explorer')
      ? storedRepo
      : DEFAULT_GH_CONFIG.repo;

    // Keep localStorage in sync if previously had old repo or old owner
    if (storedRepo === 'Nihrantz-Quiz-Explorer' || storedRepo === 'winquiz-portal') {
      localStorage.setItem(STORAGE_KEYS.REPO, DEFAULT_GH_CONFIG.repo);
    }
    if (storedOwner === 'google-ai-studio' || storedOwner === 'Nihrantz') {
      localStorage.setItem(STORAGE_KEYS.OWNER, DEFAULT_GH_CONFIG.owner);
    }

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
 * Batch delete multiple files and/or folders permanently from GitHub
 */
export async function batchDeleteFromGitHub(
  items: DeleteItemTarget[],
  config?: GitHubConfig,
  onProgress?: (
    index: number,
    total: number,
    item: DeleteItemTarget,
    status: 'deleting' | 'success' | 'error',
    errorMsg?: string
  ) => void
): Promise<{
  success: boolean;
  deletedCount: number;
  errors: { item: DeleteItemTarget; error: string }[];
}> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return {
      success: false,
      deletedCount: 0,
      errors: items.map((item) => ({ item, error: 'GitHub Personal Access Token is required.' })),
    };
  }

  let deletedCount = 0;
  const errors: { item: DeleteItemTarget; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(i + 1, items.length, item, 'deleting');

    try {
      if (item.type === 'quiz') {
        const res = await deleteFileFromGitHub(item.path, item.sha, undefined, cfg);
        if (res.success) {
          deletedCount++;
          onProgress?.(i + 1, items.length, item, 'success');
        } else {
          errors.push({ item, error: res.error || 'Failed to delete file' });
          onProgress?.(i + 1, items.length, item, 'error', res.error);
        }
      } else {
        const res = await deleteFolderFromGitHub(item.path, cfg);
        if (res.success) {
          deletedCount++;
          onProgress?.(i + 1, items.length, item, 'success');
        } else {
          errors.push({ item, error: res.error || 'Failed to delete folder' });
          onProgress?.(i + 1, items.length, item, 'error', res.error);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown deletion error';
      errors.push({ item, error: msg });
      onProgress?.(i + 1, items.length, item, 'error', msg);
    }
  }

  return {
    success: errors.length === 0,
    deletedCount,
    errors,
  };
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
 * Move a quiz file on GitHub (commits to destination path, deletes from source path)
 */
export async function moveQuizOnGitHub(
  quiz: QuizItem,
  targetFolderPath: string,
  config?: GitHubConfig
): Promise<{ success: boolean; newPath?: string; error?: string }> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to move files on GitHub.' };
  }

  // 1. Fetch content of quiz
  let content = quiz.htmlContent;
  if (!content) {
    try {
      content = await fetchQuizRawHtml(quiz, cfg);
    } catch (e) {
      return { success: false, error: `Could not retrieve quiz content for ${quiz.filename}` };
    }
  }

  const cleanDest = targetFolderPath.replace(/^\/+|\/+$/g, '');
  const newPath = cleanDest ? `${cleanDest}/${quiz.filename}` : quiz.filename;

  if (newPath === quiz.path) {
    return { success: true, newPath };
  }

  // 2. Commit file to new location
  const commitRes = await commitFileToGitHub(
    cleanDest,
    quiz.filename,
    content,
    `Move ${quiz.filename} to ${cleanDest} via Nihrantz Quiz Explorer`,
    cfg
  );

  if (!commitRes.success) {
    return { success: false, error: `Failed to write file to new location: ${commitRes.error}` };
  }

  // 3. Delete file from old location
  const delRes = await deleteFileFromGitHub(
    quiz.path,
    quiz.sha,
    `Remove old location after moving ${quiz.filename} to ${cleanDest}`,
    cfg
  );

  if (!delRes.success) {
    console.warn(`File created at ${newPath} but old file delete reported:`, delRes.error);
  }

  return { success: true, newPath };
}

/**
 * Move an entire folder and all its contents on GitHub
 */
export async function moveFolderOnGitHub(
  sourceFolderPath: string,
  targetParentPath: string,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string; movedCount?: number }> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to move folders on GitHub.' };
  }

  const cleanSource = sourceFolderPath.replace(/^\/+|\/+$/g, '');
  const cleanTargetParent = targetParentPath.replace(/^\/+|\/+$/g, '');
  const folderName = cleanSource.split('/').pop() || 'folder';
  const newFolderPath = cleanTargetParent ? `${cleanTargetParent}/${folderName}` : folderName;

  if (cleanSource === newFolderPath) {
    return { success: true, movedCount: 0 };
  }

  try {
    // 1. Get git tree to locate all files under source folder
    const treeRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${cfg.branch || 'main'}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!treeRes.ok) {
      return { success: false, error: 'Failed to query git tree from GitHub.' };
    }

    const data = await treeRes.json();
    const allEntries: GitTreeEntry[] = data.tree || [];
    const sourceFiles = allEntries.filter((e) =>
      e.type === 'blob' && (e.path === cleanSource || e.path.startsWith(`${cleanSource}/`))
    );

    if (sourceFiles.length === 0) {
      // Create .gitkeep in new folder location
      await commitFileToGitHub(
        newFolderPath,
        '.gitkeep',
        `# Moved directory\n`,
        `Move directory ${cleanSource} to ${newFolderPath}`,
        cfg
      );
      return { success: true, movedCount: 0 };
    }

    // 2. For each file, fetch content, commit to new destination, and delete from old
    let count = 0;
    for (const file of sourceFiles) {
      // Relative path within source folder
      const relPath = file.path.substring(cleanSource.length).replace(/^\/+/, '');
      const newFilePath = relPath ? `${newFolderPath}/${relPath}` : newFolderPath;
      const newFileFolder = newFilePath.split('/').slice(0, -1).join('/') || 'quizzes';
      const newFileName = newFilePath.split('/').pop() || 'file';

      // Fetch blob content
      const blobRes = await fetch(file.url, {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github.v3.raw',
        },
      });

      if (!blobRes.ok) continue;
      const fileContent = await blobRes.text();

      // Commit to new path
      await commitFileToGitHub(
        newFileFolder,
        newFileName,
        fileContent,
        `Move ${file.path} to ${newFilePath}`,
        cfg
      );

      // Delete from old path
      await deleteFileFromGitHub(
        file.path,
        file.sha,
        `Delete old path ${file.path}`,
        cfg
      );

      count++;
    }

    return { success: true, movedCount: count };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error moving folder on GitHub';
    return { success: false, error: msg };
  }
}

/**
 * Rename a quiz file and optionally update its title on GitHub
 */
export async function renameQuizOnGitHub(
  quiz: QuizItem,
  newFilename: string,
  newTitle?: string,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string; newPath?: string }> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to rename quizzes.' };
  }

  // Ensure .html extension
  let cleanFilename = newFilename.trim();
  if (!cleanFilename.toLowerCase().endsWith('.html')) {
    cleanFilename += '.html';
  }

  const pathParts = quiz.path.split('/');
  pathParts.pop(); // remove old filename
  const parentFolder = pathParts.join('/');
  const newPath = parentFolder ? `${parentFolder}/${cleanFilename}` : cleanFilename;

  // 1. Fetch current content
  let content = await fetchQuizRawHtml(quiz, cfg);
  if (!content) {
    return { success: false, error: 'Failed to read quiz HTML content before renaming.' };
  }

  // If newTitle provided and differs from old title, update <title> tag in HTML
  if (newTitle && newTitle.trim() && newTitle.trim() !== quiz.title) {
    const trimmedTitle = newTitle.trim();
    if (content.includes('<title>')) {
      content = content.replace(/<title>[\s\S]*?<\/title>/i, `<title>${trimmedTitle}</title>`);
    } else if (content.includes('<head>')) {
      content = content.replace(/<head>/i, `<head>\n  <title>${trimmedTitle}</title>`);
    }
  }

  if (newPath === quiz.path) {
    // Just updating the title/content in place
    const updateRes = await commitFileToGitHub(
      parentFolder,
      cleanFilename,
      content,
      `Update title of ${cleanFilename} to "${newTitle}" via Nihrantz Quiz Explorer`,
      cfg
    );
    return { success: updateRes.success, error: updateRes.error, newPath };
  }

  // 2. Commit file with new name
  const commitRes = await commitFileToGitHub(
    parentFolder,
    cleanFilename,
    content,
    `Rename ${quiz.filename} to ${cleanFilename} via Nihrantz Quiz Explorer`,
    cfg
  );

  if (!commitRes.success) {
    return { success: false, error: `Failed to commit renamed file: ${commitRes.error}` };
  }

  // 3. Delete old file
  const delRes = await deleteFileFromGitHub(
    quiz.path,
    quiz.sha,
    `Remove old file after renaming to ${cleanFilename}`,
    cfg
  );

  if (!delRes.success) {
    console.warn(`File created at ${newPath} but old file delete reported:`, delRes.error);
  }

  return { success: true, newPath };
}

/**
 * Rename a folder and all its contents on GitHub
 */
export async function renameFolderOnGitHub(
  folderPath: string,
  newFolderName: string,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string; newFolderPath?: string; movedCount?: number }> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return { success: false, error: 'GitHub Personal Access Token is required to rename folders.' };
  }

  const cleanSource = folderPath.replace(/^\/+|\/+$/g, '');
  const pathParts = cleanSource.split('/');
  pathParts.pop(); // remove old folder name
  const parentPath = pathParts.join('/');
  const cleanNewName = newFolderName.trim().replace(/^\/+|\/+$/g, '').replace(/[\/\\]/g, '_');
  const newFolderPath = parentPath ? `${parentPath}/${cleanNewName}` : cleanNewName;

  if (cleanSource === newFolderPath) {
    return { success: true, newFolderPath, movedCount: 0 };
  }

  try {
    // 1. Get git tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/git/trees/${cfg.branch || 'main'}?recursive=1`,
      {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!treeRes.ok) {
      return { success: false, error: 'Failed to query git tree from GitHub.' };
    }

    const data = await treeRes.json();
    const allEntries: GitTreeEntry[] = data.tree || [];
    const sourceFiles = allEntries.filter((e) =>
      e.type === 'blob' && (e.path === cleanSource || e.path.startsWith(`${cleanSource}/`))
    );

    if (sourceFiles.length === 0) {
      // Create .gitkeep in new folder location
      await commitFileToGitHub(
        newFolderPath,
        '.gitkeep',
        `# Renamed directory\n`,
        `Rename directory ${cleanSource} to ${newFolderPath}`,
        cfg
      );
      return { success: true, newFolderPath, movedCount: 0 };
    }

    let movedCount = 0;
    for (const file of sourceFiles) {
      const relativePart = file.path.slice(cleanSource.length).replace(/^\//, '');
      const targetFilePath = relativePart ? `${newFolderPath}/${relativePart}` : newFolderPath;
      const targetFileDir = targetFilePath.includes('/') ? targetFilePath.substring(0, targetFilePath.lastIndexOf('/')) : '';
      const targetFileName = targetFilePath.split('/').pop() || 'file';

      const rawRes = await fetch(
        `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch || 'main'}/${file.path}`,
        {
          headers: {
            Authorization: `Bearer ${cfg.token}`,
          },
        }
      );
      if (!rawRes.ok) continue;
      const content = await rawRes.text();

      const commitRes = await commitFileToGitHub(
        targetFileDir,
        targetFileName,
        content,
        `Rename folder ${cleanSource} to ${newFolderPath}: write ${targetFilePath}`,
        cfg
      );

      if (commitRes.success) {
        await deleteFileFromGitHub(file.path, file.sha, `Remove old path ${file.path} after folder rename`, cfg);
        movedCount++;
      }
    }

    return { success: true, newFolderPath, movedCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error renaming folder on GitHub';
    return { success: false, error: msg };
  }
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
        : filename.includes('immunology') || filename.includes('Untitled-1')
        ? 'Immunology'
        : 'General';

      let cleanTitle = filename.replace('.html', '').replace(/_/g, ' ');
      if (filename === 'Untitled-1.html') {
        cleanTitle = 'Clinical Assessment - Immunology Ch. 4';
      } else if (filename === 'immunology_ch5_t_cell_mediated_immunity_quiz.html') {
        cleanTitle = 'Immunology Ch. 5: T-Cell Mediated Immunity';
      } else {
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      }

      targetFolder.quizzes = targetFolder.quizzes || [];
      targetFolder.quizzes.push({
        id: entry.sha || filename,
        title: cleanTitle,
        filename,
        path: entry.path,
        category: categoryName,
        questionCount: filename.includes('immunology') || filename.includes('Untitled-1') ? 10 : 5,
        estimatedMinutes: filename.includes('immunology') || filename.includes('Untitled-1') ? 8 : 4,
        difficulty: filename.includes('immunology') || filename.includes('Untitled-1') ? 'Advanced' : 'Intermediate',
        tags: ['github', categoryName.toLowerCase(), 'synced'],
        dateModified: new Date().toISOString().split('T')[0],
        size: entry.size ? `${(entry.size / 1024).toFixed(1)} KB` : '4.5 KB',
        author: cfg.owner,
        rawUrl: `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch || 'main'}/${entry.path}`,
        gitHubUrl: `https://github.com/${cfg.owner}/${cfg.repo}/blob/${cfg.branch || 'main'}/${entry.path}`,
        sha: entry.sha,
        syncStatus: 'synced',
      });
    }
  }

  return root;
}

/**
 * Fetch the latest commit on the GitHub repository branch
 */
export async function fetchLatestGitHubCommit(config?: GitHubConfig): Promise<{
  sha: string;
  message: string;
  date: string;
  author: string;
} | null> {
  const cfg = config || getStoredGithubConfig();
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (cfg.token) {
      headers.Authorization = `Bearer ${cfg.token}`;
    }
    const res = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/commits/${cfg.branch || 'main'}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      sha: data.sha?.substring(0, 7) || '',
      message: data.commit?.message?.split('\n')[0] || '',
      date: data.commit?.author?.date || new Date().toISOString(),
      author: data.commit?.author?.name || data.author?.login || cfg.owner,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Synchronize a local quiz file directly to GitHub
 */
export async function syncLocalQuizToGitHub(
  quiz: QuizItem,
  config?: GitHubConfig
): Promise<{ success: boolean; error?: string; commitUrl?: string; sha?: string }> {
  const cfg = config || getStoredGithubConfig();
  if (!cfg.token) {
    return {
      success: false,
      error: 'GitHub Personal Access Token (PAT with repo scope) is required to push changes to GitHub.',
    };
  }

  // Obtain content
  let content = quiz.htmlContent;
  if (!content) {
    try {
      const candidatePaths = [
        `/${quiz.path}`,
        `/${quiz.filename}`,
        `/quizzes/${quiz.filename}`,
      ];
      for (const p of candidatePaths) {
        try {
          const res = await fetch(p);
          if (res.ok) {
            content = await res.text();
            if (content && content.trim().length > 0) break;
          }
        } catch (e) {}
      }
    } catch (e) {}
  }

  if (!content) {
    return {
      success: false,
      error: `Could not read local content for ${quiz.path} to sync to GitHub.`,
    };
  }

  const folderParts = quiz.path.split('/');
  folderParts.pop(); // remove filename
  const folderPath = folderParts.join('/') || 'quizzes';

  return await commitFileToGitHub(
    folderPath,
    quiz.filename,
    content,
    `Sync ${quiz.filename} to GitHub via Nihrantz Quiz Explorer`,
    cfg
  );
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
