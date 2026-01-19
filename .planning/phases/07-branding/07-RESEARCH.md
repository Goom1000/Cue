# Phase 7: Branding - Research

**Researched:** 2026-01-19
**Domain:** Static asset management, CSS image techniques, favicon generation
**Confidence:** HIGH

## Summary

This phase involves replacing LessonLens branding with PiPi identity across the application. The scope is limited to four specific locations: header logo (replacing icon + text), page title, favicon, and ResourceHub watermark. No color or typography changes are involved.

The key technical decisions involve:
1. **Asset handling:** Vite's `public` directory for static assets (favicon, logo)
2. **JPEG background handling:** CSS `mix-blend-mode: multiply` for visual transparency OR convert to PNG for true transparency
3. **Favicon:** Modern approach using PNG (no ICO file needed for 2025+ browsers)

**Primary recommendation:** Create a `public/` directory, place the logo there, use CSS `mix-blend-mode: multiply` for white-background JPEG handling, and generate a simple 48x48 PNG favicon derived from the logo.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 6.2.0 | Build tool with static asset handling | Already configured, handles public directory |
| React | 19.2.0 | UI framework | Already in use |
| Tailwind (CDN) | Latest | Styling | Already in use via CDN |

### Supporting (No New Dependencies Needed)
This phase requires NO new dependencies. All branding changes can be accomplished with:
- Static file placement in `public/` directory
- CSS styling changes
- HTML `<title>` and `<link rel="icon">` updates

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual PNG conversion | `vite-plugin-favicon` | Plugin is overkill for single logo swap |
| CSS mix-blend-mode | Image editing to remove BG | Requires external tool, user asked Claude to handle |
| PNG favicon | ICO file | ICO deprecated, PNG works in all modern browsers |

## Architecture Patterns

### Recommended Project Structure
```
public/               # NEW - create this directory
  favicon.png         # 48x48 derived from logo
  logo.png            # Main logo (converted from JPEG or original JPEG)
src/                  # Existing structure unchanged
```

### Pattern 1: Vite Public Directory for Static Assets
**What:** Place assets in `public/` directory, reference with absolute paths
**When to use:** Assets not processed by build (favicons, logos with fixed names)
**Example:**
```typescript
// Source: https://vite.dev/guide/assets
// File at: public/logo.png
// Reference as:
<img src="/logo.png" alt="PiPi Logo" />

// With base path configured ('/PiPi/'), reference as:
<img src="/PiPi/logo.png" alt="PiPi Logo" />
```

**CRITICAL:** This project has `base: '/PiPi/'` in vite.config.ts. All public asset references must include this base path OR use Vite's import system.

### Pattern 2: CSS Background Removal with mix-blend-mode
**What:** Visually remove white background from JPEG without image editing
**When to use:** JPEG logo with white background on known background color
**Example:**
```css
/* Source: https://jamesauble.com/blog/remove-white-background-of-an-image-with-mix-blend-mode-multiply/ */
.logo {
  mix-blend-mode: multiply;
}
```

**Limitations:**
- Works only on white/light backgrounds
- Background must be solid color (not transparent parent containers)
- Colors may shift slightly on non-white backgrounds
- The white is visually hidden, not truly removed

### Pattern 3: Modern Favicon Setup (2025 Minimalist)
**What:** Single PNG favicon instead of multiple ICO sizes
**When to use:** Modern browser targeting (Chrome, Firefox, Safari, Edge)
**Example:**
```html
<!-- Source: https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs -->
<link rel="icon" type="image/png" sizes="48x48" href="/PiPi/favicon.png">
```

### Anti-Patterns to Avoid
- **Importing logo via ES modules:** Would hash the filename, making URL unpredictable
- **Generating ICO files:** Unnecessary complexity for modern browsers
- **Using vite-plugin-favicon:** Overkill for single logo swap, adds dependencies
- **Inline base64 encoding large logos:** Would bloat HTML, defeat caching

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image background removal | Canvas/JavaScript processing | CSS mix-blend-mode OR pre-convert to PNG | CSS is simpler, works instantly |
| Favicon generation | Custom resize code | Manual resize in Preview/online tool | One-time operation, not worth automating |
| Asset path resolution | Custom path logic | Vite's public directory conventions | Vite already handles this correctly |

**Key insight:** This phase is entirely static asset management with minimal code changes. The complexity is in getting file paths right with Vite's base path configuration.

## Common Pitfalls

### Pitfall 1: Forgetting Vite Base Path
**What goes wrong:** Logo shows in dev (`/logo.png`) but 404s in production
**Why it happens:** Project has `base: '/PiPi/'` configured in vite.config.ts
**How to avoid:** Always reference public assets as `/PiPi/logo.png` OR use `import.meta.env.BASE_URL`
**Warning signs:** Works in `npm run dev`, breaks in `npm run build && npm run preview`

### Pitfall 2: mix-blend-mode on Transparent Containers
**What goes wrong:** Logo inherits blend mode through nested containers, looks wrong
**Why it happens:** mix-blend-mode blends with the nearest stacking context, not just parent
**How to avoid:** Ensure logo's immediate parent has explicit background-color
**Warning signs:** Logo looks correct in some views but wrong in others

### Pitfall 3: Dark Mode Incompatibility with mix-blend-mode
**What goes wrong:** Logo looks great in light mode, invisible/wrong in dark mode
**Why it happens:** multiply blend mode makes white transparent - on dark background, entire logo darkens
**How to avoid:** Either convert to true PNG with transparency, OR use different blend modes per theme
**Warning signs:** Test in both light and dark mode before committing

