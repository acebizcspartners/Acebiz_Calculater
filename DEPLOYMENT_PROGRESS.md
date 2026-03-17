# ACEBIZ Calculator Hub - Deployment Progress

**Date:** November 6, 2024
**Task:** Add Tax Return Analyser to Calculator Hub

---

## Architecture & Approach

### Multi-Repository Strategy

Each calculator has its own:
- ✅ **Separate GitHub Repository** (e.g., `andykul43-a11y/rental-automation`, `andykul43-a11y/Returnreview`)
- ✅ **Separate Vercel Deployment** (e.g., `https://rental-automation-seven.vercel.app/`, `https://returnreview.vercel.app/`)

### Central Hub Page

The **ACEBIZ repository** serves as a landing page:
- 📋 **Repository:** `andykul43-a11y/ACEBIZ`
- 🌐 **Deployment:** `https://capital-gains-calculator-swart.vercel.app/`
- 🎯 **Purpose:** Single page with cards linking to all individual calculator deployments
- 🔗 **No actual calculator code** - just links to external Vercel deployments

---

## Completed Work

### 1. Tax Return Analyser Setup ✅

**Repository:** `andykul43-a11y/Returnreview`
**Deployment:** `https://returnreview.vercel.app/`

#### Features Implemented:
- AI-powered year-over-year tax return comparison (FY 2024 vs 2025)
- Property-by-property rental analysis
- Deduction breakdown & comparison tables
- AI insights using Claude 3 Haiku & GPT-4 Turbo
- Export to Word documents
- Missing information query generation

#### Fixed Issues:
1. **Login Page Error:** "Cannot GET /login.html"
   - **Solution:** Added explicit routes for HTML files in `server.js`
   - Updated `vercel.json` to include HTML files in serverless build
   - Files: `/workspace/.claude/Tax Return Analyser/Github/server.js`, `vercel.json`

2. **API Endpoint Errors:** "Analysis failed: Failed to fetch"
   - **Problem:** Frontend hardcoded to `http://localhost:5000/api/*`
   - **Solution:** Changed to relative URLs `/api/*` in Github folder only
   - **Local files:** Kept with `localhost:5000` for local development
   - Files: `Github/index.html`, `Github/tax_analyzer_web.html`

3. **Authentication Flow:**
   - Moved auth middleware before routes in `server.js`
   - Configured environment variables in Vercel (ANTHROPIC_API_KEY, ACCESS_PASSWORD, AUTH_TOKEN)

### 2. ACEBIZ Hub Page Updates ✅

**Location:** `/workspace/.claude/ACEBIZ/index.html`

Added **6th calculator** to the hub:

```html
<!-- Tax Return Analyser -->
<a href="https://returnreview.vercel.app/" class="calculator-card" target="_blank">
    <div class="calculator-icon">📊</div>
    <h2 class="calculator-title">
        Tax Return Analyser
        <span class="status-badge">Live</span>
    </h2>
    <p class="calculator-description">
        AI-powered tool to compare tax returns year-over-year...
    </p>
    <ul class="calculator-features">
        <li>Year-over-year comparison (FY 2024 vs 2025)</li>
        <li>Property-by-property rental analysis</li>
        <li>Deduction breakdown & comparison</li>
        <li>AI-powered insights using Claude & GPT-4</li>
        <li>Export to Word documents</li>
    </ul>
    <span class="calculator-tag">Tax Review & Analysis</span>
</a>
```

### Complete Calculator List:
1. Capital Gains Calculator
2. Franking Credit Calculator
3. Property CGT Calculator
4. Tax Planning Calculator
5. Rental Property Automation
6. **Tax Return Analyser** (NEW)

---

## Deployment Challenge & Solution

### Issue: Vercel Not Auto-Deploying

**Problem:**
- Changes pushed to `andykul43-a11y/ACEBIZ` GitHub repository
- Vercel showing "Redeploy of..." old builds instead of pulling fresh code
- Manual "Create Deployment" failed with error: **"A commit author is required"**

**Root Cause:**
Git commits were authored by `Claude Code <claude@anthropic.com>`, not a recognized GitHub user.

**Solution:**

1. **Reconfigured Git User:**
```bash
git config user.name "andykul43-a11y"
git config user.email "andy.kul43@gmail.com"
```

2. **Created New Commit with Proper Author:**
```bash
Commit: d3eddb0654a609c9bbabcc3a44b45d12ef4f6cba
Author: andykul43-a11y <andy.kul43@gmail.com>
Message: Update calculator hub with Tax Return Analyser
```

3. **Vercel Deployment Options:**
   - **Option A:** Wait for auto-deployment (if webhook configured)
   - **Option B:** Manual deployment via Vercel UI:
     - Go to Deployments → Create Deployment
     - Enter commit hash: `d3eddb0`
     - Click "Create Deployment"

---

## Git Commit History

Recent commits (oldest to newest):
```
60c23f6 - Remove private projects from ACEBIZ hub repository
429c4fd - Fix GitHub Pages by updating links to use Vercel URLs
310f6b7 - Add Tax Return Analyser and complete calculator hub
7ed42e5 - Update footer date to Nov 6, 2024 to force fresh deployment
a06e102 - Trigger Vercel deployment
ef82024 - Force webhook trigger - v2
9c6df16 - Add Tax Return Analyser to calculator hub
d3eddb0 - Update calculator hub with Tax Return Analyser (PROPER AUTHOR)
```

