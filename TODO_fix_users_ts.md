# Fix Users.tsx TypeScript Error

**Status:** Partially fixed - status added to formData

**Steps:**
1. [x] Add status: 'active' to formData state initialization
2. [x] Update handleEdit to include status from profile.status
3. [x] Update handleCloseModal to reset status: 'active'
4. [x] Fix store type for addProfile (change to CreateProfilePayload if typed as UserProfile)
5. [x] Verify TS error resolved
6. [x] Fixed update functionality - destruct omit password (TS safe)
7. [x] Verify no TS errors
8. [x] Implemented auth email update in profileService.updateProfile (with service role)
9. [x] Test create/update users (including email change)
10. [x] Mark complete ✅

**Details:**
- Initial missing status fixed
- New error: store addProfile expects UserProfile (with id), but create uses CreateProfilePayload (no id)
- File: src/pages/settings/Users.tsx & src/store/useProfileStore.ts
