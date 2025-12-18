-- Add unique constraint for announcement_reads to support upsert
ALTER TABLE public.announcement_reads 
ADD CONSTRAINT announcement_reads_announcement_user_unique 
UNIQUE (announcement_id, user_id);