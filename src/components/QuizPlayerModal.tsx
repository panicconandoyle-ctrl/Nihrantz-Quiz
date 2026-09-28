import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Share2, 
  ExternalLink, 
  Check, 
  FileCode, 
  Sparkles, 
  Download,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Github,
  ArrowUpCircle
} from 'lucide-react';
import { QuizItem } from '../types';
import { 
  playNavSound, 
  playCorrectSound, 
  playIncorrectSound, 
  playVictoryFanfare,
  playOptionClickSound,
  isSoundEnabled,
  setSoundEnabled
} from '../utils/audio';
import { fetchQuizRawHtml, getStoredGithubConfig } from '../services/githubService';

interface QuizPlayerModalProps {
  quiz: QuizItem | null;
  onClose: () => void;
  onRecordScore: (quizId: string, score: number, total: number, percentage: number, mode?: 'practice' | 'exam', timeSpentSeconds?: number) => void;
  onSyncQuizToGitHub?: (quiz: QuizItem) => void;
}

export const QuizPlayerModal: React.FC<QuizPlayerModalProps> = ({
  quiz,
  onClose,
  onRecordScore,
  onSyncQuizToGitHub,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [latestScore, setLatestScore] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [isSound, setIsSound] = useState<boolean>(() => isSoundEnabled());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [renderedSrcDoc, setRenderedSrcDoc] = useState<string>('');

  const ghConfig = getStoredGithubConfig();

  // Load raw HTML from GitHub directly
  const loadQuizContent = useCallback(async () => {
    if (!quiz) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      let rawText = '';
      if (quiz.htmlContent) {
        rawText = quiz.htmlContent;
      } else {
        rawText = await fetchQuizRawHtml(quiz, ghConfig);
      }

      // Inject audio sound bridge script that captures correct vs incorrect answers and clicks
      const audioBridgeScript = `
        <script>
        (function() {
          var lastAnswerTime = 0;
          function notifyAnswer(isCorrect) {
            var now = Date.now();
            if (now - lastAnswerTime < 250) return; // Debounce
            lastAnswerTime = now;
            try {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'quiz-answer', isCorrect: !!isCorrect }, '*');
              }
            } catch(err){}
          }

          // Intercept postMessage calls if quiz natively sends them
          var originalPostMessage = window.postMessage;
          window.postMessage = function(data, targetOrigin, transfer) {
            if (data && typeof data === 'object' && data.type === 'quiz-answer') {
              notifyAnswer(data.isCorrect);
            }
            if (originalPostMessage) {
              return originalPostMessage.apply(this, arguments);
            }
          };

          // Intercept click on option buttons and observe feedback classes/styles
          document.addEventListener('click', function(e) {
            var btn = e.target.closest('button, .option-btn, [class*="option"], [class*="choice"], [role="button"], input[type="radio"], .btn');
            if (btn) {
              try {
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: 'quiz-click' }, '*');
                }
              } catch(err){}

              // Check after the quiz script runs its click handler
              setTimeout(function() {
                var cls = (btn.className || '') + ' ' + (btn.getAttribute('class') || '');
                var isSelectedCorrect = cls.indexOf('selected-correct') !== -1 || (cls.indexOf('correct') !== -1 && cls.indexOf('incorrect') === -1);
                var isSelectedIncorrect = cls.indexOf('selected-incorrect') !== -1 || cls.indexOf('incorrect') !== -1;

                if (isSelectedCorrect) {
                  notifyAnswer(true);
                } else if (isSelectedIncorrect) {
                  notifyAnswer(false);
                }
              }, 40);
            }
          }, true);

          // MutationObserver to catch answer validation tags (like .tag-correct, .tag-incorrect in Clinical quiz)
          try {
            var observer = new MutationObserver(function(mutations) {
              for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'attributes' && m.attributeName === 'class') {
                  var targetCls = m.target.className || '';
                  if (typeof targetCls === 'string') {
                    if (targetCls.indexOf('selected-correct') !== -1 || targetCls.indexOf('tag-correct') !== -1) {
                      notifyAnswer(true);
                      return;
                    } else if (targetCls.indexOf('selected-incorrect') !== -1 || targetCls.indexOf('tag-incorrect') !== -1) {
                      notifyAnswer(false);
                      return;
                    }
                  }
                } else if (m.type === 'childList') {
                  for (var j = 0; j < m.addedNodes.length; j++) {
                    var node = m.addedNodes[j];
                    if (node.nodeType === 1) {
                      var nCls = node.className || '';
                      if (typeof nCls === 'string') {
                        if (nCls.indexOf('tag-correct') !== -1 || (nCls.indexOf('correct') !== -1 && nCls.indexOf('incorrect') === -1)) {
                          notifyAnswer(true);
                          return;
                        } else if (nCls.indexOf('tag-incorrect') !== -1 || nCls.indexOf('incorrect') !== -1) {
                          notifyAnswer(false);
                          return;
                        }
                      }
                    }
                  }
                }
              }
            });
            observer.observe(document.documentElement, { attributes: true, subtree: true, childList: true });
          } catch(e){}
        })();
        </script>
      `;

      let finalHtml = rawText;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${audioBridgeScript}</body>`);
      } else {
        finalHtml = finalHtml + audioBridgeScript;
      }

      setRenderedSrcDoc(finalHtml);
      setIsLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch quiz HTML from GitHub.';
      setLoadError(msg);
      setIsLoading(false);
    }
  }, [quiz, ghConfig]);

  useEffect(() => {
    loadQuizContent();
  }, [loadQuizContent]);

  useEffect(() => {
    // Listen for postMessage from the iframe quiz
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;

      if (e.data.type === 'quiz-answer') {
        if (e.data.isCorrect) {
          playCorrectSound();
        } else {
          playIncorrectSound();
        }
      } else if (e.data.type === 'quiz-click') {
        playOptionClickSound();
      } else if (e.data.type === 'quiz-completed') {
        const { score, total, percentage, mode, timeSpentSeconds } = e.data;
        setLatestScore({ score, total, percentage });
        if (quiz) {
          onRecordScore(quiz.id, score, total, percentage, mode, timeSpentSeconds);
          playVictoryFanfare();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [quiz, onRecordScore]);

  const handleToggleSound = () => {
    const next = !isSound;
    setIsSound(next);
    setSoundEnabled(next);
    if (next) {
      playCorrectSound();
    }
  };

  const handleReload = () => {
    playNavSound();
    loadQuizContent();
  };

  const handleToggleFullscreen = () => {
    playNavSound();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleSharePermalink = () => {
    if (!quiz) return;
    playNavSound();
    const url = new URL(window.location.href);
    url.searchParams.set('quiz', quiz.path);
    navigator.clipboard.writeText(url.toString());
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleOpenInNewTab = () => {
    if (!quiz) return;
    playNavSound();
    // Open direct raw or local URL
    const targetUrl = quiz.rawUrl || `/${quiz.path}`;
    window.open(targetUrl, '_blank');
  };

  const handleDownloadHtml = () => {
    if (!quiz || !renderedSrcDoc) return;
    playNavSound();
    const blob = new Blob([renderedSrcDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = quiz.filename || 'quiz.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Keyboard shortcut listener (Esc to close, F11 for fullscreen, R for reload)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        // Allow standard reload or capture
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!quiz) return null;

  const gitHubBlobUrl = quiz.gitHubUrl || `https://github.com/${ghConfig.owner}/${ghConfig.repo}/blob/${ghConfig.branch || 'main'}/${quiz.path}`;
  const isPendingSync = quiz.syncStatus === 'pending_sync';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-between"
    >
      {/* Top Player Action Bar */}
      <header className="h-12 bg-[#1f1f1f] border-b border-neutral-700/80 px-4 flex items-center justify-between text-neutral-100 select-none shrink-0 shadow-md">
        {/* Left: Back / Close & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-xs font-semibold text-neutral-200 hover:text-white transition-colors border border-neutral-700"
            title="Return to File Explorer (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Explorer</span>
          </button>

          <div className="flex items-center gap-2 overflow-hidden">
            <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
            <h2 className="text-xs sm:text-sm font-semibold truncate">
              {quiz.title}
            </h2>
            <span className="text-[11px] text-neutral-400 hidden md:inline">
              ({quiz.category} · {quiz.questionCount} Questions)
            </span>

            {/* GitHub Live badge or Pending Sync badge */}
            {isPendingSync ? (
              <span className="text-[10px] bg-amber-900/60 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded font-mono hidden sm:inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Local (Pending Sync)
              </span>
            ) : (
              <a
                href={gitHubBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded font-mono hidden sm:inline-flex items-center gap-1 hover:bg-emerald-800/80 transition-colors"
                title="View commit source on GitHub"
              >
                <Github className="w-2.5 h-2.5" />
                <span>GitHub Live</span>
              </a>
            )}
          </div>
        </div>

        {/* Center: Latest Score Live Pill */}
        {latestScore && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded-full text-xs text-emerald-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Score: {latestScore.score}/{latestScore.total} ({latestScore.percentage}%)</span>
          </div>
        )}

        {/* Right: Controls (GitHub Link, Download HTML, Share, Sound, Reload, Fullscreen, Open in Tab) */}
        <div className="flex items-center gap-1.5">
          {/* Push to GitHub button if pending */}
          {isPendingSync && onSyncQuizToGitHub && (
            <button
              onClick={() => onSyncQuizToGitHub(quiz)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-semibold transition-colors shadow-2xs"
              title="Commit and push this quiz directly to GitHub repository"
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Push to GitHub</span>
            </button>
          )}

          {/* View on GitHub button */}
          {!isPendingSync && (
            <a
              href={gitHubBlobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-xs text-neutral-200 transition-colors border border-neutral-700"
              title="View repository file source on GitHub"
            >
              <Github className="w-3.5 h-3.5 text-neutral-300" />
              <span className="hidden sm:inline">GitHub</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60" />
            </a>
          )}

          {/* Download HTML */}
          <button
            onClick={handleDownloadHtml}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-xs text-neutral-200 transition-colors border border-neutral-700"
            title="Download standalone .html file"
          >
            <Download className="w-3.5 h-3.5 text-neutral-300" />
            <span className="hidden sm:inline">Download .html</span>
          </button>

          {/* Share Permalink */}
          <button
            onClick={handleSharePermalink}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-xs text-neutral-200 transition-colors border border-neutral-700"
            title="Copy permalink to this quiz"
          >
            {copiedShare ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-neutral-300" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Quiz Sound FX Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 rounded-md transition-colors border ${
              isSound 
                ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-400 border-neutral-700' 
                : 'bg-neutral-800/60 hover:bg-neutral-800 text-neutral-500 border-neutral-800'
            }`}
            title={isSound ? "Quiz Audio FX: ON (Click to Mute)" : "Quiz Audio FX: OFF (Click to Enable)"}
            aria-label="Toggle Quiz Sound"
          >
            {isSound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          {/* Reload / Sync from GitHub */}
          <button
            onClick={handleReload}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-neutral-200 transition-colors border border-neutral-700"
            title="Re-fetch & Reload from GitHub"
            aria-label="Reload Quiz"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={handleToggleFullscreen}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-neutral-200 transition-colors border border-neutral-700"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open in New Window */}
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-neutral-200 transition-colors border border-neutral-700"
            title="Open standalone HTML in new tab"
            aria-label="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Sandbox Frame Container */}
      <div className="flex-1 w-full bg-[#111] relative overflow-hidden flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 text-white z-10">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-sm font-medium">Fetching quiz HTML from GitHub...</p>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              raw.githubusercontent.com/{ghConfig.owner}/{ghConfig.repo}/{ghConfig.branch || 'main'}/{quiz.path}
            </p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900 p-6 text-center z-10">
            <div className="w-12 h-12 rounded-full bg-rose-950/60 border border-rose-600/50 flex items-center justify-center text-rose-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-rose-300">Unable to load quiz from GitHub</h3>
            <p className="text-xs text-neutral-400 max-w-md mt-1 mb-4 leading-relaxed">{loadError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry GitHub Sync</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {renderedSrcDoc && (
          <iframe
            ref={iframeRef}
            srcDoc={renderedSrcDoc}
            title={quiz.title}
            className="w-full h-full border-none bg-white shadow-2xl"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
            allow="fullscreen; autoplay"
          />
        )}
      </div>

      {/* Bottom Information Sub-bar */}
      <footer className="h-8 bg-[#181818] border-t border-neutral-800 px-4 flex items-center justify-between text-[11px] text-neutral-400 select-none shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="font-mono text-neutral-300 truncate">
            {ghConfig.owner}/{ghConfig.repo} : {quiz.path}
          </span>
          {quiz.sha && (
            <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
              (SHA: {quiz.sha.substring(0, 7)})
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-neutral-400 shrink-0">
          <span className="hidden sm:inline">Stand-alone HTML Sandbox</span>
          <span>Audio FX: {isSound ? 'ON' : 'OFF'}</span>
        </div>
      </footer>
    </div>
  );
};
