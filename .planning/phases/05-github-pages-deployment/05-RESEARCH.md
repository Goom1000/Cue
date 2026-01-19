# Phase 5: GitHub Pages Deployment - Research

**Researched:** 2026-01-19
**Domain:** GitHub Pages static site deployment with Vite
**Confidence:** HIGH

## Summary

GitHub Pages deployment for Vite projects is well-established with official GitHub Actions support. The key requirement is configuring Vite's `base` option to match the repository subdirectory path, then using GitHub's official Pages actions for automated deployment.

The project repository is `Goom1000/PiPi` on GitHub, meaning the deployed URL will be `goom1000.github.io/PiPi`. The base path must be `/PiPi/` (case-sensitive). This is a straightforward deployment with no custom routing requirements since the app is a single-page application without client-side routing.

**Primary recommendation:** Use the official Vite-recommended GitHub Actions workflow with `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. Configure `base: "/PiPi/"` in vite.config.ts.

## Standard Stack

The established tools for GitHub Pages deployment with Vite:

### Core Actions
| Action | Version | Purpose | Why Standard |
|--------|---------|---------|--------------|
| `actions/checkout` | v5 | Clone repository | Official GitHub action |
| `actions/setup-node` | v6 | Install Node.js with caching | Official, built-in npm caching |
| `actions/configure-pages` | v5 | Configure Pages settings | Official GitHub Pages action |
| `actions/upload-pages-artifact` | v4 | Upload build to Pages | Official GitHub Pages action |
| `actions/deploy-pages` | v4 | Deploy to GitHub Pages | Official GitHub Pages action |

### Configuration
| Tool | Configuration | Purpose |
|------|---------------|---------|
| Vite | `base: "/PiPi/"` | Correct asset paths for subdirectory |
| package.json | `npm run build` script | Build command for CI |
| TypeScript | `tsc --noEmit` | Type checking before deploy |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Official Pages actions | `peaceiris/actions-gh-pages` | Community action, deploys to gh-pages branch instead; less integrated |
| `gh-pages` npm package | GitHub Actions | Manual deployment vs automated |

**No additional packages needed** - GitHub Actions provides all deployment infrastructure.

## Architecture Patterns

### Recommended Workflow Structure
```
.github/
└── workflows/
    └── deploy.yml    # Single workflow file
```

### Pattern 1: Single-Job Deployment
**What:** Combine build and deploy in one job for simplicity
**When to use:** Simple static sites without complex build matrices
**Example:**
```yaml
# Source: https://vite.dev/guide/static-deploy.html
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5
      - name: Set up Node
        uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Type check
        run: npx tsc --noEmit
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Pattern 2: Vite Base Path Configuration
**What:** Configure Vite to generate correct asset URLs for subdirectory deployment
**When to use:** Always for GitHub Pages project sites (non-root deployment)
**Example:**
```typescript
// vite.config.ts
// Source: https://vite.dev/guide/static-deploy.html
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/PiPi/',  // Must match repository name exactly (case-sensitive)
  // ... other config
});
```

### Anti-Patterns to Avoid
- **Using full URL for base:** Use `/PiPi/` not `https://goom1000.github.io/PiPi/`
- **Deploying gh-pages branch with new workflow:** The official actions deploy directly without an intermediate branch
- **Missing trailing slash:** Use `/PiPi/` not `/PiPi`
- **Wrong case:** Use `/PiPi/` not `/pipi/` - GitHub Pages URLs are case-sensitive

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deployment workflow | Custom scripts, gh-pages npm package | Official GitHub Actions | Maintained, integrated, secure |
| Build caching | Manual cache configuration | `setup-node` with `cache: 'npm'` | Built-in, automatic cache key generation |
| Asset path handling | Manual path prefixing | Vite `base` option | Handles all assets automatically |
| Pages configuration | Manual API calls | `actions/configure-pages` | Gathers metadata, handles edge cases |

**Key insight:** GitHub's official Pages workflow is the current recommended approach, superseding older gh-pages branch methods. It's simpler, more secure (no write token needed), and better integrated.

## Common Pitfalls

### Pitfall 1: Blank Page After Deployment
**What goes wrong:** App loads but shows nothing, console shows 404 errors for JS/CSS
**Why it happens:** Missing or incorrect `base` configuration in vite.config.ts
**How to avoid:**
- Set `base: "/PiPi/"` in vite.config.ts before first deployment
- Verify case matches repository name exactly
- Test with `npm run build && npm run preview` locally
**Warning signs:** 404 errors in browser console for assets in `/assets/` path

