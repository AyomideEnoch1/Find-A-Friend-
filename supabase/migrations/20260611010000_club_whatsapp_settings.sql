-- Migration: Add WhatsApp-style Club/Group Settings
-- Timestamp: 20260611010000

-- Add settings columns to clubs
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS settings_send_messages TEXT NOT NULL DEFAULT 'all' CHECK (settings_send_messages IN ('all', 'admins'));
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS settings_edit_info TEXT NOT NULL DEFAULT 'all' CHECK (settings_edit_info IN ('all', 'admins'));
