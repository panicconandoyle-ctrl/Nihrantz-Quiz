import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  ExternalLink, 
  Rocket, 
  Zap, 
  FolderCheck,
  CheckCircle2
} from 'lucide-react';
import { playNavSound, playSuccessChime } from '../utils/audio';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'static' | 'actions'>('static');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(id);
    playSuccessChime();
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const staticGitCommands = `# 1. Initialize git and commit your files
git init
git add .
git commit -m "Initial commit: WinQuiz Explorer Portal"

# 2. Add your GitHub remote repository
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_QUIZ_REPO.git

# 3. Push to GitHub
git push -u origin main`;

  const actionsWorkflowYaml = `name: Deploy to GitHub Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production app
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload Pages Artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Rocket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                2-Minute GitHub Pages Deployment Guide
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Host this interactive quiz portal for free on GitHub Pages
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-4 border-b border-neutral-100 dark:border-neutral-800 flex gap-4 text-xs font-semibold">
          <button
            onClick={() => {
              playNavSound();
              setActiveTab('static');
            }}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'static'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Method 1: Zero-Build Static Hosting (Fastest)</span>
          </button>
          <button
            onClick={() => {
              playNavSound();
              setActiveTab('actions');
            }}
            className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'actions'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <FolderCheck className="w-3.5 h-3.5" />
            <span>Method 2: Automated GitHub Actions (Vite CI/CD)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {activeTab === 'static' ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-blue-900 dark:text-blue-200">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Zero Build Step Required</span>
                  This repository includes a standalone <code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">index.html</code>, <code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">app.js</code>, and <code className="font-mono bg-blue-100 dark:bg-blue-900/60 px-1 py-0.5 rounded">quizzes.json</code>. GitHub Pages serves it directly out of the box!
                </div>
              </div>

              {/* Step 1 */}
              <div>
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 inline-flex items-center justify-center text-[11px]">1</span>
                  <span>Push files to your GitHub repository</span>
                </h4>
                <div className="relative mt-2">
                  <pre className="p-3 bg-[#0f172a] text-neutral-200 font-mono text-[11px] rounded-lg overflow-x-auto leading-relaxed">
                    {staticGitCommands}
                  </pre>
                  <button
                    onClick={() => copyCode(staticGitCommands, 'git-push')}
                    className="absolute top-2 right-2 p-1.5 bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors flex items-center gap-1 text-[11px]"
                  >
                    {copiedSnippet === 'git-push' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === 'git-push' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Step 2 */}
              <div>
                <h4 className="font-bold text-neutral-900 dark:text-neutral-100 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 inline-flex items-center justify-center text-[11px]">2</span>
                  <span>Enable GitHub Pages in your Repository Settings</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-neutral-600 dark:text-neutral-300 pl-2">
                  <li>Navigate to your repository on GitHub: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono">github.com/{'{user}'}/{'{repo}'}</code></li>
                  <li>Click on <strong>Settings</strong> → <strong>Pages</strong> in the left sidebar.</li>
                  <li>Under <strong>Build and deployment</strong> &gt; <strong>Source</strong>: select <strong>"Deploy from a branch"</strong>.</li>
                  <li>Under <strong>Branch</strong>: choose <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">main</code> and folder <code className="font-mono bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">/ (root)</code>.</li>
                  <li>Click <strong>Save</strong>. In ~60 seconds, your site is live at: <code className="font-mono text-blue-600 dark:text-blue-400">https://{'{user}'}.github.io/{'{repo}'}/</code></li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                If you prefer an automated CI/CD pipeline using GitHub Actions, create the file <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded font-mono text-neutral-800 dark:text-neutral-200">.github/workflows/deploy.yml</code> in your repository:
              </p>

              <div className="relative">
                <pre className="p-3 bg-[#0f172a] text-neutral-200 font-mono text-[11px] rounded-lg overflow-x-auto max-h-72 leading-relaxed">
                  {actionsWorkflowYaml}
                </pre>
                <button
                  onClick={() => copyCode(actionsWorkflowYaml, 'actions-yaml')}
                  className="absolute top-2 right-2 p-1.5 bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 transition-colors flex items-center gap-1 text-[11px]"
                >
                  {copiedSnippet === 'actions-yaml' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === 'actions-yaml' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl text-neutral-600 dark:text-neutral-300">
                <strong>Next Step:</strong> Go to <strong>Settings</strong> → <strong>Pages</strong> → <strong>Source</strong>: select <strong>"GitHub Actions"</strong>. Every git push will automatically build and publish your app!
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#252525] flex justify-end">
          <button
            onClick={() => {
              playNavSound();
              onClose();
            }}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Got it, Let's Explore
          </button>
        </div>
      </div>
    </div>
  );
};
