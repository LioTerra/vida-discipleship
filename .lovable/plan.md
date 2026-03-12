

## Problem

Two issues identified:

1. **Admin bottom nav is missing "Discipulado" tab** -- The admin role's bottom nav only has Início, Ensino, Usuários, and Config. It lacks the Discipulado and Meus Discípulos links. The sidebar has the same gap for admin on mobile (bottom nav is the only nav on mobile).

2. **Admin sidebar also missing Discipulado for admins who are mentees** -- The sidebar includes Discipulado for all roles, so desktop is fine. But on mobile, admin users cannot access `/app/discipulado` or `/app/meus-discipulos`.

## Plan

### 1. Update admin bottom nav to include Discipulado

In `src/components/BottomNav.tsx`, update the `admin` array to include all relevant tabs. Since there are space constraints on mobile (max ~5 tabs), restructure admin bottom nav to:

```
admin: [
  Início, Ensino, Discipulado, Discípulos, Usuários
]
```

This adds Discipulado (Heart icon) and Meus Discípulos (Users2 icon) while keeping Usuários. Config can be accessed from desktop sidebar -- it's less critical for mobile bottom nav. Alternatively, keep 5 items max for good UX.

### 2. No database changes needed

The network requests show that Leonardo's mentorship with Pastor Domingo exists and is active (id: `657bc863-...`). The RLS policies already allow participants to read their own mentorships. The data loads correctly. The only issue is navigation -- the admin can't reach the Discipulado page on mobile.

### Technical Details

- File: `src/components/BottomNav.tsx` -- Change the `admin` array to include Discipulado and Meus Discípulos tabs
- No RLS or database changes required
- No changes to the Discipulado page itself -- it already queries mentorships where the user is mentor OR mentee

