-- Delete mock auth users (cascade deletes profiles, follows, posts, bookmarks, etc.)
DELETE FROM auth.users WHERE id IN ('a1b2c3d4-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000002');

-- Delete mock clubs (cascade deletes members, announcements, etc.)
DELETE FROM public.clubs WHERE id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000005'
);

-- Delete mock courses (cascade deletes enrollments, discussions, etc.)
DELETE FROM public.courses WHERE id IN (
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000004'
);

-- Delete mock events (cascade deletes rsvps)
DELETE FROM public.events WHERE id IN (
  'e0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  'e0000000-0000-0000-0000-000000000003'
);

-- Delete mock vendors (cascade deletes deals)
DELETE FROM public.vendors WHERE id IN (
  'f0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000002'
);
