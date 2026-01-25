# Quick Start Guide - Uhandisi Tutors

## What's Been Built

A complete, production-ready tutoring management system with:
- ✅ Full Supabase backend integration (database, auth, storage)
- ✅ 14 database tables with Row Level Security
- ✅ Authentication system (register, login, logout)
- ✅ Role-based access control (Admin, Tutor, Student)
- ✅ Booking management system
- ✅ Learning materials with file upload
- ✅ Chat functionality
- ✅ Announcements system
- ✅ Payment tracking
- ✅ Modern, responsive UI

## Getting Started (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open Your Browser
Navigate to: `http://localhost:5173`

## First-Time Setup

### Create Your First Admin User

1. Click "Get Started" or "Sign Up"
2. Register with your email
3. Choose role: Select any role initially
4. Complete registration

5. **Update role to admin** in Supabase Dashboard:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Table Editor → profiles
   - Find your user
   - Change `role` from 'student' to 'admin'
   - Save

6. Refresh the application - you now have admin access!

## Test the Application

### As Admin:
1. Create an announcement
2. View all bookings
3. Manage pricing rates
4. Approve tutor applications

### As Student:
1. Register a new user with role 'student'
2. Book a tutoring session
3. View learning materials
4. Make a payment

### As Tutor:
1. Register a new user with role 'tutor'
2. Upload learning materials
3. View assigned bookings
4. Chat with students

## Database Structure

All data is stored in Supabase PostgreSQL:

**Users & Profiles**
- `profiles` - User information
- `student_details` - Student-specific data
- `tutor_details` - Tutor-specific data

**Core Features**
- `bookings` - Session bookings
- `materials` - Learning resources
- `announcements` - System notifications
- `chat_messages` - Messaging system
- `payments` - Payment records
- `invoices` - Invoice generation

**Pricing**
- Default: R300 (online), R450 (face-to-face)

## File Storage

Learning materials are stored in Supabase Storage:
- Bucket: `materials`
- Limits: 10MB (documents), 100MB (videos)
- Types: Notes, Diagrams, Videos

## Security

✅ Row Level Security enabled on all tables
✅ Users can only access their own data
✅ Role-based permissions enforced
✅ Secure authentication with Supabase Auth
✅ Protected routes and API calls

## Available Scripts

```bash
npm run dev       # Start development (port 5173)
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Check code quality
npm run typecheck # Check TypeScript types
```

## Troubleshooting

**Can't log in?**
- Check `.env` file has correct Supabase credentials
- Verify user exists in Supabase dashboard
- Check browser console for errors

**Can't upload files?**
- Verify 'materials' storage bucket exists
- Check file size (max 10MB for docs, 100MB for videos)
- Ensure you're logged in

**Permission denied?**
- Check user role in profiles table
- Verify RLS policies are enabled
- Try logging out and back in

## Next Steps

1. **Customize Branding**
   - Update logo in `/public/`
   - Modify colors in Tailwind config
   - Update company info in Landing page

2. **Add Real Payment Integration**
   - Integrate Stripe or PayFast
   - Update payment service
   - Add payment webhooks

3. **Enable Email Notifications**
   - Configure Supabase email templates
   - Add booking confirmation emails
   - Set up announcement notifications

4. **Deploy to Production**
   - Build: `npm run build`
   - Deploy `dist` folder to Vercel/Netlify
   - Update Supabase allowed URLs

## Support

For issues or questions:
- Check README.md for detailed documentation
- Review Supabase dashboard for data/logs
- Check browser console for error messages

## Key Features Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | ✅ Ready | Email/password with Supabase |
| User Registration | ✅ Ready | Student, Tutor, Admin roles |
| Booking System | ✅ Ready | Create, view, manage bookings |
| Materials Upload | ✅ Ready | PDF, images, videos supported |
| Chat System | ✅ Ready | One-on-one conversations |
| Announcements | ✅ Ready | Role-based notifications |
| Payments | ✅ Ready | Track payment status |
| Admin Dashboard | ✅ Ready | Full system management |
| Tutor Dashboard | ✅ Ready | Session & material management |
| Student Dashboard | ✅ Ready | Booking & learning hub |

## Database is Ready!

The database schema is already created with:
- 14 tables configured
- RLS policies enabled
- Default pricing set
- Storage bucket created

**Just start coding! Everything is set up and ready to use.**
