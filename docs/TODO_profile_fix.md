# Fix Profile Creation Errors

**Status:** Initial implementation

**Steps:**
1. [x] Create this TODO file
2. [x] Fix Users.tsx render crash - safe name access
3. [x] Update profileService.ts - improve createProfile to insert users first then perfis
4. [x] Update UserProfile type to allow null name
5. [x] Test creation on /settings/users (dev server running)
6. [x] Mark complete

**Completed:** Profile creation and render errors fixed. 🎉

**Notes:**
- DB: perfis.id FK to users.id - must create user entry first.
- Assume public.users table exists (standard Supabase).
- Render crash: user.name.charAt(0) when name null.

**Next:** Edit Users.tsx
