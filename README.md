
# Portfolio Site

A personal portfolio website built with Vite, React, and TypeScript showcasing my professional experience and skills in software engineering and quality assurance.

## 🛠 Technologies

- Vite
- React 18
- TypeScript
- React Router
- React Helmet Async
- CSS Modules
- Responsive Design
- Theme Switching (Dark/Light Mode)
- Netlify Hosting

## 🚀 Getting Started

1. **Install Dependencies**
```sh
npm install
```

2. **Start Development Server**
```sh
npm run dev
```

The site will be running at `http://localhost:8000`

3. **Build for Production**
```sh
npm run build
```

4. **Preview Production Build**
```sh
npm run preview
```

## 🧪 Testing

Run tests with:
```sh
npm test
```

Watch mode:
```sh
npm test:watch
```

Coverage report:
```sh
npm test:coverage
```

## 📦 Deployment

The site is configured for Netlify deployment:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20

The build automatically runs tests before creating the production bundle.

## 🔄 Profile Sync

This repo is the single source of truth for resume profile data (`src/data/profileData.ts`). A post-commit hook automatically syncs changes to downstream targets (lobresume, career-ops) when `profileData.ts` is committed.

### Setup

After cloning, enable the git hooks:

```sh
git config core.hooksPath .git-hooks
```

### Manual sync

```sh
python3 scripts/sync-career-ops.py          # sync all targets
python3 scripts/sync-career-ops.py --check  # dry run
```

See [`.git-hooks/README.md`](.git-hooks/README.md) for details.
