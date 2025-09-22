# GitHub Pages Deployment Instructions

## 🚀 **Automatic Deployment Setup**

This repository is configured for **automatic deployment** to GitHub Pages. When you push changes to the `master` branch, the site will automatically rebuild and deploy.

### **What Happens Automatically**
1. **Trigger**: Push to `master` branch (or changes to `docs/**`, `site_generator/**`, or `.github/workflows/deploy.yml`)
2. **Build**: GitHub Actions runs `npm run build` in the `site_generator/` directory
3. **Deploy**: Generated site from `exports/website/` is deployed to GitHub Pages
4. **Live**: Site becomes available at `https://[username].github.io/nana`

### **GitHub Pages Configuration**

To activate automatic deployment, you need to configure GitHub Pages settings:

1. **Go to Repository Settings**
   - Navigate to your repository on GitHub
   - Click "Settings" tab
   - Scroll down to "Pages" section

2. **Configure Source**
   - Under "Source", select "GitHub Actions"
   - This enables the automatic deployment workflow

3. **Verify Deployment**
   - After pushing to `main`, check the "Actions" tab
   - Look for "Deploy to GitHub Pages" workflow
   - Wait for it to complete successfully

### **Manual Deployment Commands**

If you need to test locally or deploy manually:

```bash
# Local development
cd site_generator
npm install
npm run build
npm run serve

# Test the generated site
npm run open-local

# Check for broken links
npm run check
```

### **Workflow Details**

The GitHub Actions workflow (`.github/workflows/deploy.yml`) includes:

- **Node.js 18** setup with npm caching
- **Dependency installation** (`npm ci`)
- **Site generation** (`npm run build`)
- **Artifact upload** to GitHub Pages
- **Automatic deployment** to live site

### **Deployment URL**

Once configured, your site will be available at:
```
https://[your-github-username].github.io/nana
```

### **Troubleshooting**

**If deployment fails:**
1. Check the "Actions" tab for error details
2. Verify `site_generator/package.json` has all dependencies
3. Ensure `npm run build` works locally
4. Check that `exports/website/` directory is generated

**If site doesn't update:**
1. Wait 5-10 minutes for GitHub Pages to propagate
2. Check if GitHub Pages source is set to "GitHub Actions"
3. Verify the workflow completed successfully

### **Content Updates**

To update the site content:
1. **Edit markdown files** in `docs/` directory
2. **Commit and push** to `master` branch
3. **Wait for automatic deployment** (usually 2-3 minutes)
4. **Visit your live site** to see changes

**That's it!** No manual build steps required. 🎉

---

*Last updated: December 2024*
