-- Fix: Add FK from system_announcements.created_by to profiles.user_id
-- PostgREST needs this FK to resolve the join:
--   .select("*, profiles:created_by(full_name)")
-- Without it, PostgREST returns 400 because the existing FK points to auth.users, not profiles.

ALTER TABLE system_announcements
  ADD CONSTRAINT system_announcements_created_by_profile_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(user_id) ON DELETE SET NULL;
