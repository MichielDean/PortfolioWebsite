
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

## � Resume Tailoring Tool

This project includes an AI-powered resume tailoring tool that customizes your resume for specific job postings.

### First-Time Setup

1. **Create your contact configuration:**
```sh
cp contact.example.json contact.json
```

2. **Edit `contact.json` with your information:**
```json
{
  "name": "Your Full Name",
  "email": "your.email@example.com",
  "phone": "(xxx) xxx-xxxx",
  "location": "City, State",
  "website": "https://your-website.com/"
}
```

**Note:** `contact.json` is in `.gitignore` and will never be committed to source control.

### Generate Tailored Resume

```sh
npm run tailor-resume -- --job-file path/to/job-posting.txt --job-title "Job Title" --company "Company Name"
```

This will generate:
- `generated/resume.html` - HTML version
- `generated/resume.pdf` - **PDF ready to submit** (one-page optimized)

### Features
- ✅ Automatically calculates years of experience from work history
- ✅ Selects most relevant achievements for the role
- ✅ Optimized for ATS (Applicant Tracking Systems)
- ✅ One-page PDF format
- ✅ Plain text URLs for maximum compatibility
- ✅ No sensitive data in source control

## �📦 Deployment

The site is configured for Netlify deployment:
- Build command: `npm run build`
- Publish directory: `dist`
- Node version: 20

The build automatically runs tests before creating the production bundle.