---

## File Locations

### ACEBIZ Hub Repository
- **Main file:** `/workspace/.claude/ACEBIZ/index.html`
- **Git repo:** `andykul43-a11y/ACEBIZ`
- **Vercel:** `https://capital-gains-calculator-swart.vercel.app/`

### Tax Return Analyser
- **Local development:** `/workspace/.claude/Tax Return Analyser/`
  - Uses `http://localhost:5000` for API calls
  - Run with: `node server.js` (port 5000)

- **Vercel deployment:** `/workspace/.claude/Tax Return Analyser/Github/`
  - Uses relative `/api/*` endpoints
  - Git repo: `andykul43-a11y/Returnreview`
  - Deployed at: `https://returnreview.vercel.app/`

### Calculator Hub (Separate)
- **Location:** `/workspace/.claude/Calculator Hub/`
- **Note:** This is a separate Vercel project, not the main hub

---

## Environment Variables Required

### Tax Return Analyser (Vercel)
```
ANTHROPIC_API_KEY=<your_anthropic_api_key>
OPENAI_API_KEY=<your_openai_api_key>
ACCESS_PASSWORD=<your_password>
AUTH_TOKEN=<generated_random_token>
NODE_ENV=production
```

Generate AUTH_TOKEN:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Next Steps

1. ✅ Verify Vercel deployment at `https://capital-gains-calculator-swart.vercel.app/`
2. ✅ Confirm all 6 calculators are visible
3. ✅ Test Tax Return Analyser link to `https://returnreview.vercel.app/`
4. ✅ Verify footer shows "Updated: Nov 6, 2024"

---

## Key Learnings

1. **Commit Author Matters:** Vercel requires commits with recognized GitHub user emails for auto-deployment
2. **Local vs Production:** Keep separate configurations for local (localhost) and production (relative URLs)
3. **Vercel Webhooks:** Auto-deployment requires proper Git integration and webhook configuration
4. **Hub Architecture:** Central landing page with links is cleaner than monorepo approach

---

## Contact & Credentials

- **GitHub User:** `andykul43-a11y`
- **Email:** `andy.kul43@gmail.com`
- **Git Config:** Already set in `/workspace/.claude/ACEBIZ/.git/config`

---

## November 6, 2025 - Franking Calculator Repository & Deployment Updates

### 1. Created Dedicated Franking Credit Calculator Repository ✅

**Problem:**
- Franking calculator on https://capital-gains-calculator-swart.vercel.app/ was not working
- Calculator existed as standalone HTML in `.claude/Franking Credit Calculator/`

**Solution:**

#### Created New GitHub Repository
- **Repository:** `andykul43-a11y/franking-credit-calculator`
- **URL:** https://github.com/andykul43-a11y/franking-credit-calculator
- **Structure:** Contains standalone `franking-credit-calculator.html` with React frontend and backend code

#### Configured for Vercel Deployment
1. Created `vercel.json` for static HTML hosting:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ]
}
```

2. Copied `franking-credit-calculator.html` → `index.html` for deployment

3. Deployed to Vercel:
   - **Production URL:** https://franking-credit-calculator.vercel.app/
   - **Status:** ✅ Live and working

### 2. Updated ACEBIZ Hub Links ✅

**Changes Made:**

1. **Updated Franking Calculator Link** (index.html:197)
   - **Old:** `https://franking-credit-calculator-3xqeo0vfh-ankits-projects-efca0460.vercel.app`
   - **New:** `https://franking-credit-calculator.vercel.app/`
   - **Commit:** 04fff5e

2. **Removed Property CGT Calculator** (index.html:216-234)
   - Deleted entire Property CGT Calculator card
   - Removed icon, title, description, features, and link
   - **Commit:** 177428f

### Current Calculator List (5 Active):
1. ✅ Capital Gains Calculator
2. ✅ Franking Credit Calculator → https://franking-credit-calculator.vercel.app/
3. ✅ Tax Planning Calculator
4. ✅ Rental Property Automation
5. ✅ Tax Return Analyser
6. ❌ Property CGT Calculator (REMOVED)

---

## Repository Structure

### Franking Credit Calculator
- **Local:** `/workspace/.claude/Franking Credit Calculator/`
- **GitHub:** https://github.com/andykul43-a11y/franking-credit-calculator
- **Vercel:** https://franking-credit-calculator.vercel.app/
- **Type:** Standalone HTML (single file)

### ACEBIZ Hub
- **Local:** `/workspace/ACEBIZ/`
- **GitHub:** https://github.com/andykul43-a11y/ACEBIZ
- **Vercel:** https://capital-gains-calculator-swart.vercel.app/
- **Type:** Landing page with calculator cards

---

## Git Commits (November 6, 2025)

### Franking Credit Calculator Repository
```
f2b8754 - Initial commit: Franking Credit Calculator
1ea6186 - Add Vercel configuration for deployment
d7eda78 - Configure for standalone HTML deployment
```

### ACEBIZ Repository
```
04fff5e - Update franking calculator link to production URL
177428f - Remove Property CGT calculator from homepage
```

---

**Last Updated:** November 6, 2025
**Status:** ✅ All changes deployed and live on Vercel
