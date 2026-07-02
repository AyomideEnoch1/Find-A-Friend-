/**
 * fix-rds-schema.js
 * Temporary VPC Lambda that connects to AWS RDS to:
 * 1. Redefine public.trg_fn_push_notification() as a no-op to remove the pg_net / net schema dependency.
 * 2. Run the Anonymous Board Admin Enhancements (is_anonymous_linked column, policies).
 */

const { Client } = require('pg');

exports.handler = async function(event, context) {
  const client = new Client({
    host: process.env.RDS_HOST,
    port: 5432,
    database: 'faf_db',
    user: 'postgres',
    password: process.env.RDS_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  const results = [];

  try {
    await client.connect();
    console.log('Connected to RDS. Running database fixes...');

    const queries = [
      // 1. Redefine trg_fn_push_notification to be a no-op (no pg_net)
      {
        label: 'Redefine public.trg_fn_push_notification to no-op',
        sql: `
          CREATE OR REPLACE FUNCTION public.trg_fn_push_notification()
          RETURNS TRIGGER AS $$
          BEGIN
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },

      // 2. Add is_anonymous_linked column to events
      {
        label: 'Add is_anonymous_linked to events',
        sql: `ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_anonymous_linked BOOLEAN DEFAULT false;`
      },

      // 3. Update posts deletion policy to allow admins
      {
        label: 'Recreate posts: delete own policy',
        sql: `
          DROP POLICY IF EXISTS "posts: delete own" ON public.posts;
          CREATE POLICY "posts: delete own" ON public.posts
            FOR DELETE USING (
              auth.uid() = author_id OR 
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },

      // 4. Update events insert, update, delete policies to allow admins
      {
        label: 'Recreate events: organizer insert policy',
        sql: `
          DROP POLICY IF EXISTS "events: organizer insert" ON public.events;
          CREATE POLICY "events: organizer insert" ON public.events
            FOR INSERT WITH CHECK (
              auth.uid() = organizer_id OR
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },
      {
        label: 'Recreate events: organizer update policy',
        sql: `
          DROP POLICY IF EXISTS "events: organizer update" ON public.events;
          CREATE POLICY "events: organizer update" ON public.events
            FOR UPDATE USING (
              auth.uid() = organizer_id OR
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },
      {
        label: 'Recreate events: organizer delete policy',
        sql: `
          DROP POLICY IF EXISTS "events: organizer delete" ON public.events;
          CREATE POLICY "events: organizer delete" ON public.events
            FOR DELETE USING (
              auth.uid() = organizer_id OR
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },

      // 5. Enable RLS on system_settings and add policies
      {
        label: 'Enable RLS on system_settings',
        sql: `ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;`
      },
      {
        label: 'Recreate system_settings: read all policy',
        sql: `
          DROP POLICY IF EXISTS "system_settings: read all" ON public.system_settings;
          CREATE POLICY "system_settings: read all" ON public.system_settings
            FOR SELECT USING (true);
        `
      },
      {
        label: 'Recreate system_settings: admin write policy',
        sql: `
          DROP POLICY IF EXISTS "system_settings: admin write" ON public.system_settings;
          CREATE POLICY "system_settings: admin write" ON public.system_settings
            FOR ALL USING (
              EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
            );
        `
      },
      {
        label: 'Create universities table and RLS policies',
        sql: `
          CREATE TABLE IF NOT EXISTS public.universities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            domain TEXT NOT NULL UNIQUE,
            short_name TEXT NOT NULL UNIQUE,
            primary_color TEXT NOT NULL,
            secondary_color TEXT NOT NULL,
            logo_url TEXT,
            created_at TIMESTAMPTZ DEFAULT now()
          );

          ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Allow public read access on universities" ON public.universities;
          CREATE POLICY "Allow public read access on universities" 
            ON public.universities FOR SELECT 
            TO authenticated 
            USING (true);
        `
      },
      {
        label: 'Add university_id to profiles',
        sql: `
          ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.universities(id);
        `
      },
      {
        label: 'Seed initial universities',
        sql: `
          INSERT INTO public.universities (name, domain, short_name, primary_color, secondary_color)
          VALUES 
            ('University of Lagos', 'unilag.edu.ng', 'UNILAG', '#002244', '#FFD700'),
            ('University of Ibadan', 'ui.edu.ng', 'UI', '#004B49', '#FFD700'),
            ('FAF Campus Demo', 'fafcampus.site', 'FAF Demo', '#8b5cf6', '#6366f1'),
            ('Redeemer''s University', 'run.edu.ng', 'RUN', '#0a2f5c', '#e5b73b')
          ON CONFLICT (domain) DO NOTHING;
        `
      },
      {
        label: 'Reload PostgREST schema cache',
        sql: `NOTIFY pgrst, 'reload schema';`
      },
      {
        label: 'Add gender column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;`
      },
      {
        label: 'Add id_card_url column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_url TEXT;`
      },
      {
        label: 'Add id_card_status column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_card_status TEXT DEFAULT 'not_uploaded';`
      },
      {
        label: 'Add invite_code column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;`
      },
      {
        label: 'Add invited_by column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invited_by TEXT;`
      },
      {
        label: 'Add forced_signout_at column to profiles',
        sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS forced_signout_at TIMESTAMPTZ;`
      },
      {
        label: 'Create invite_code auto-generate function',
        sql: `
          CREATE OR REPLACE FUNCTION public.generate_invite_code()
          RETURNS TRIGGER AS $$
          BEGIN
            IF NEW.invite_code IS NULL THEN
              NEW.invite_code := upper(substring(md5(random()::text || NEW.id::text) from 1 for 8));
            END IF;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        label: 'Create invite_code trigger on profiles',
        sql: `
          DROP TRIGGER IF EXISTS trg_generate_invite_code ON public.profiles;
          CREATE TRIGGER trg_generate_invite_code
            BEFORE INSERT ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.generate_invite_code();
        `
      },
      {
        label: 'Backfill invite codes for existing profiles without one',
        sql: `
          UPDATE public.profiles
          SET invite_code = upper(substring(md5(random()::text || id::text) from 1 for 8))
          WHERE invite_code IS NULL;
        `
      },
      {
        label: 'Force sign out all existing users (set forced_signout_at to now)',
        sql: `UPDATE public.profiles SET forced_signout_at = now() WHERE forced_signout_at IS NULL;`
      },
      {
        label: 'Update posts set posted_to_global_hub = false where null',
        sql: `UPDATE public.posts SET posted_to_global_hub = false WHERE posted_to_global_hub IS NULL;`
      },
      {
        label: 'Update profiles set joined_global_hub = false where null',
        sql: `UPDATE public.profiles SET joined_global_hub = false WHERE joined_global_hub IS NULL;`
      },
      {
        label: 'Map all existing profiles to Redeemer\'s University (RUN)',
        sql: `
          UPDATE public.profiles
          SET university_id = '0496f872-cd84-4e29-ac32-98d3e3a057c8',
              university = 'Redeemer''s University'
          WHERE university_id IS NULL OR university = 'University of Lagos';
        `
      },
      {
        label: 'Create database views for local and global posts',
        sql: `
          CREATE OR REPLACE VIEW public.local_posts AS
          SELECT * FROM public.posts
          WHERE posted_to_global_hub = false;

          CREATE OR REPLACE VIEW public.global_posts AS
          SELECT * FROM public.posts
          WHERE posted_to_global_hub = true;
        `
      },
      {
        label: 'Create triggers for views to force set posted_to_global_hub',
        sql: `
          CREATE OR REPLACE FUNCTION public.trg_fn_insert_global_post()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.posts (
              id, author_id, body, tags, is_anonymous, post_type, club_id, study_group_id, repost_of, image_url, posted_to_global_hub, created_at
            ) VALUES (
              COALESCE(NEW.id, gen_random_uuid()),
              NEW.author_id,
              NEW.body,
              NEW.tags,
              COALESCE(NEW.is_anonymous, false),
              COALESCE(NEW.post_type, 'feed'),
              NEW.club_id,
              NEW.study_group_id,
              NEW.repost_of,
              NEW.image_url,
              true,
              COALESCE(NEW.created_at, now())
            )
            RETURNING * INTO NEW;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_insert_global_post ON public.global_posts;
          CREATE TRIGGER trg_insert_global_post
            INSTEAD OF INSERT ON public.global_posts
            FOR EACH ROW EXECUTE FUNCTION public.trg_fn_insert_global_post();

          CREATE OR REPLACE FUNCTION public.trg_fn_insert_local_post()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO public.posts (
              id, author_id, body, tags, is_anonymous, post_type, club_id, study_group_id, repost_of, image_url, posted_to_global_hub, created_at
            ) VALUES (
              COALESCE(NEW.id, gen_random_uuid()),
              NEW.author_id,
              NEW.body,
              NEW.tags,
              COALESCE(NEW.is_anonymous, false),
              COALESCE(NEW.post_type, 'feed'),
              NEW.club_id,
              NEW.study_group_id,
              NEW.repost_of,
              NEW.image_url,
              false,
              COALESCE(NEW.created_at, now())
            )
            RETURNING * INTO NEW;
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_insert_local_post ON public.local_posts;
          CREATE TRIGGER trg_insert_local_post
            INSTEAD OF INSERT ON public.local_posts
            FOR EACH ROW EXECUTE FUNCTION public.trg_fn_insert_local_post();
        `
      },
      {
        label: 'Create database views for global events, clubs, and profiles',
        sql: `
          CREATE OR REPLACE VIEW public.global_events AS
          SELECT e.* FROM public.events e
          JOIN public.profiles p ON e.organizer_id = p.id
          WHERE p.joined_global_hub = true;

          CREATE OR REPLACE VIEW public.global_clubs AS
          SELECT c.* FROM public.clubs c
          JOIN public.profiles p ON c.created_by = p.id
          WHERE p.joined_global_hub = true;

          CREATE OR REPLACE VIEW public.global_profiles AS
          SELECT * FROM public.profiles
          WHERE joined_global_hub = true;
        `
      },
      {
        label: 'Grant view permissions to database roles',
        sql: `
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_posts TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_posts TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_events TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_clubs TO anon, authenticated;
          GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_profiles TO anon, authenticated;
        `
      },
      {
        label: 'Recreate posts: read public policy with strict university isolation',
        sql: `
          ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
          DROP POLICY IF EXISTS "posts: read public" ON public.posts;
          CREATE POLICY "posts: read public" ON public.posts
            FOR SELECT
            TO authenticated, anon
            USING (
              posted_to_global_hub = true OR 
              (posted_to_global_hub = false AND author_id IN (
                SELECT id FROM public.profiles WHERE university_id = (
                  SELECT university_id FROM public.profiles WHERE id = auth.uid()
                )
              ))
            );
        `
      },
      {
        label: 'Create comment likes table, count column, and triggers',
        sql: `
          -- Add likes_count to post_comments if it does not exist
          ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

          -- Create post_comment_likes table
          CREATE TABLE IF NOT EXISTS public.post_comment_likes (
            user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT now(),
            PRIMARY KEY (user_id, comment_id)
          );

          -- Enable RLS
          ALTER TABLE public.post_comment_likes ENABLE ROW LEVEL SECURITY;

          -- RLS Policies
          DROP POLICY IF EXISTS "post_comment_likes: read all" ON public.post_comment_likes;
          CREATE POLICY "post_comment_likes: read all" ON public.post_comment_likes
            FOR SELECT USING (true);

          DROP POLICY IF EXISTS "post_comment_likes: own insert" ON public.post_comment_likes;
          CREATE POLICY "post_comment_likes: own insert" ON public.post_comment_likes
            FOR INSERT WITH CHECK (auth.uid() = user_id);

          DROP POLICY IF EXISTS "post_comment_likes: own delete" ON public.post_comment_likes;
          CREATE POLICY "post_comment_likes: own delete" ON public.post_comment_likes
            FOR DELETE USING (auth.uid() = user_id);

          -- Trigger to automatically update likes_count
          CREATE OR REPLACE FUNCTION public.sync_post_comment_likes_count()
          RETURNS TRIGGER AS $$
          BEGIN
            IF TG_OP = 'INSERT' THEN
              UPDATE public.post_comments
              SET likes_count = likes_count + 1
              WHERE id = NEW.comment_id;
            ELSIF TG_OP = 'DELETE' THEN
              UPDATE public.post_comments
              SET likes_count = GREATEST(0, likes_count - 1)
              WHERE id = OLD.comment_id;
            END IF;
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_post_comment_likes_count ON public.post_comment_likes;
          CREATE TRIGGER trg_post_comment_likes_count
          AFTER INSERT OR DELETE ON public.post_comment_likes
          FOR EACH ROW EXECUTE FUNCTION public.sync_post_comment_likes_count();

          -- Grant privileges
          GRANT SELECT, INSERT, DELETE ON public.post_comment_likes TO anon, authenticated;
          GRANT UPDATE ON public.post_comments TO anon, authenticated;
        `
      },
      {
        label: 'Create auth.is_admin() helper function',
        sql: `
          CREATE OR REPLACE FUNCTION auth.is_admin()
          RETURNS boolean
          LANGUAGE sql
          STABLE
          AS $$
            SELECT 
              COALESCE(auth.jwt()->>'custom:role', '') = 'admin' OR
              auth.jwt()->'cognito:groups' ? 'admin' OR
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
              )
          $$;

          GRANT EXECUTE ON FUNCTION auth.is_admin() TO anon, authenticated, service_role;
        `
      },
      {
        label: 'Re-enable HTTP push notification trigger using pgsql-http extension',
        sql: `
          -- Install http extension if not already present
          DO $$
          BEGIN
            CREATE EXTENSION IF NOT EXISTS http SCHEMA public CASCADE;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to create http extension: %', SQLERRM;
          END;
          $$;

          -- Re-define push notification trigger to use http_post conditionally
          CREATE OR REPLACE FUNCTION public.trg_fn_push_notification()
          RETURNS TRIGGER AS $$
          BEGIN
            -- Only attempt HTTP call if the public.http function exists
            IF EXISTS (
              SELECT 1 FROM pg_proc p 
              JOIN pg_namespace n ON p.pronamespace = n.oid 
              WHERE n.nspname = 'public' AND p.proname = 'http'
            ) THEN
              PERFORM public.http((
                'POST',
                'https://vcbtvhociaioeyhhsczh.supabase.co/functions/v1/send-push-notification',
                ARRAY[
                  public.http_header('Content-Type', 'application/json'),
                  public.http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYnR2aG9jaWFpb2V5aGhzY3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNjc4MzAsImV4cCI6MjA5MTk0MzgzMH0.BqvLjyfeDnYBDtsY5OW_LtewCAUtO-twTIMvpjbDvRM')
                ],
                'application/json',
                to_jsonb(NEW)::text
              )::public.http_request);
            END IF;
            RETURN NEW;
          EXCEPTION WHEN OTHERS THEN
            -- Never block inserts due to notification delivery failures
            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      },
      {
        label: 'Create notifications delete RLS policy',
        sql: `
          DROP POLICY IF EXISTS "notifs: own delete" ON public.notifications;
          CREATE POLICY "notifs: own delete" ON public.notifications
            FOR DELETE USING (auth.uid() = user_id);
        `
      },
      {
        label: 'Add views_count column to posts and create increment RPC function',
        sql: `
          -- Add views_count if not present
          ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INT NOT NULL DEFAULT 0;

          -- Create security definer RPC function to increment views
          CREATE OR REPLACE FUNCTION public.increment_post_views(post_id UUID)
          RETURNS void AS $$
          BEGIN
            UPDATE public.posts
            SET views_count = views_count + 1
            WHERE id = post_id;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          -- Grant execute permission to database roles
          GRANT EXECUTE ON FUNCTION public.increment_post_views(UUID) TO anon, authenticated;
        `
      },
      {
        label: 'Create delete_own_user RPC function',
        sql: `
          CREATE OR REPLACE FUNCTION public.delete_own_user()
          RETURNS void AS $$
          BEGIN
            DELETE FROM auth.users WHERE id = auth.uid();
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          GRANT EXECUTE ON FUNCTION public.delete_own_user() TO authenticated;
        `
      },
      {
        label: 'Create id-cards storage bucket and RLS policies',
        sql: `
          -- Create id-cards storage bucket
          INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
          VALUES (
            'id-cards', 
            'id-cards', 
            false, 
            5242880, 
            ARRAY['image/jpeg', 'image/png', 'image/webp']
          )
          ON CONFLICT (id) DO NOTHING;

          -- Disable existing policies if any
          DROP POLICY IF EXISTS "Admins can view ID cards" ON storage.objects;
          CREATE POLICY "Admins can view ID cards" ON storage.objects
            FOR SELECT TO authenticated USING (
              bucket_id = 'id-cards' AND 
              EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
              )
            );

          DROP POLICY IF EXISTS "Users can upload their own ID card" ON storage.objects;
          CREATE POLICY "Users can upload their own ID card" ON storage.objects
            FOR INSERT TO authenticated WITH CHECK (
              bucket_id = 'id-cards'
            );

          DROP POLICY IF EXISTS "Users can update their own ID card" ON storage.objects;
          CREATE POLICY "Users can update their own ID card" ON storage.objects
            FOR UPDATE TO authenticated USING (
              bucket_id = 'id-cards'
            );
        `
      },
      {
        label: 'Redefine profile role assignment trigger with dynamic university checks',
        sql: `
          CREATE OR REPLACE FUNCTION public.handle_profile_role_and_badge()
          RETURNS TRIGGER AS $$
          DECLARE
            v_matching_uni BOOLEAN;
          BEGIN
            -- Preserve admin roles
            IF NEW.role = 'admin' THEN
              RETURN NEW;
            END IF;

            -- Verify if email ends with any university's domain
            SELECT EXISTS (
              SELECT 1 FROM public.universities 
              WHERE NEW.email ILIKE '%@' || domain OR NEW.email ILIKE '%.' || domain
            ) INTO v_matching_uni;

            IF v_matching_uni THEN
              -- Grant student status if matched
              IF NEW.role NOT IN ('student', 'vendor', 'admin') THEN
                NEW.role := 'student';
              END IF;
            ELSE
              -- Revert to guest role for manual admin approval
              NEW.role := 'guest';
              NEW.badge_type := 'guest';
              NEW.badge_color := '#ec4899';
            END IF;

            RETURN NEW;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;

          DROP TRIGGER IF EXISTS trg_handle_profile_role_and_badge ON public.profiles;
          CREATE TRIGGER trg_handle_profile_role_and_badge
          BEFORE INSERT OR UPDATE OF email, role ON public.profiles
          FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_and_badge();
        `
      },
      {
        label: 'Reload PostgREST schema cache (final)',
        sql: `NOTIFY pgrst, 'reload schema';`
      }
    ];

    for (const item of queries) {
      console.log(`Running: ${item.label}`);
      await client.query(item.sql);
      results.push({ label: item.label, status: 'OK' });
    }

    console.log('Database fixes applied successfully.');
    return { statusCode: 200, message: 'Database fixes applied successfully', results };
  } catch (err) {
    console.error('Error applying database fixes:', err);
    return { statusCode: 500, error: err.message, results };
  } finally {
    await client.end();
  }
};
