# Progressive Web App (PWA) Setup

PWA implementation for your Next.js app. Users can install your app on their homescreen and use it offline.

---

## ⚡ Quick Start (5 Minutes)

### Already Done ✅
- ✅ Service worker created (`public/sw.js`)
- ✅ PWA context setup (`lib/pwa-context.tsx`)
- ✅ Components added (`components/install-prompt.tsx`, `components/offline-indicator.tsx`)
- ✅ Manifest configured (`app/manifest.ts`) with your real app details
- ✅ Layout updated (`app/layout.tsx`)

### Next Steps

1. **Test locally with HTTPS:**
   ```bash
   next dev --experimental-https
   # or
   mkcert localhost
   next dev
   ```

2. **Check PWA in browser:**
   - Open `https://localhost:3000`
   - DevTools → Application → Manifest (should show your app name)
   - DevTools → Application → Service Workers (should show registered)
   - Wait 3 seconds → Install prompt appears at bottom

3. **Test offline mode:**
   - DevTools → Network → check "Offline"
   - Refresh page → red "You're offline" banner appears
   - Page still loads from cache

4. **Deploy:**
   ```bash
   npm run build
   npm run start
   # or: vercel deploy
   ```

---

## 🎯 User Experience Flow

### First Visit
1. User visits your app
2. Service worker registers (background)
3. After 3 seconds → install prompt shows at bottom
4. **Android:** Shows "Install" button
5. **iOS:** Shows manual "Add to Home Screen" instructions

### After Install
1. User clicks "Install" (or manually adds on iOS)
2. App added to homescreen
3. User taps homescreen icon
4. App launches **fullscreen** (no browser UI)
5. Can work **offline** with cached pages

### Offline Usage
1. User loses internet → red "You're offline" bar appears
2. App still works (cached assets served)
3. Can view cached pages, use local data
4. User comes back online → bar disappears
5. Can now sync/collaborate

### New Version Available
1. You deploy new code
2. Service worker detects update
3. Blue "Update available" banner shows
4. User clicks "Update"
5. Page reloads with new code

---

## 🏗️ How It Works

### Files Created

```
your-app/
├── public/
│   └── sw.js                    ← Service worker (offline caching)
├── lib/
│   └── pwa-context.tsx          ← PWA state management
├── components/
│   ├── install-prompt.tsx       ← Install button/instructions
│   └── offline-indicator.tsx    ← Online/offline + update badge
├── app/
│   ├── manifest.ts              ← App metadata (name, icons, colors)
│   ├── offline.html             ← Fallback page when offline
│   └── layout.tsx               ← UPDATED: PWA providers
└── next.config.js               ← UPDATED: SW security headers
```

### Service Worker (`public/sw.js`)

**What it does:**
- Precaches your app's HTML, JS, CSS on first visit
- Caches fonts for 90 days
- Caches images for 30 days
- Serves cached assets when offline
- Shows `offline.html` if page not cached

**Caching Strategy:**
```
HTML/JS/CSS  → Network-first (try fresh, fallback to cache)
Fonts        → CacheFirst (use cache, update later)
Images       → CacheFirst (use cache, update later)
API calls    → Network-first (try API, fallback to offline error)
```

### PWA Context (`lib/pwa-context.tsx`)

**State tracked:**
- `isOnline` - true/false (window.navigator.onLine)
- `canInstall` - true if beforeinstallprompt event fired
- `updateAvailable` - true if new SW detected
- `isIOS` - true for iPhone/iPad
- `isStandalone` - true if app installed

**What it does:**
- Registers service worker
- Listens for install prompt
- Detects online/offline
- Checks for SW updates hourly
- Provides `usePwa()` hook to components

### Install Prompt Component

**Android:**
```
┌─────────────────────────────────┐
│ Get instant access from your    │
│ home screen                     │
│                                 │
│ [Later]     [Install ⬇️]         │
└─────────────────────────────────┘
```

