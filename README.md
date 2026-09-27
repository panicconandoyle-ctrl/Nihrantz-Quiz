# Nihrantz Quiz Explorer 🖥️⚡

A Windows 11 File Explorer-style portal for interactive standalone HTML quizzes. Designed to be 100% static, client-side, zero-backend, and optimized for **GitHub Pages**, **Vercel**, or any static web server.

---

## 🌟 Key Features

- **Owner Authentication & Role-Based Access Control:**
  - **Regular Visitors:** Can browse folders, search quizzes, play quizzes with sandboxed execution, and record scores.
  - **Owner (`Nihrantz`):** Protected access to upload HTML quiz code, create new directories, and export/modify the manifest.
  - Dedicated Windows Fluent authentication modal with session persistence.

- **Upload & Add HTML Quizzes to Any Folder (Owner Only):**
  - **Upload `.html` File:** Drag & drop or pick any standalone HTML quiz file from your computer.
  - **Paste HTML Code:** In-browser code editor with instant template generation and live test preview sandbox.
  - **Destination Folder Targeting:** Place the quiz directly into any existing directory (e.g. `quizzes/science`) or create a new subfolder on the fly.
  - **Automatic Metadata Extraction:** Extracts quiz title from `<title>`, questions count, and topic keywords automatically.
  - **Export Updated Manifest:** One-click download of the updated `quizzes.json` ready for git commit.

- **Windows 11 Fluent Explorer Interface:**
  - Interactive directory tree sidebar reflecting nested folders and subfolders.
  - Interactive breadcrumb navigation (`This PC > quizzes > science`).
  - Navigation controls: **Back**, **Forward**, **Up One Level** (`⬆`), **Refresh**, and **New Folder**.
  - **Grid View** (large icons + metadata cards) & **Details / List View** (sortable columns).
  - Real-time instant search filtering current folder or globally across all subdirectories.
  - Dark / Light mode with fluent acrylic styling and sound effects.

- **Interactive Sandboxed HTML Quiz Player:**
  - Embeds standalone `.html` quizzes inside a secure iframe:
    `sandbox="allow-scripts allow-forms allow-same-origin allow-popups"`
  - Fullscreen toggle, reload/restart button, direct link permalink sharing (`?quiz=path/to/quiz.html`), and popout.
  - Real-time score listeners reporting test performance and saving high scores in `localStorage`.

- **Creator Support & Donation Section:**
  - High-contrast Bank QR code (supports KHQR, PromptPay, and Universal Bank transfers).
  - One-click copyable account holder name, account number/ID, and SWIFT code with instant "Copied!" feedback.

- **GitHub Auto-Discovery:**
  - Toggle between reading from static `quizzes.json` or dynamic live scanning via GitHub's public API:
    `https://api.github.com/repos/{owner}/{repo}/contents/quizzes`

---

## 📁 Repository Structure

```
root/
├── index.html            # Main web portal entry point
├── app.js                # Pure client-side explorer engine
├── quizzes.json          # Manifest mapping all folders and quizzes
├── README.md             # Documentation & deployment guide
├── public/               # Vite static asset root
│   ├── quizzes.json
│   └── quizzes/
└── quizzes/              # Standalone interactive quizzes directory
    ├── sample_quiz.html
    ├── science/
    │   └── cell_biology.html
    ├── history/
    │   └── modern_history.html
    ├── computer_science/
    │   └── algorithms.html
    └── geography/
        └── world_capitals.html
```

---

## 🚀 2-Minute GitHub Pages Deployment Guide

You can host this entire portal on GitHub Pages for free in under two minutes using either of two methods:

### Method 1: Zero-Build Pure Static Hosting (Fastest)

1. **Push your files to a GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: WinQuiz Explorer Portal"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub (`github.com/YOUR_USERNAME/YOUR_REPO_NAME`).
   - Click on **Settings** → **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, choose **"Deploy from a branch"**.
   - Under **Branch**, select `main` and folder `/ (root)`.
   - Click **Save**.

3. **Done!** Your site will be published at:
   `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

---

### Method 2: Automated GitHub Actions (Vite CI/CD)

If you modify TypeScript source code and want GitHub to build and optimize the bundle automatically on every `git push`:

1. Create `.github/workflows/deploy.yml` in your repository:
   ```yaml
   name: Deploy to GitHub Pages

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
         url: ${{ steps.deployment.outputs.page_url }}
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
           uses: actions/deploy-pages@v4
   ```

2. In GitHub repository **Settings** → **Pages** → **Source**, select **"GitHub Actions"**.
3. Push to `main`. GitHub will build and publish your portal automatically!

---

## 🛠️ Adding New Quizzes

To add a new quiz:
1. Create a self-contained `.html` file inside the appropriate folder in `quizzes/` (e.g. `quizzes/science/genetics.html`).
2. Add an entry to `quizzes.json`:
   ```json
   {
     "id": "genetics-101",
     "title": "Genetics & Heredity",
     "filename": "genetics.html",
     "path": "quizzes/science/genetics.html",
     "category": "Science",
     "questionCount": 5,
     "estimatedMinutes": 4,
     "difficulty": "Intermediate",
     "tags": ["genetics", "dna", "mendel"],
     "dateModified": "2026-09-27"
   }
   ```
3. Commit and push! If you enable the **GitHub Auto-Discovery** option in the app, quizzes placed in the repo appear automatically even without updating `quizzes.json`!

---

## 📄 License
MIT License. Standalone educational quizzes are free for public, non-commercial, and classroom use.
