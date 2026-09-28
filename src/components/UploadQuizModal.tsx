import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Code, 
  FolderPlus, 
  FileCode, 
  Eye, 
  Check, 
  AlertCircle, 
  Download, 
  Sparkles,
  Play,
  Github,
  GitCommit,
  RefreshCw,
  Key
} from 'lucide-react';
import { FolderNode, QuizItem } from '../types';
import { 
  commitFileToGitHub, 
  getStoredGithubConfig, 
  hasAdminToken 
} from '../services/githubService';
import { playNavSound, playSuccessChime } from '../utils/audio';

interface UploadQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  rootFolder: FolderNode;
  currentPath: string;
  onAddQuiz?: (targetFolderPath: string, newQuiz: QuizItem) => void;
  onGitHubCommitted?: () => void;
  onOpenAdminConfig?: () => void;
  initialFile?: { name: string; content: string } | null;
}

export const UploadQuizModal: React.FC<UploadQuizModalProps> = ({
  isOpen,
  onClose,
  rootFolder,
  currentPath,
  onAddQuiz,
  onGitHubCommitted,
  onOpenAdminConfig,
  initialFile,
}) => {
  const [tab, setTab] = useState<'upload' | 'code'>('upload');
  const [targetFolder, setTargetFolder] = useState<string>(currentPath || 'quizzes');
  const [newSubfolderName, setNewSubfolderName] = useState<string>('');
  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState<boolean>(false);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [filename, setFilename] = useState<string>('');
  const [category, setCategory] = useState<string>('Science');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(4);
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [description, setDescription] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');

  // GitHub commit state
  const [commitToGitHub, setCommitToGitHub] = useState<boolean>(() => hasAdminToken());
  const [commitMessage, setCommitMessage] = useState<string>('');
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ghConfig = getStoredGithubConfig();
  const isAdmin = hasAdminToken();

  // Collect all folder paths recursively
  const getAllFolderPaths = (node: FolderNode): string[] => {
    let paths = [node.path];
    if (node.folders) {
      for (const f of node.folders) {
        paths = paths.concat(getAllFolderPaths(f));
      }
    }
    return paths;
  };

  const folderPaths = getAllFolderPaths(rootFolder);

  useEffect(() => {
    if (currentPath && folderPaths.includes(currentPath)) {
      setTargetFolder(currentPath);
    } else {
      setTargetFolder('quizzes');
    }
    setCommitToGitHub(hasAdminToken());

    if (initialFile && isOpen) {
      setHtmlContent(initialFile.content);
      setFilename(initialFile.name);
      setCommitMessage(`Add ${initialFile.name} quiz via Nihrantz Quiz Explorer`);
      parseHtmlCode(initialFile.content, initialFile.name);
    }
  }, [currentPath, isOpen, initialFile]);

  // Clean up preview Blob URL
  useEffect(() => {
    if (previewUrl) {
      return () => {
        URL.revokeObjectURL(previewUrl);
      };
    }
  }, [previewUrl]);

  if (!isOpen) return null;

  // Auto-parse HTML when content changes
  const parseHtmlCode = (code: string, originalName?: string) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');

      // Extract title from <title> or <h1> or <h2>
      const extractedTitle = doc.querySelector('title')?.innerText || 
                             doc.querySelector('h1')?.innerText || 
                             doc.querySelector('h2')?.innerText;
      if (extractedTitle && !title) {
        setTitle(extractedTitle.trim());
      }

      // Infer questions count
      const optionButtons = doc.querySelectorAll('.option-btn, [class*="option"], [class*="answer"]');
      const questionNodes = doc.querySelectorAll('.question, [class*="question"], h3');
      if (questionNodes.length > 1) {
        setQuestionCount(questionNodes.length);
      } else if (optionButtons.length >= 4) {
        setQuestionCount(Math.max(1, Math.round(optionButtons.length / 4)));
      }

      // Infer filename
      let resolvedFilename = filename;
      if (originalName) {
        resolvedFilename = originalName.endsWith('.html') ? originalName : `${originalName}.html`;
        setFilename(resolvedFilename);
      } else if (!filename && extractedTitle) {
        const slug = extractedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        resolvedFilename = `${slug}.html`;
        setFilename(resolvedFilename);
      }

      setCommitMessage(`Add ${resolvedFilename || 'quiz'} via Nihrantz Quiz Explorer`);

      // Try inferring category from badge or text
      const badgeText = doc.querySelector('.badge, [class*="badge"], [class*="tag"]')?.textContent?.toLowerCase() || '';
      if (badgeText.includes('science') || badgeText.includes('bio') || badgeText.includes('chem')) setCategory('Science');
      else if (badgeText.includes('hist') || badgeText.includes('war')) setCategory('History');
      else if (badgeText.includes('cs') || badgeText.includes('algorithm') || badgeText.includes('code')) setCategory('Computer Science');
      else if (badgeText.includes('geo') || badgeText.includes('capital') || badgeText.includes('map')) setCategory('Geography');
    } catch (e) {
      // Non-critical parsing failure
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setErrorMessage('Please select a valid .html or .htm file.');
      return;
    }

    setErrorMessage(null);
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setHtmlContent(content);
      parseHtmlCode(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleTemplate = () => {
    playNavSound();
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Physics & Quantum Fundamentals</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 16px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 14px; padding: 24px; max-width: 580px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .mode-group { display: inline-flex; background: rgba(255,255,255,0.06); padding: 2px; border-radius: 6px; }
    .mode-btn { background: transparent; border: none; color: #94a3b8; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px; cursor: pointer; }
    .mode-btn.active { background: #3b82f6; color: white; }
    .timer-pill { font-family: monospace; font-size: 12px; font-weight: bold; background: rgba(59,130,246,0.15); border: 1px solid #3b82f6; color: #60a5fa; padding: 3px 8px; border-radius: 6px; display: none; }
    .drawer-btn { background: rgba(255,255,255,0.08); border: 1px solid #475569; color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; }
    .drawer { display: none; background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin-bottom: 14px; }
    .drawer.open { display: block; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(36px, 1fr)); gap: 6px; margin-top: 6px; }
    .grid-box { height: 32px; display: flex; align-items: center; justify-content: center; background: #1e293b; border: 1px solid #334155; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; position: relative; }
    .grid-box.active { border-color: #3b82f6; color: #60a5fa; }
    .grid-box.answered { background: rgba(59,130,246,0.2); border-color: #3b82f6; }
    .grid-box.flagged::after { content: '🚩'; position: absolute; top: -4px; right: -2px; font-size: 8px; }
    .q-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .flag-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #94a3b8; padding: 3px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
    .flag-btn.flagged { background: #f59e0b; color: #0f172a; font-weight: bold; }
    h2 { font-size: 18px; margin-bottom: 16px; line-height: 1.4; color: #fff; }
    .btn { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: #334155; color: white; border: 1px solid #475569; padding: 12px; margin: 8px 0; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 14px; }
    .btn:hover:not(:disabled) { background: #475569; }
    .btn.exam-selected { background: rgba(59,130,246,0.25) !important; border-color: #3b82f6 !important; }
    .btn.correct { background: #059669 !important; border-color: #34d399 !important; }
    .btn.incorrect { background: #dc2626 !important; border-color: #f87171 !important; }
    .feedback { margin-top: 14px; padding: 12px; border-radius: 8px; font-size: 13px; display: none; background: rgba(59,130,246,0.1); border-left: 3px solid #3b82f6; color: #93c5fd; }
    .nav { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .act-btn { background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; }
    .act-btn:hover { background: #2563eb; }
    .submit-exam-btn { background: #10b981; }
    .submit-exam-btn:hover { background: #059669; }
    .scorecard { display: none; text-align: center; padding: 10px 0; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%; border: 3px solid #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; margin: 0 auto 16px; }
    .drill-btn { background: #f59e0b; color: #0f172a; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; width: 100%; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div id="quiz-view">
      <div class="header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; text-transform: uppercase; color: #60a5fa; font-weight: bold;">Physics</span>
          <div class="mode-group">
            <button id="mode-p" class="mode-btn active" onclick="setMode('practice')">Practice</button>
            <button id="mode-e" class="mode-btn" onclick="setMode('exam')">Exam</button>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="timer-pill" id="timer-pill">⏱️ 04:00</span>
          <button class="drawer-btn" onclick="toggleDrawer()">List</button>
        </div>
      </div>
      <div class="drawer" id="drawer">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 4px;">Question Navigator: (🚩 = Flagged)</div>
        <div class="grid" id="grid"></div>
      </div>
      <div class="q-row">
        <span style="font-size: 12px; color: #94a3b8;" id="q-num">Question 1</span>
        <button class="flag-btn" id="flag-btn" onclick="toggleFlag()">🏳️ Flag</button>
      </div>
      <h2 id="q-title">Question Stem</h2>
      <div id="opts"></div>
      <div id="fb" class="feedback"></div>
      <div class="nav">
        <span id="score-text" style="font-size: 12px; color: #94a3b8;">Score: 0</span>
        <div style="display: flex; gap: 8px;">
          <button id="submit-exam-btn" class="act-btn submit-exam-btn" style="display: none;" onclick="submitExam()">Submit Exam</button>
          <button id="next-btn" class="act-btn" onclick="nextQuestion()">Next →</button>
        </div>
      </div>
    </div>
    <div id="result-view" class="scorecard">
      <div class="score-circle" id="final-pct">0%</div>
      <h3 style="margin-bottom: 6px;">Quiz Completed</h3>
      <p id="final-stats" style="font-size: 13px; color: #94a3b8;"></p>
      <button id="drill-btn" class="drill-btn" onclick="startTargetedDrill()">🎯 Review Missed &amp; Flagged Questions Only</button>
      <button class="act-btn" style="width: 100%; margin-top: 8px;" onclick="restart()">🔄 Retake Full Quiz</button>
    </div>
  </div>
  <script>
    const questions = [
      { q: "What is the speed of light in a vacuum?", opts: ["~300,000 km/s", "~150,000 km/s", "~1,000,000 km/s"], ans: 0, exp: "Light travels at 299,792 km/s in vacuum." },
      { q: "What subatomic particle carries a negative electric charge?", opts: ["Proton", "Neutron", "Electron"], ans: 2, exp: "Electrons carry a negative fundamental charge of -1e." },
      { q: "Which law states that for every action, there is an equal and opposite reaction?", opts: ["Newton's 1st Law", "Newton's 2nd Law", "Newton's 3rd Law"], ans: 2, exp: "Newton's Third Law governs interaction forces between two bodies." }
    ];
    let mode = 'practice', active = [...questions], answers = new Array(active.length).fill(null), idx = 0, flags = new Set(), timer = null, remaining = active.length * 60;
    function init() { renderGrid(); renderQ(); }
    function setMode(m) {
      mode = m;
      document.getElementById('mode-p').className = m === 'practice' ? 'mode-btn active' : 'mode-btn';
      document.getElementById('mode-e').className = m === 'exam' ? 'mode-btn active' : 'mode-btn';
      document.getElementById('timer-pill').style.display = m === 'exam' ? 'inline-block' : 'none';
      document.getElementById('submit-exam-btn').style.display = m === 'exam' ? 'inline-block' : 'none';
      if (m === 'exam') startTimer(); else if (timer) clearInterval(timer);
      renderQ();
    }
    function startTimer() {
      if (timer) clearInterval(timer);
      remaining = active.length * 60;
      updateTimer();
      timer = setInterval(() => { remaining--; updateTimer(); if (remaining <= 0) { clearInterval(timer); submitExam(); } }, 1000);
    }
    function updateTimer() {
      const m = Math.floor(remaining / 60), s = remaining % 60;
      document.getElementById('timer-pill').textContent = \`⏱️ \${String(m).padStart(2,'0')}:\${String(s).padStart(2,'0')}\`;
    }
    function toggleDrawer() { document.getElementById('drawer').classList.toggle('open'); }
    function renderGrid() {
      const g = document.getElementById('grid'); g.innerHTML = '';
      active.forEach((q, i) => {
        const b = document.createElement('div'); b.className = 'grid-box';
        if (i === idx) b.classList.add('active');
        if (answers[i] !== null) b.classList.add('answered');
        if (flags.has(q.q)) b.classList.add('flagged');
        b.textContent = i + 1;
        b.onclick = () => { idx = i; renderQ(); };
        g.appendChild(b);
      });
    }
    function toggleFlag() {
      const q = active[idx].q;
      if (flags.has(q)) flags.delete(q); else flags.add(q);
      renderQ();
    }
    function renderQ() {
      renderGrid();
      const q = active[idx];
      document.getElementById('q-num').textContent = \`Question \${idx + 1} of \${active.length}\`;
      document.getElementById('flag-btn').className = flags.has(q.q) ? 'flag-btn flagged' : 'flag-btn';
      document.getElementById('flag-btn').textContent = flags.has(q.q) ? '🚩 Flagged' : '🏳️ Flag';
      document.getElementById('q-title').textContent = q.q;
      const opts = document.getElementById('opts'); opts.innerHTML = '';
      const fb = document.getElementById('fb');
      const answered = answers[idx] !== null;
      if (mode === 'practice' && answered) {
        fb.style.display = 'block'; fb.textContent = \`Explanation: \${q.exp}\`;
      } else {
        fb.style.display = 'none';
      }
      q.opts.forEach((o, i) => {
        const b = document.createElement('button'); b.className = 'btn';
        b.textContent = \`\${String.fromCharCode(65 + i)}) \${o}\`;
        if (mode === 'practice') {
          b.disabled = answered;
          if (answered) {
            if (i === q.ans) b.classList.add('correct');
            else if (i === answers[idx]) b.classList.add('incorrect');
          }
        } else {
          if (answers[idx] === i) b.classList.add('exam-selected');
        }
        b.onclick = () => {
          answers[idx] = i;
          if (mode === 'practice' && window.parent) window.parent.postMessage({ type: 'quiz-answer', isCorrect: i === q.ans }, '*');
          renderQ();
        };
        opts.appendChild(b);
      });
    }
    function nextQuestion() {
      if (idx < active.length - 1) { idx++; renderQ(); }
      else if (mode === 'exam') submitExam(); else showResults();
    }
    function submitExam() {
      const unanswered = answers.filter(a => a === null).length;
      if (unanswered > 0 && !confirm(\`You have \${unanswered} unanswered question(s). Submit exam now?\`)) return;
      showResults();
    }
    function showResults() {
      if (timer) clearInterval(timer);
      document.getElementById('quiz-view').style.display = 'none';
      document.getElementById('result-view').style.display = 'block';
      let correct = 0; answers.forEach((a, i) => { if (a === active[i].ans) correct++; });
      const pct = Math.round((correct / active.length) * 100);
      document.getElementById('final-pct').textContent = \`\${pct}%\`;
      document.getElementById('final-stats').textContent = \`Correct: \${correct} / \${active.length} · Flagged: \${flags.size}\`;
      const missedOrFlagged = active.filter((q, i) => answers[i] !== q.ans || flags.has(q.q)).length;
      document.getElementById('drill-btn').disabled = missedOrFlagged === 0;
      if (window.parent) {
        window.parent.postMessage({ type: 'quiz-completed', score: correct, total: active.length, percentage: pct, mode }, '*');
      }
    }
    function startTargetedDrill() {
      active = active.filter((q, i) => answers[i] !== q.ans || flags.has(q.q));
      answers = new Array(active.length).fill(null);
      idx = 0; mode = 'practice';
      document.getElementById('result-view').style.display = 'none';
      document.getElementById('quiz-view').style.display = 'block';
      init();
    }
    function restart() {
      active = [...questions]; answers = new Array(active.length).fill(null);
      idx = 0; document.getElementById('result-view').style.display = 'none';
      document.getElementById('quiz-view').style.display = 'block';
      init();
    }
    init();
  </script>
</body>
</html>`;
    setHtmlContent(template);
    setTitle('Physics & Quantum Fundamentals');
    setFilename('physics_fundamentals.html');
    setCategory('Science');
    setQuestionCount(3);
    setEstimatedMinutes(3);
    setCommitMessage('Add physics_fundamentals.html quiz via Nihrantz Quiz Explorer');
  };

  const handleTogglePreview = () => {
    playNavSound();
    if (!previewMode) {
      if (!htmlContent.trim()) {
        setErrorMessage('Please upload a file or write some HTML code first.');
        return;
      }
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewMode(true);
    } else {
      setPreviewMode(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!htmlContent.trim()) {
      setErrorMessage('HTML quiz code cannot be empty.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please provide a quiz title.');
      return;
    }

    const cleanFilename = (filename.trim() || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.html`)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const finalFilename = cleanFilename.endsWith('.html') ? cleanFilename : `${cleanFilename}.html`;

    // Determine final folder path
    let finalFolderPath = targetFolder;
    if (isCreatingNewFolder && newSubfolderName.trim()) {
      const cleanSub = newSubfolderName.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
      finalFolderPath = `${targetFolder}/${cleanSub}`;
    }

    const finalPath = `${finalFolderPath}/${finalFilename}`;
    const quizId = `upload-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Create in-memory Blob URL for sandboxed iframe
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    const newQuiz: QuizItem = {
      id: quizId,
      title: title.trim(),
      filename: finalFilename,
      path: finalPath,
      category,
      questionCount: Number(questionCount) || 5,
      estimatedMinutes: Number(estimatedMinutes) || 4,
      difficulty,
      tags: [category.toLowerCase(), 'custom-quiz'],
      dateModified: new Date().toISOString().split('T')[0],
      size: `${(new Blob([htmlContent]).size / 1024).toFixed(1)} KB`,
      description: description.trim() || `User uploaded standalone HTML quiz: ${title.trim()}`,
      htmlContent,
      blobUrl,
      isUploaded: true
    };

    // Permanent GitHub Commit
    if (!isAdmin) {
      setErrorMessage('GitHub Personal Access Token (PAT with repo scope) is required to commit quizzes to repository.');
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);

    const res = await commitFileToGitHub(
      finalFolderPath,
      finalFilename,
      htmlContent,
      commitMessage || `Add ${finalFilename} quiz via Nihrantz Quiz Explorer`,
      ghConfig
    );

    setIsCommitting(false);

    if (!res.success) {
      setErrorMessage(`GitHub commit failed: ${res.error}`);
      return;
    }

    setSuccessToast(`Successfully committed ${finalFilename} to ${ghConfig.owner}/${ghConfig.repo}!`);
    playSuccessChime();

    // Immediately trigger GitHub repository refresh in App
    onGitHubCommitted?.();

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Upload & Commit HTML Quiz
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Place standalone HTML quiz code directly into any repository folder
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold">
          <div className="flex gap-4">
            <button
              onClick={() => {
                playNavSound();
                setTab('upload');
              }}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                tab === 'upload'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload .html File</span>
            </button>
            <button
              onClick={() => {
                playNavSound();
                setTab('code');
              }}
              className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                tab === 'code'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Paste HTML Code</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleTogglePreview}
            disabled={!htmlContent}
            className={`mb-1 px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
              previewMode
                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
            } disabled:opacity-40`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewMode ? 'Close Preview' : 'Test Preview'}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Live Preview Mode if toggled */}
          {previewMode && previewUrl && (
            <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl overflow-hidden shadow-inner">
              <div className="bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 flex items-center justify-between">
                <span>Live Sandboxed Preview</span>
                <span className="text-neutral-400 font-mono text-[10px]">sandbox=allow-scripts</span>
              </div>
              <iframe
                src={previewUrl}
                title="Quiz Preview"
                sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                className="w-full h-56 bg-slate-900 border-none"
              />
            </div>
          )}

          {/* Destination Folder Selector */}
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-200 uppercase tracking-wider">
                Destination Folder in Explorer
              </label>
              <button
                type="button"
                onClick={() => {
                  playNavSound();
                  setIsCreatingNewFolder(!isCreatingNewFolder);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium text-[11px]"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>{isCreatingNewFolder ? 'Choose Existing Folder' : '+ Create New Subfolder'}</span>
              </button>
            </div>

            <div>
              <div className="relative">
                <input
                  type="text"
                  list="folder-paths-list"
                  value={targetFolder}
                  onChange={(e) => setTargetFolder(e.target.value)}
                  placeholder="e.g. quizzes/science/biology"
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
                />
                <datalist id="folder-paths-list">
                  {folderPaths.map((fPath) => (
                    <option key={fPath} value={fPath} />
                  ))}
                </datalist>
              </div>
              <p className="text-[10.5px] text-neutral-400 mt-1">
                Enter target folder path (e.g. <span className="font-mono text-neutral-600 dark:text-neutral-300">quizzes/science/biology</span>) or choose from existing folders.
              </p>
            </div>

            {isCreatingNewFolder && (
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center gap-2">
                <span className="text-neutral-400 font-mono text-[11px] shrink-0">
                  {targetFolder} /
                </span>
                <input
                  type="text"
                  value={newSubfolderName}
                  onChange={(e) => setNewSubfolderName(e.target.value)}
                  placeholder="new_subfolder_name (e.g. biology)"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-md text-xs font-mono outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Tab 1: File Drop Zone */}
          {tab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".html,.htm"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-neutral-50/50 dark:bg-neutral-800/30"
              >
                <FileCode className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {filename ? `Selected: ${filename}` : "Click to browse or drag & drop an HTML file"}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Accepts standalone .html quiz files with embedded CSS/JS
                </p>
                {htmlContent && (
                  <span className="inline-block mt-3 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded text-[11px] font-medium">
                    ✓ File loaded ({(new Blob([htmlContent]).size / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Raw HTML Code Textarea */}
          {tab === 'code' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
                  HTML Source Code
                </label>
                <button
                  type="button"
                  onClick={handleLoadSampleTemplate}
                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Insert Sample Quiz Template</span>
                </button>
              </div>
              <textarea
                value={htmlContent}
                onChange={(e) => {
                  setHtmlContent(e.target.value);
                  parseHtmlCode(e.target.value);
                }}
                rows={7}
                placeholder="<!DOCTYPE html><html>...</html>"
                className="w-full p-3 bg-neutral-900 text-neutral-100 font-mono text-xs rounded-xl border border-neutral-700 outline-none focus:border-blue-500 leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* Metadata Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Molecular Genetics"
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Target Filename (.html)
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. molecular_genetics.html"
                required
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
              >
                <option value="Science">Science & Biology</option>
                <option value="History">Modern History</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Geography">World Geography</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Literature">Literature</option>
                <option value="General">General Trivia</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Number of Questions
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                Estimated Minutes
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* GitHub Commit Direct Integration Section */}
          <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5 text-xs">
                <Github className="w-3.5 h-3.5" />
                <span>Permanent GitHub Repository Commit (REST API)</span>
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                isAdmin ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
              }`}>
                {isAdmin ? 'Admin PAT Authorized' : 'PAT Required'}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {isAdmin ? (
                <>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono break-all">
                    PUT https://api.github.com/repos/{ghConfig.owner}/{ghConfig.repo}/contents/{targetFolder}/{filename || '{filename}'}
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                      Commit Message
                    </label>
                    <input
                      type="text"
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      placeholder="Add new quiz via Nihrantz Quiz Explorer"
                      className="w-full px-3 py-1.5 bg-white dark:bg-[#181818] border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-[11.5px] text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>Personal Access Token (repo scope) is required to commit quizzes directly to GitHub.</span>
                  </div>
                  {onOpenAdminConfig && (
                    <button
                      type="button"
                      onClick={onOpenAdminConfig}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shrink-0 transition-colors"
                    >
                      Configure Token
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                playNavSound();
                onClose();
              }}
              disabled={isCommitting}
              className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCommitting}
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Committing to GitHub...</span>
                </>
              ) : (
                <>
                  <GitCommit className="w-3.5 h-3.5" />
                  <span>Commit to GitHub</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

