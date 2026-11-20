## Run 10: compare page router fix

- **Cause:** `/compare` rendered inside the root `BrowserRouter` while each `ComparePane` mounts its own `MemoryRouter`, triggering React Router’s nested-router error and a blank page in production.
- **Fix:** In `main.tsx`, when `pathname` starts with `/compare`, mount `<Compare />` directly (no outer router). `App.tsx` uses `CompareHardRedirect` for in-app navigation (full reload). Admin uses a plain `<a href="/compare?present=1">` link.
- **Tests:** `src/pages/Compare.test.tsx` (vitest + Testing Library) asserts the headline and Auntie Mei / Arif names render without an outer router and that nesting in `BrowserRouter` throws.
- **Verify:** `npm run lint` (warnings only), `npm test`, `npm run build` passed. Preview `GET http://127.0.0.1:5173/compare?present=1` returned 200 (playwright not installed in repo). `vercel.json` SPA rewrite unchanged.