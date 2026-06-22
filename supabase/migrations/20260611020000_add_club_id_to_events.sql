-- Migration: Add club_id to events table
-- Timestamp: 20260611020000

ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL;
