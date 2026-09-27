/**
 * WinQuiz Explorer - Standalone Client-Side Portal Engine
 * Lightweight, 100% static ES6+ module for GitHub Pages & static web hosting.
 */

class QuizExplorer {
  constructor() {
    this.manifest = null;
    this.currentPath = 'quizzes';
    this.history = ['quizzes'];
    this.historyIndex = 0;
    this.searchQuery = '';
    this.searchScope = 'current'; // 'current' or 'global'
    this.viewMode = localStorage.getItem('winquiz_view') || 'grid';
    this.favorites = JSON.parse(localStorage.getItem('winquiz_favs') || '[]');
    this.scores = JSON.parse(localStorage.getItem('winquiz_scores') || '{}');
    this.activeQuiz = null;

    this.init();
  }

  async init() {
    await this.loadManifest();
    this.bindEvents();
    this.parseUrlParams();
    this.render();
  }

  async loadManifest() {
    try {
      const res = await fetch('./quizzes.json');
      if (!res.ok) throw new Error('Failed to load quizzes.json');
      this.manifest = await res.json();
    } catch (e) {
      console.warn('Fallback to inline manifest:', e);
      this.manifest = {
        name: "Interactive HTML Quizzes Repository",
        folders: [{
          id: "root-quizzes",
          name: "quizzes",
          path: "quizzes",
          folders: [
            { id: "science", name: "science", path: "quizzes/science", folders: [], quizzes: [
              { id: "cell-biology", title: "Cell Biology & Cytology", filename: "cell_biology.html", path: "quizzes/science/cell_biology.html", category: "Science", questionCount: 5, estimatedMinutes: 4, difficulty: "Intermediate" }
            ]},
            { id: "history", name: "history", path: "quizzes/history", folders: [], quizzes: [
              { id: "modern-history", title: "Modern World History", filename: "modern_history.html", path: "quizzes/history/modern_history.html", category: "History", questionCount: 4, estimatedMinutes: 3, difficulty: "Beginner" }
            ]},
            { id: "computer_science", name: "computer_science", path: "quizzes/computer_science", folders: [], quizzes: [
              { id: "algorithms", title: "Data Structures & Algorithms", filename: "algorithms.html", path: "quizzes/computer_science/algorithms.html", category: "Computer Science", questionCount: 4, estimatedMinutes: 5, difficulty: "Advanced" }
            ]},
            { id: "geography", name: "geography", path: "quizzes/geography", folders: [], quizzes: [
              { id: "world-capitals", title: "World Capitals & Nations", filename: "world_capitals.html", path: "quizzes/geography/world_capitals.html", category: "Geography", questionCount: 4, estimatedMinutes: 3, difficulty: "Beginner" }
            ]}
          ],
          quizzes: [
            { id: "sample-quiz", title: "Quick Trivia Challenge", filename: "sample_quiz.html", path: "quizzes/sample_quiz.html", category: "General", questionCount: 5, estimatedMinutes: 3, difficulty: "Beginner" }
          ]
        }]
      };
    }
  }

  getRootFolder() {
    return (this.manifest && this.manifest.folders && this.manifest.folders[0]) || null;
  }

  findFolder(node, path) {
    if (!node) return null;
    const cleanP = path.replace(/^\/+|\/+$/g, '');
    const cleanNode = node.path.replace(/^\/+|\/+$/g, '');
    if (cleanP === cleanNode) return node;
    if (node.folders) {
      for (const sub of node.folders) {
        const found = this.findFolder(sub, cleanP);
        if (found) return found;
      }
    }
    return null;
  }

  getAllQuizzes(node) {
    if (!node) return [];
    let list = [...(node.quizzes || [])];
    if (node.folders) {
      for (const sub of node.folders) {
        list = list.concat(this.getAllQuizzes(sub));
      }
    }
    return list;
  }

  uploadQuiz(targetFolderPath, quizData) {
    const root = this.getRootFolder();
    if (!root) return;
    const folder = this.findFolder(root, targetFolderPath) || root;
    folder.quizzes = folder.quizzes || [];
    folder.quizzes.push(quizData);
    this.render();
    if (quizData.htmlContent) {
      this.openQuiz(quizData);
    }
  }

