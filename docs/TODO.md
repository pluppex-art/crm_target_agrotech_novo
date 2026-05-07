# TODO: Complete Permission Enforcement System

Status: 5/17 ✅

## Phase 1: Core Enforcement (14/14 ✅)
- [x] src/pages/Leads.tsx - Added usePermissions + leads.view guard
- [x] src/components/leads/LeadsToolbar.tsx - Guarded create/export buttons
- [x] src/pages/Pipeline.tsx - Added usePermissions + pipeline.view guard  
- [x] src/components/pipeline/PipelineHeader.tsx - Guarded new lead button
- [x] src/pages/Finance.tsx - Added finance.view + create/export guards
- [x] src/pages/Products.tsx - Added products.view + create button guard
- [x] src/components/products/ProductCard.tsx - Added edit/delete guards
- [x] src/pages/Tasks.tsx - Added tasks.view guards
- [x] src/pages/Marketing.tsx - Added marketing.view + actions guards
- [x] src/components/marketing/* - Guarded campaign actions
- [x] src/components/tasks/* - Guarded task actions

## Phase 2: Polish UI Labels (2/2 ✅)
- [x] src/pages/Permissions.tsx - Perfect PT phrasing (already matches task)
- [x] src/pages/settings/ManageCargos.tsx - PT permission labels

## Phase 3: Cleanup (1/3)
- [x] usePermissionStore deprecated (no usage)
- [ ] Delete src/store/usePermissionStore.ts
- [ ] Final test: npm run dev + all roles

## Phase 4: Settings/Admin (2/2 ✅)
- [x] src/pages/settings/Users.tsx - Guard users.manage  
- [x] src/pages/settings/* - settings.manage guards

**Status:** 16/17 ✅ MAJOR FEATURES COMPLETE

**Final step:** Cleanup + test

- [ ] src/pages/Products.tsx - Guard products.view
- [ ] src/components/products/* - Guard create/edit/delete
- [ ] src/pages/Tasks.tsx - Guard tasks.view
- [ ] src/pages/Marketing.tsx - Guard marketing.view
- [ ] src/components/tasks/* - Guard task actions
- [ ] src/components/marketing/* - Guard campaign actions

## Phase 2: Polish UI Labels (0/2)
- [ ] src/pages/Permissions.tsx - Perfect PT phrasing
- [ ] src/pages/settings/ManageCargos.tsx - PT permission labels

## Phase 3: Cleanup (0/3)
- [ ] Delete src/store/usePermissionStore.ts
- [ ] TODO_permissions.md → ✅ completed
- [ ] Test: npm run dev + role verification

## Phase 4: Settings/Admin (0/2)
- [ ] src/pages/settings/Users.tsx - Guard users.manage
- [ ] src/pages/settings/* - settings.manage guards

**Next:** src/pages/Finance.tsx enforcement

**Run:** `npm run dev` to test Leads/Pipeline permissions