**iOS:**
```
┌─────────────────────────────────┐
│ Install App                     │
│                                 │
│ Tap the share icon ⎋ and then  │
│ "Add to Home Screen" ➕          │
│                       [✕]      │
└─────────────────────────────────┘
```

### Offline Indicator Component

Shows when:
- User is **offline** → red bar "You're offline"
- **Update available** → blue bar "New version available" + button

---

## 🧪 Testing

### Local Testing (Browser)

**Requirements:**
- HTTPS (required for service workers)
- Use `next dev --experimental-https`

**Checklist:**
```
[ ] Service worker registers
    DevTools → Application → Service Workers → should show /sw.js

[ ] Manifest loads with your app name
    DevTools → Application → Manifest → name: "daveclintonn"

[ ] Install prompt shows
    Wait 3 seconds at https://localhost:3000 → banner at bottom

[ ] Offline mode works
    DevTools → Network → check "Offline" → red bar appears

[ ] Update detection works
    Modify public/sw.js → SW detects change → blue update banner

[ ] Offline page loads
    Go offline → navigate to uncached page → shows offline.html
```

### Device Testing (Real Phone)

**Android (Chrome/Edge):**
1. Visit `https://your-domain.com`
2. Wait 3 seconds → "Install" button appears
3. Click → native install dialog
4. App added to homescreen
5. Tap homescreen icon → fullscreen app
6. Turn off WiFi → still works
7. Status bar shows "You're offline"

**iOS (Safari):**
1. Visit `https://your-domain.com`
2. See "Add to Home Screen" instructions
3. Manually follow instructions
4. App added to homescreen
5. Tap → fullscreen app
6. Airplane mode → still works
7. Status bar shows "You're offline"

**Desktop (Chrome/Edge):**
1. Visit your app
2. Star icon appears in address bar
3. Click → install dialog
4. App added to Start menu / Applications
5. Launch → standalone window
6. Works offline

---

## 🔧 Customization

### Change Install Prompt Timing

**File:** `lib/pwa-context.tsx`

```typescript
// Change 3000 (3 seconds) to show earlier or later
const timeout = setTimeout(() => setIsVisible(true), 1000)  // 1 second
```

### Change Colors

**File:** `app/manifest.ts`

```typescript
theme_color: '#667eea',        // Your brand color
background_color: '#f5f5f5',   // Splash screen color
```

### Change App Name/Description

**File:** `app/seo.ts` (already has your real values)

```typescript
export const siteConfig = {
  name: 'daveclintonn',
  title: 'daveclintonn',
  description: 'Your description here',
  // ...
}
```

### Customize Offline Page

**File:** `app/offline.html`

Edit the HTML to match your branding/messaging.

### Add Analytics Tracking

**File:** `lib/pwa-context.tsx`, in `installApp()`:

```typescript
const installApp = async () => {
  if (!deferredPrompt) return
  
  // Track install attempt
  analytics.track('pwa_install_clicked')
  
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  
  // Track result
  analytics.track('pwa_install_' + outcome)
}
```

### Add Data Persistence (IndexedDB)

For advanced features like saving drawings offline:

```typescript
// lib/offline-storage.ts
export class OfflineStorage {
  async save(id: string, data: any) {
    const db = await this.getDb()
    const tx = db.transaction(['items'], 'readwrite')
    tx.objectStore('items').put({ id, data, timestamp: Date.now() })
  }

  async get(id: string) {
    const db = await this.getDb()
    const tx = db.transaction(['items'], 'readonly')
    const result = await tx.objectStore('items').get(id)
    return result?.data
  }
}

// In your component:
const storage = new OfflineStorage()
await storage.save('drawing-1', { /* data */ })
const data = await storage.get('drawing-1')
```

---

## 🐛 Debugging & Troubleshooting

### Service Worker Not Registering?

```javascript
// DevTools Console:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Active SWs:', regs)
  regs.forEach(reg => {
    console.log('Scope:', reg.scope)
    console.log('Active:', reg.active?.state)
    console.log('Waiting:', reg.waiting?.state)
  })
})
```

### Check Cache Contents