  createFolder(parentPath, folderName) {
    const root = this.getRootFolder();
    if (!root) return;
    const parent = this.findFolder(root, parentPath) || root;
    parent.folders = parent.folders || [];
    const newPath = `${parent.path}/${folderName}`;
    if (!parent.folders.some(f => f.name === folderName)) {
      parent.folders.push({
        id: folderName,
        name: folderName,
        path: newPath,
        folders: [],
        quizzes: []
      });
      this.render();
      this.navigateTo(newPath);
    }
  }

  navigateTo(path) {
    const clean = path.replace(/^\/+|\/+$/g, '');
    if (clean === this.currentPath) return;
    this.currentPath = clean;
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(clean);
    this.historyIndex = this.history.length - 1;
    this.searchQuery = '';
    this.render();
  }

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentPath = this.history[this.historyIndex];
      this.render();
    }
  }

  goForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentPath = this.history[this.historyIndex];
      this.render();
    }
  }

  goUp() {
    if (this.currentPath === 'quizzes' || !this.currentPath.includes('/')) {
      this.navigateTo('quizzes');
      return;
    }
    const parts = this.currentPath.split('/');
    parts.pop();
    this.navigateTo(parts.join('/'));
  }

  openQuiz(quiz) {
    this.activeQuiz = quiz;
    const modal = document.getElementById('quiz-player-modal');
    const iframe = document.getElementById('quiz-iframe');
    const titleEl = document.getElementById('quiz-player-title');
    if (modal && iframe && titleEl) {
      titleEl.textContent = `${quiz.title} (${quiz.category})`;
      iframe.src = quiz.path.startsWith('/') ? quiz.path : `./${quiz.path}`;
      modal.classList.remove('hidden');
    }
  }

  closeQuiz() {
    this.activeQuiz = null;
    const modal = document.getElementById('quiz-player-modal');
    const iframe = document.getElementById('quiz-iframe');
    if (modal && iframe) {
      modal.classList.add('hidden');
      iframe.src = 'about:blank';
    }
  }

  reloadQuiz() {
    const iframe = document.getElementById('quiz-iframe');
    if (iframe && this.activeQuiz) {
      iframe.src = iframe.src;
    }
  }

  toggleFullscreen() {
    const modal = document.getElementById('quiz-player-modal');
    if (!document.fullscreenElement) {
      modal?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  copyPermalink() {
    if (!this.activeQuiz) return;
    const url = new URL(window.location.href);
    url.searchParams.set('quiz', this.activeQuiz.path);
    navigator.clipboard.writeText(url.toString());
    alert('Permalink copied to clipboard: ' + url.toString());
  }

  parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const quizParam = params.get('quiz');
    const folderParam = params.get('folder');
    if (folderParam) {
      this.currentPath = folderParam;
    }
    if (quizParam && this.manifest) {
      const all = this.getAllQuizzes(this.getRootFolder());
      const q = all.find(item => item.path.endsWith(quizParam) || quizParam.endsWith(item.filename));
      if (q) this.openQuiz(q);
    }
  }

  bindEvents() {
    window.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'quiz-completed') {
        const { score, total, percentage } = e.data;
        if (this.activeQuiz) {
          this.scores[this.activeQuiz.id] = { score, total, percentage };
          localStorage.setItem('winquiz_scores', JSON.stringify(this.scores));
          this.render();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeQuiz) {
        this.closeQuiz();
      }
    });
  }

  render() {
    // Breadcrumbs, sidebar active item, main content grid/details
    const root = this.getRootFolder();
    if (!root) return;
    const currentFolder = this.findFolder(root, this.currentPath) || root;
    // Dispatched to DOM if pure static page is running
    console.log(`Explorer rendered: ${currentFolder.path}`);
  }
}

// Auto-instantiate when running in pure static browser context
if (typeof window !== 'undefined') {
  window.quizExplorer = new QuizExplorer();
}

export default QuizExplorer;
