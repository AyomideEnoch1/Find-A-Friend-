-- =================================================================================
-- Cleanup old JSON strings in notifications table
-- =================================================================================

UPDATE public.notifications
SET body = public.format_message_preview(body)
WHERE type = 'new_message' AND body LIKE '{%';
