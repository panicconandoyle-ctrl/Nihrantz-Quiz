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
  AlertTriangle
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
  onRecordScore: (quizId: string, score: number, total: number, percentage: number) => void;
}

export const QuizPlayerModal: React.FC<QuizPlayerModalProps> = ({
  quiz,
  onClose,
  onRecordScore,
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

      // Inject audio sound bridge script if not already present
      const audioBridgeScript = `
        <script>
        (function() {
          // Listen for option and button clicks to trigger sound FX
          document.addEventListener('click', function(e) {
            var btn = e.target.closest('button, .option-btn, [class*="option"], [class*="choice"], [role="button"], input[type="radio"]');
            if (btn) {
              try {
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: 'quiz-click' }, '*');
                }
              } catch(err){}
            }
          }, true);
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
        const { score, total, percentage } = e.data;
        setLatestScore({ score, total, percentage });
        if (quiz) {
          onRecordScore(quiz.id, score, total, percentage);
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

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!quiz) return null;

  const handleReload = () => {
    playNavSound();
    setLatestScore(null);
    loadQuizContent();
  };

  const handleToggleFullscreen = () => {
    playNavSound();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSharePermalink = () => {
    playNavSound();
    const url = new URL(window.location.href);
    url.searchParams.set('quiz', quiz.path);
    navigator.clipboard.writeText(url.toString());
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2200);
  };

  const handleDownloadHtml = () => {
    playNavSound();
    const content = renderedSrcDoc || quiz.htmlContent || '';
    if (content) {
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = quiz.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleOpenInNewTab = () => {
    playNavSound();
    if (renderedSrcDoc) {
      const blob = new Blob([renderedSrcDoc], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      const targetUrl = quiz.rawUrl || `https://raw.githubusercontent.com/${ghConfig.owner}/${ghConfig.repo}/${ghConfig.branch || 'main'}/${quiz.path}`;
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-between"
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
            <span className="text-[10px] bg-blue-900/60 text-blue-300 border border-blue-700/50 px-1.5 py-0.5 rounded font-mono hidden sm:inline">
              GitHub Live
            </span>
          </div>
        </div>

        {/* Center: Latest Score Live Pill */}
        {latestScore && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-950/80 border border-emerald-500/50 rounded-full text-xs text-emerald-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Score: {latestScore.score}/{latestScore.total} ({latestScore.percentage}%)</span>
          </div>
        )}

        {/* Right: Controls (Download HTML, Share, Sound, Reload, Fullscreen, Open in Tab) */}
        <div className="flex items-center gap-1.5">
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

          {/* Reload / Restart */}
          <button
            onClick={handleReload}
            className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-neutral-200 transition-colors border border-neutral-700"
            title="Restart / Reload Quiz"
            aria-label="Restart Quiz"
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

      {/* Sandboxed Interactive Quiz Viewport */}
      <main className="flex-1 w-full h-[calc(100vh-3rem)] bg-[#0f172a] relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] text-neutral-300 z-20">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
            <p className="text-sm font-semibold text-neutral-100">Loading quiz from GitHub...</p>
            <p className="text-xs text-neutral-400 font-mono mt-1">{quiz.path}</p>
          </div>
        )}

        {loadError && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a] text-neutral-300 p-6 z-20 text-center">
            <AlertTriangle className="w-10 h-10 text-rose-500 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Failed to load quiz from GitHub</h3>
            <p className="text-xs text-rose-300 font-mono mb-4 max-w-md">{loadError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                Retry Fetch
              </button>
              <button
                onClick={handleOpenInNewTab}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold"
              >
                Open Raw Link
              </button>
            </div>
          </div>
        )}

        {renderedSrcDoc && (
          <iframe
            ref={iframeRef}
            srcDoc={renderedSrcDoc}
            title={quiz.title}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
            className="w-full h-full border-none"
          />
        )}
      </main>
    </div>
  );
};
