The "black screen" on mobile devices is likely caused by a combination of high-radius CSS blurs (which can crash mobile GPUs), potential JavaScript crashes in specific browser environments (like `localStorage` access or `NodeJS` type references), and possibly a permanent full-screen overlay in some variations of the page.

I will:
1.  **Reduce/Optimize Blurs**: Lower the blur radius from `100px-180px` to more manageable values (or use simpler gradients) on the main Instagram Nova pages. High blur values are known to cause rendering failures on mobile.
2.  **Fix Potential JS Crashes**:
    *   Change `NodeJS.Timeout` to `any` in `useRef` to avoid potential `ReferenceError` in some browser environments.
    *   Ensure all `localStorage` access is safely wrapped.
3.  **Optimize Overlays**: In `InstagramNovaP.tsx` and `InstagramNovaPromo.tsx`, make sure the "Promoção Encerrada" overlay is not unintentionally blocking users or crashing the render.
4.  **Meta Pixel Optimization**: Ensure the manual Pixel injection doesn't interfere with the React app initialization.

Specifically for `InstagramNovaPlan.tsx`:
- Reduce `blur-[120px]` and `blur-[100px]` to `blur-[60px]` or use `opacity-50` with smaller blurs.
- Fix `usernameCheckTimeoutRef` type.
- Add a check for `window` before accessing certain properties.

For `InstagramNovaP.tsx` and `InstagramNovaPromo.tsx`:
- Reduce blurs.
- Fix the permanent overlay that might be showing up as a "black screen" to users.

Technical Details:
- Files: `src/pages/InstagramNovaPlan.tsx`, `src/pages/InstagramNovaP.tsx`, `src/pages/InstagramNovaPromo.tsx`.
- Change `blur-[120px]` -> `blur-[60px]`.
- Change `useRef<NodeJS.Timeout | null>` -> `useRef<any | null>`.