### Pitfall 4: ResourceHub Print View Breaks
**What goes wrong:** Watermark logo doesn't appear in printed documents
**Why it happens:** Print stylesheets may not load external images, or blend modes may not print
**How to avoid:** Test print preview; may need `print-color-adjust: exact`
**Warning signs:** Check ResourceHub print output explicitly

### Pitfall 5: Favicon Not Updating in Browser
**What goes wrong:** Old LessonLens favicon persists after change
**Why it happens:** Browsers aggressively cache favicons
**How to avoid:** Clear browser cache during testing, or add cache-busting query param temporarily
**Warning signs:** Works in incognito, old favicon in normal browsing

## Code Examples

### Current Branding Locations (to be changed)

**Header (App.tsx line 524-527):**
```tsx
// CURRENT - to be replaced
<div className="w-8 h-8 bg-indigo-600 dark:bg-amber-500 rounded-lg flex items-center justify-center text-white dark:text-slate-900 font-fredoka font-bold text-lg shadow-md shadow-indigo-900/10 dark:shadow-amber-500/20">L</div>
<h1 className="font-fredoka text-xl font-bold text-slate-800 dark:text-white tracking-tight">LessonLens</h1>
```

**Page Title (index.html line 7):**
```html
<!-- CURRENT - to be changed -->
<title>LessonLens - AI Presentation Creator</title>
```

**ResourceHub Watermark (ResourceHub.tsx line 160, 376):**
```tsx
// CURRENT - to be changed
<span>Created with LessonLens</span>
// and
<span>LessonLens</span>
```

### Replacement Patterns

**Header Logo Replacement:**
```tsx
// NEW - logo image only (no text beside it per CONTEXT.md)
<img
  src="/PiPi/logo.png"
  alt="PiPi"
  className="h-8 w-auto mix-blend-multiply dark:mix-blend-normal"
/>
```

**Page Title:**
```html
<title>PiPi</title>
```

**Favicon:**
```html
<link rel="icon" type="image/png" sizes="48x48" href="/PiPi/favicon.png">
```

**ResourceHub Watermark (small logo):**
```tsx
<img
  src="/PiPi/logo.png"
  alt="PiPi"
  className="h-4 w-auto opacity-40 mix-blend-multiply"
/>
```

### Dark Mode Consideration

If using mix-blend-mode with JPEG, dark mode needs special handling:
```tsx
// Option A: Different blend mode per theme
className="mix-blend-multiply dark:mix-blend-screen dark:invert"

// Option B: Convert to true transparent PNG (recommended)
// Then no blend mode needed:
className="h-8 w-auto"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| favicon.ico required | PNG favicon sufficient | 2020+ | Simpler setup, single file |
| Multiple favicon sizes | 48x48 PNG covers 99% | 2023+ | Reduced complexity |
| ICO for IE compatibility | Modern browsers only | IE deprecated | No ICO generation needed |

**Deprecated/outdated:**
- favicon.ico format: Not required for modern browsers (Chrome, Firefox, Safari, Edge all support PNG)
- Multiple favicon sizes (16x16, 32x32, 48x48 separately): 48x48 scales well for most uses

## Open Questions

1. **JPEG Background Complexity**
   - What we know: User will provide JPEG, Claude handles background removal
   - What's unclear: Is the JPEG background pure white? Does logo have white elements?
   - Recommendation: Try mix-blend-mode first. If logo has internal white that shouldn't be transparent, convert to PNG manually.

2. **Dark Mode Logo Appearance**
   - What we know: App has dark mode toggle, mix-blend-mode may not work identically
   - What's unclear: User's expectation for logo appearance in dark mode
   - Recommendation: Test thoroughly. May need to convert JPEG to transparent PNG for consistent appearance.

## Sources

### Primary (HIGH confidence)
- [Vite Static Asset Handling](https://vite.dev/guide/assets) - Public directory conventions, base path handling
- [Evil Martians Favicon Guide](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs) - Modern favicon best practices
- [Favicon.im Complete Guide 2025](https://favicon.im/blog/complete-favicon-size-format-guide-2025) - Favicon sizes and formats

### Secondary (MEDIUM confidence)
- [James Auble mix-blend-mode Guide](https://jamesauble.com/blog/remove-white-background-of-an-image-with-mix-blend-mode-multiply/) - CSS background removal technique
- [Webflow Favicon Guide](https://webflow.com/blog/favicon-guide) - Favicon fundamentals
- [ThatSoftwareDude Vite Assets](https://www.thatsoftwaredude.com/content/14144/public-vs-src-assets-when-to-use-each-approach-in-vite) - Public vs src assets in Vite

### Codebase Analysis (HIGH confidence)
- `vite.config.ts` - Confirmed `base: '/PiPi/'` configuration
- `index.html` - Current title and structure identified
- `App.tsx` - Header branding location identified (lines 524-527)
- `ResourceHub.tsx` - Watermark locations identified (lines 160, 376)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vite documentation is authoritative, no new deps needed
- Architecture: HIGH - Public directory pattern is well-documented
- Pitfalls: HIGH - Base path issue is specific to this codebase, verified
- mix-blend-mode: MEDIUM - Works for white backgrounds, dark mode needs testing

**Research date:** 2026-01-19
**Valid until:** No expiration - static asset patterns are stable