```javascript
// DevTools Console:
caches.keys().then(names => {
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(requests => {
        console.log(`Cache: ${name}`, requests.map(r => r.url))
      })
    })
  })
})
```

### Clear All Caches (Start Fresh)

```javascript
// DevTools Console:
caches.keys().then(names => {
  Promise.all(names.map(name => caches.delete(name)))
})

// Then: Unregister SW
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.unregister())
})

// Then: Hard refresh (Ctrl+Shift+R)
```

### Offline Indicator Stuck?

```javascript
// Manually trigger events:
window.dispatchEvent(new Event('online'))   // Test online
window.dispatchEvent(new Event('offline'))  // Test offline
```

### Icons Not Showing?

- [ ] Icons exist in `public/` folder
- [ ] File paths in `manifest.ts` start with `/`
- [ ] PNG files, not SVG (for reliability)
- [ ] Check DevTools → Application → Manifest → Icons section

### Install Prompt Not Showing?

Browser requires:
- [ ] HTTPS enabled ✓
- [ ] Manifest valid ✓
- [ ] Service worker registered ✓
- [ ] User engaged (2+ minutes on site) ✓
- [ ] Not visited before (caches for 3 months)

**Note:** iOS doesn't support `beforeinstallprompt` — show manual instructions instead (already done in `components/install-prompt.tsx`)

---

## 📱 Platform Support

| Feature | Android | iOS 16.4+ | Desktop | Firefox |
|---------|---------|-----------|---------|---------|
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| Install Prompt | ✅ | ❌ | ✅ | ❌ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ |
| File Handlers | ✅ | ❌ | ✅ | ⚠️ |
| Share Target | ✅ | ⚠️ | ✅ | ✅ |

**iOS Note:** Use manual "Add to Home Screen" instructions (already implemented).

---

## ❓ FAQ

**Q: Why does the install prompt not show on my first visit?**
A: Browser requires user to be "engaged" (2+ min on site, some interaction). Try refreshing after 30 seconds.

**Q: Can I force the install prompt?**
A: No, browser heuristics control it. Show a custom button as fallback (already done).

**Q: How much storage do I get offline?**
A: Android: unlimited. iOS: 50MB. Be selective with what you cache.

**Q: What if user goes offline during data sync?**
A: SW intercepts API calls, returns error. Your code should queue & retry later.

**Q: Can I make users update to new version?**
A: Yes, show blocking modal until they click "Update", or auto-reload after timeout.

**Q: Why no icons in manifest?**
A: Icons use `favicon.ico` by default. Generate real icons with [favicon.io](https://favicon.io) if needed.

**Q: Does this work in Safari desktop?**
A: Limited support. Service workers work, but no install prompt.

**Q: How do I track PWA installs?**
A: Add analytics in `lib/pwa-context.tsx` `installApp()` function (see Customization section).

---

## ✅ Deployment Checklist

Before deploying to production:

- [ ] HTTPS enabled (required)
- [ ] `next.config.js` has SW headers configured
- [ ] `app/manifest.ts` uses your real app name
- [ ] `app/offline.html` created
- [ ] Service worker works (test locally)
- [ ] Offline mode works (test with DevTools offline)
- [ ] Tested on Android device
- [ ] Tested on iOS device
- [ ] Install prompt shows (wait 3+ sec)
- [ ] Update detection works

---

## 🔗 Resources

- [Web.dev PWAs](https://web.dev/progressive-web-apps/)
- [MDN Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

## 📞 Quick Reference

| Need Help With | File | Line |
|---|---|---|
| Service worker caching | `public/sw.js` | - |
| Install prompt logic | `lib/pwa-context.tsx` | 40-80 |
| Install button UI | `components/install-prompt.tsx` | - |
| Offline badge UI | `components/offline-indicator.tsx` | - |
| App name/description | `app/seo.ts` | - |
| Theme colors | `app/manifest.ts` | 8-9 |
| Update the manifest | `app/manifest.ts` | - |

---

**Your PWA is ready!** Test locally, then deploy. 🚀
