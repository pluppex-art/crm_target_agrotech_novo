# Fix Permission Glitch (Flash of Denied Content)

Status: 2/6

## Problem
Permission loading is async, causing brief 'Sem Permissão' flash on pages like Products even for admins.

## Steps
1. [x] ✅ Create this TODO
2. [ ] Update usePermissions hook: Add localStorage cache + isAdmin
3. [x] ✅ Fix src/pages/Products.tsx: Add loading spinner before permission check
4. [x] ✅ Update ProductCard.tsx: Handle permissions loading
5. [ ] Apply same pattern to other pages (Leads, Pipeline, Finance)
6. [ ] Test: Reload Products page as admin - no flash

**Run:** npm run dev → Products page → F5 reload → verify smooth load."