### Pitfall 2: Workflow Doesn't Run
**What goes wrong:** Push to main but no deployment triggered
**Why it happens:** GitHub Pages not enabled or source not set to GitHub Actions
**How to avoid:**
- Enable Pages in repository Settings > Pages BEFORE pushing workflow
- Select "GitHub Actions" as the source, not a branch
- Ensure repository is public (or have GitHub Pro for private pages)
**Warning signs:** No workflow runs appearing in Actions tab

### Pitfall 3: Type Check Fails in CI
**What goes wrong:** Build fails on TypeScript errors that didn't appear locally
**Why it happens:** CI uses clean install, stricter environment
**How to avoid:**
- Run `npx tsc --noEmit` locally before pushing
- Fix all TypeScript errors before deploying
- Add type check step before build in workflow
**Warning signs:** Red X on workflow, error mentioning TypeScript

### Pitfall 4: Permission Denied Errors
**What goes wrong:** Deploy step fails with permission error
**Why it happens:** Missing required permissions in workflow
**How to avoid:**
- Include all three permissions: `contents: read`, `pages: write`, `id-token: write`
- Permissions must be at job level or workflow level
**Warning signs:** "Resource not accessible by integration" error

### Pitfall 5: Environment Not Found
**What goes wrong:** Deploy fails saying github-pages environment doesn't exist
**Why it happens:** Pushing workflow before enabling Pages
**How to avoid:**
- Enable GitHub Pages in Settings FIRST
- The environment is auto-created when Pages is enabled
**Warning signs:** Error mentioning "environment" or "github-pages"

## Code Examples

Verified patterns from official sources:

### Complete vite.config.ts for GitHub Pages
```typescript
// Source: Current project + Vite docs
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: '/PiPi/',  // GitHub Pages subdirectory
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
```

### TypeScript Check Script Addition
```json
// package.json scripts section
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  }
}
```

### Local Build Verification
```bash
# Before pushing, verify build works locally
npm run build
npm run preview
# Visit http://localhost:4173/PiPi/ to verify
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| gh-pages branch | GitHub Actions direct deploy | 2022-2023 | Simpler, no separate branch needed |
| `GITHUB_TOKEN` write permissions | OIDC `id-token: write` | 2022-2023 | More secure, fewer token permissions |
| `actions/deploy-pages@v1` | `@v4` | 2024 | Better OIDC, improved reliability |
| `actions/setup-node@v3` | `@v6` | 2025 | Node 24 support, automatic caching |
| Manual npm cache | Built-in `cache: 'npm'` | 2023-2025 | Zero config caching |

**Deprecated/outdated:**
- `peaceiris/actions-gh-pages`: Still works but official actions are preferred
- gh-pages npm package: Manual deployment, replaced by Actions
- Deploying to gh-pages branch: Older pattern, new pattern uses artifacts directly

## SPA Routing Considerations

**This project does NOT use client-side routing** (no React Router, no route paths). The app is a single entry point with modal-based navigation.

If routing were added later:
- Would need `<BrowserRouter basename="/PiPi">` to match base path
- Would need 404.html copy: `cp dist/index.html dist/404.html` in build script
- Or use HashRouter for simpler solution: `/#/path` URLs

**No action needed for current phase** - the app has no routing.

## Open Questions

All questions resolved. The deployment pattern is well-documented and straightforward.

## Sources

### Primary (HIGH confidence)
- [Vite Static Deployment Guide](https://vite.dev/guide/static-deploy.html) - Official workflow and base configuration
- [GitHub Docs: Custom Workflows for Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) - Official workflow structure
- [actions/deploy-pages](https://github.com/actions/deploy-pages) - Current v4 action documentation
- [actions/setup-node](https://github.com/actions/setup-node) - Current v6 with caching

### Secondary (MEDIUM confidence)
- [GitHub Community Discussions](https://github.com/orgs/community/discussions/61478) - Verified troubleshooting patterns
- [Vite GitHub Discussions](https://github.com/vitejs/vite/discussions/10575) - Base path issues

### Tertiary (LOW confidence)
- Various blog posts on deployment - Cross-referenced with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official GitHub actions with clear versioning
- Architecture: HIGH - Vite official documentation provides exact workflow
- Pitfalls: HIGH - Well-documented common issues with verified solutions
- Base path: HIGH - Confirmed repository name is `PiPi`, URL will be case-sensitive

**Research date:** 2026-01-19
**Valid until:** 90 days (deployment patterns are stable)
