-- Add styling and media columns to public.app_ads table for banner customization.
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS gradient_end TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS text_color TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS badge_text TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS badge_color TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS badge_text_color TEXT;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS overlay_opacity INTEGER DEFAULT 20;
ALTER TABLE public.app_ads ADD COLUMN IF NOT EXISTS text_align TEXT;
