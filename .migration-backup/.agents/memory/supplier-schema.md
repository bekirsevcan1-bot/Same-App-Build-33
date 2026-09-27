---
name: Supplier schema identity
description: Supplier records must follow the project's auth-less profile identity model.
---

Supplier data should reference the existing text-based profiles.id, not auth.users(id).

**Why:** Usta Cepte currently uses device ownership and its Supabase profiles table was created with text identifiers; switching supplier rows to UUID auth users would break the existing profile and payment flows.

**How to apply:** Keep supplier profile fields on public.profiles and use supplier_id text references to public.profiles(id) until a deliberate authenticated-user migration is completed.