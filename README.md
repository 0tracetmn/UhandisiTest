# Uhandisi Tutors - Booking & Management System

A comprehensive tutoring company management platform for GET/FET Physics & Mathematics, featuring booking management, learning materials, chat functionality, and payment processing.

## Features

### Role-Based Access Control (RBAC)
- **Admin**: Full system management, tutor approval, booking assignments, announcements
- **Tutor**: View assigned sessions, manage students, upload materials
- **Student**: Book sessions, access materials, chat with tutors, make payments

### Core Functionality
- **Session Booking System**: Online and face-to-face session scheduling
- **Learning Materials**: Upload and download notes, diagrams, and videos (≤10 min)
- **Real-time Chat**: Direct communication between students, tutors, and admins
- **Announcements**: Broadcast important updates to specific user groups
- **Payment Processing**: Secure payment tracking and management
- **Invoice Generation**: Automated invoicing for completed sessions

## Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for navigation
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Supabase** - Complete backend solution
  - PostgreSQL database with Row Level Security (RLS)
  - Authentication & user management
  - File storage for learning materials
  - Real-time subscriptions
  - RESTful API (auto-generated)

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Supabase project (pre-configured)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd uhandisi-tutors
```

2. Install dependencies:
```bash
npm install
```

3. Environment variables are pre-configured:
The `.env` file contains the Supabase connection details:
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Database Schema

The application uses Supabase PostgreSQL with 14 tables:

### Core Tables
- **profiles** - User profile information (extends auth.users)
- **student_details** - Student-specific data (grade, parent info)
- **tutor_details** - Tutor-specific data (subjects, bio, status)
- **tutor_qualifications** - Tutor qualification documents
- **bookings** - Session booking requests and assignments
- **announcements** - System announcements
- **meetings** - Scheduled meeting invites
- **materials** - Learning materials (notes, diagrams, videos)
- **chat_conversations** - Chat conversation threads
- **chat_participants** - User-conversation relationships
- **chat_messages** - Individual chat messages
- **payments** - Payment transaction records
- **invoices** - Invoice records
- **pricing_rates** - Session pricing configuration (R300 online, R450 face-to-face)

### Security Features
All tables have Row Level Security (RLS) enabled with role-based policies:
- Users can only access data relevant to their role
- Students see their own bookings and materials
- Tutors see assigned bookings and can upload materials
- Admins have full access to all data
- All sensitive operations require authentication
- Ownership and membership checks enforce data privacy

### Storage
- **materials** bucket - Stores uploaded learning materials with public access
- File size limits: 10MB for documents, 100MB for videos
- Supported formats: PDFs, documents, images, videos

## Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (DashboardLayout)
│   ├── ui/             # Reusable UI components (Button, Card, Modal, etc.)
│   └── ProtectedRoute.tsx
├── contexts/
│   └── AuthContext.tsx  # Authentication with Supabase Auth
├── lib/
│   └── supabase.ts     # Supabase client configuration
├── pages/
│   ├── admin/          # Admin dashboard
│   ├── tutor/          # Tutor dashboard
│   ├── student/        # Student dashboard
│   └── shared/         # Shared pages (Bookings, Materials, Chat, etc.)
├── services/
│   ├── bookings.service.ts      # Booking management
│   ├── announcements.service.ts # Announcements
│   ├── materials.service.ts     # Learning materials with file upload
│   ├── chat.service.ts          # Real-time chat
│   └── payments.service.ts      # Payment tracking
├── types/
│   └── index.ts        # TypeScript type definitions
├── App.tsx             # Main application with routing
└── main.tsx           # Application entry point
```

## Authentication Flow

The application uses Supabase Auth for secure authentication:

### Registration
1. User signs up with email/password
2. Profile is automatically created in `profiles` table
3. Role-specific details are added (student_details or tutor_details)
4. User is automatically logged in

### Login
1. User provides email/password
2. Supabase validates credentials
3. Session is established and stored
4. User profile is loaded from database

### Authorization
- Routes are protected based on user roles
- RLS policies enforce data access control
- Admin, tutor, and student roles have different permissions

## Service Layer

Each feature has a dedicated service module:

### bookingsService
- `getAll()` - Get all bookings (admin only)
- `getMyBookings(userId)` - Get user's bookings
- `create(data)` - Create new booking
- `updateStatus(id, status, tutorId)` - Update booking status

### announcementsService
- `getAll()` - Get published announcements
- `create(data)` - Create announcement (admin only)
- `delete(id)` - Delete announcement

### materialsService
- `getAll()` - List all materials
- `upload(file, metadata)` - Upload material with file
- `delete(id)` - Delete material and file

### chatService
- `getConversations()` - List user's conversations
- `getMessages(conversationId)` - Get conversation messages
- `sendMessage(conversationId, content)` - Send message
- `createConversation(participantIds)` - Start new conversation

### paymentsService
- `getAll()` - List payments
- `create(data)` - Create payment record
- `updateStatus(id, status, transactionId)` - Update payment

## Features by Role

### Admin Dashboard
- View all users, bookings, and payments
- Approve/reject tutor applications
- Assign bookings to tutors
- Create system-wide announcements
- Manage pricing rates
- View system analytics and statistics

### Tutor Dashboard
- View assigned sessions and schedule
- See list of students
- Upload learning materials (notes, diagrams, videos)
- Chat with students and admins
- Track completed sessions

### Student Dashboard
- Book online or face-to-face tutoring sessions
- Browse and download learning materials
- Chat with assigned tutors
- View announcements and updates
- Make payments for sessions
- Download invoices

## Design Philosophy

The application features a modern, professional design with:
- Clean, intuitive navigation
- Responsive layout for all devices (mobile, tablet, desktop)
- Consistent color scheme (blues, greens, and neutral tones)
- Smooth transitions and hover effects
- Clear visual hierarchy and typography
- Accessible UI components
- Premium, polished look and feel

## Security Features

- **Authentication**: Supabase Auth with secure email/password
- **Authorization**: Row Level Security (RLS) on all tables
- **Session Management**: Automatic token refresh and persistence
- **Data Privacy**: Users only access their own data
- **Role-Based Access**: Admins, tutors, and students have different permissions
- **Secure File Storage**: Public bucket with authenticated upload
- **SQL Injection Protection**: Parameterized queries via Supabase

## Development Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checking
```

## Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL (pre-configured)
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (pre-configured)

## Default Pricing

The system comes with pre-configured pricing rates:
- **Online Sessions**: R300.00 per hour
- **Face-to-Face Sessions**: R450.00 per hour

Admins can update these rates through the dashboard.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Getting Started with Development

1. **First-time Setup**:
   - Database schema is already created
   - Storage bucket is configured
   - Default pricing is set

2. **Create First Admin User**:
   - Register through the UI
   - Manually update role to 'admin' in Supabase dashboard

3. **Test Features**:
   - Create announcements as admin
   - Register as student and book sessions
   - Register as tutor and upload materials

## Troubleshooting

### Authentication Issues
- Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly
- Check browser console for error messages
- Verify Supabase project is active

### File Upload Issues
- Check that 'materials' storage bucket exists
- Verify file size limits (10MB for documents, 100MB for videos)
- Ensure user is authenticated

### Permission Issues
- Check user role in profiles table
- Verify RLS policies are enabled
- Check browser console for RLS errors

## Contributing

This is a custom project for Uhandisi Tutors. For questions or support, contact the development team.

## License

Proprietary - All rights reserved by Uhandisi Tutors
