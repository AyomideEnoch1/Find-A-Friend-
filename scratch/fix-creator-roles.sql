-- Update club_members role to 'admin' for all users who are the creators of the club.
UPDATE club_members
SET role = 'admin'
FROM clubs
WHERE club_members.club_id = clubs.id
  AND club_members.user_id = clubs.created_by;
