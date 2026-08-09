-- Promote user to admin role
-- Run this with: psql -U postgres -d cybered -f scripts/promote-user-to-admin.sql

-- Update the user role to admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'nasreen.qayoom@gmail.com';

-- Verify the change
SELECT id, email, username, role, created_at 
FROM users 
WHERE email = 'nasreen.qayoom@gmail.com';
