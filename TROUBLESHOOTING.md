# Troubleshooting Guide - Uhandisi Tutors

## Fixed Issues ✅

### Registration & Login Issues (RESOLVED)
**Problem**: Users could register but profiles weren't created, causing infinite loading on login.

**Solution**: Created database trigger to automatically create profiles when users register.

**Status**: ✅ Fixed - Registration and login now work correctly

---

## Current User Setup

Your existing test users have been configured:

1. **tahirachmat@gmail.com** - Tutor role
   - Can upload materials
   - Can view assigned bookings
   - Can chat with students

2. **goolam687@gmail.com** - Student role
   - Can book sessions
   - Can view materials
   - Can make payments

Both users can now log in successfully!

---

## How to Test the Application

### 1. Login with Existing Users

**As Student (goolam687@gmail.com)**:
```
Email: goolam687@gmail.com
Password: [your password]
```

What you can do:
- View student dashboard
- Create new booking requests
- Browse learning materials
- View announcements

**As Tutor (tahirachmat@gmail.com)**:
```
Email: tahirachmat@gmail.com
Password: [your password]
```

What you can do:
- View tutor dashboard
- See assigned bookings
- Upload learning materials
- Chat with students

### 2. Create an Admin User

To create an admin account:

1. Register a new user through the UI
2. Go to Supabase Dashboard: https://supabase.com/dashboard
3. Select your project → Table Editor → profiles
4. Find your newly created user
5. Change `role` from 'student' to 'admin'
6. Save and refresh the application

Admin capabilities:
- View all users and bookings
- Approve tutor applications
- Assign bookings to tutors
- Create announcements
- Manage system settings

### 3. Register New Users

New registrations now work correctly:
- Choose Student or Tutor role
- Fill in all required fields
- Click "Create Account"
- You'll be automatically logged in

---

## Common Issues & Solutions

### "User already exists" Error
**Cause**: You tried to register with an email that's already in the system

**Solution**:
- Use the login page instead
- Or register with a different email address

### Infinite Loading on Login
**Cause**: This was caused by missing profiles (now fixed)

**Solution**:
- Refresh the page
- If still loading, check browser console for errors
- Verify profile exists: Supabase Dashboard → profiles table

### Can't See Dashboard After Login
**Cause**: Profile might not have loaded

**Solution**:
1. Check browser console for errors
2. Verify in Supabase Dashboard that profile exists for your user ID
3. Try logging out and back in
4. Clear browser cache and cookies

### Permission Denied Errors
**Cause**: Row Level Security (RLS) policies enforcing access control

**Solution**:
- Verify your user role in the profiles table
- Check that you're logged in (session exists)
- Ensure you're accessing data you own or have permission to view

### Can't Upload Files
**Cause**: Storage permissions or bucket not configured

**Solution**:
1. Verify 'materials' bucket exists in Supabase Storage
2. Check file size limits (10MB for docs, 100MB for videos)
3. Ensure you're logged in as Tutor or Admin
4. Check browser console for specific error messages

### Database Connection Errors
**Cause**: Supabase credentials incorrect or project paused

**Solution**:
1. Check `.env` file has correct credentials
2. Verify Supabase project is active (not paused)
3. Test connection in Supabase Dashboard
4. Restart dev server: `npm run dev`

---

## Debugging Tips

### Check Browser Console
Open Developer Tools (F12) and check Console tab for errors:
- Authentication errors
- API request failures
- RLS policy violations
- Network issues

### Check Network Tab
Look at API requests to see:
- Which requests are failing
- Response status codes
- Error messages from Supabase

### Check Supabase Dashboard

**Auth → Users**: Verify users exist
**Table Editor → profiles**: Check profiles are created
**Table Editor → bookings**: See booking data
**Storage**: Verify files uploaded correctly
**Logs**: View real-time database logs

### Verify Database State

Run these queries in Supabase SQL Editor:

```sql
-- Check if profiles exist for all auth users
SELECT
  u.id,
  u.email,
  p.name,
  p.role
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id;

-- Check RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';

-- Check if trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

## Getting Help

If you encounter issues:

1. **Check this guide first** - Most common issues are documented here

2. **Check browser console** - Provides detailed error messages

3. **Check Supabase logs** - Shows database-level errors

4. **Verify data state** - Use SQL queries to inspect database

5. **Test incrementally** - Try one feature at a time

---

## System Status

✅ Database schema created
✅ Row Level Security enabled
✅ Authentication configured
✅ Storage bucket created
✅ Profile creation trigger active
✅ Test users configured
✅ Registration flow working
✅ Login flow working

**All systems operational!**
