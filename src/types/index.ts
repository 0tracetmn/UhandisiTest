export type UserRole = 'admin' | 'tutor' | 'student';

export type SessionType = 'online' | 'face-to-face';

export type ClassType = 'one-on-one' | 'group';

export type BookingStatus = 'pending' | 'approved' | 'assigned' | 'completed' | 'cancelled' | 'rejected';

export type GroupSessionStatus = 'forming' | 'ready' | 'assigned' | 'approved' | 'completed' | 'cancelled' | 'full';

export type TutorStatus = 'pending' | 'approved' | 'rejected';

export type MaterialType = 'note' | 'diagram' | 'video';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  profileImage?: string;
  createdAt: string;
}

export interface Tutor extends User {
  role: 'tutor';
  status: TutorStatus;
  subjects: string[];
  qualifications: Qualification[];
  bio?: string;
  hourlyRate?: number;
}

export interface Student extends User {
  role: 'student';
  parentName?: string;
  parentContact?: string;
  grade?: string;
}

export interface Admin extends User {
  role: 'admin';
}

export interface Qualification {
  id: string;
  tutorId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

export interface BookingTutor {
  id: string;
  tutorId: string;
  tutorName: string;
  assignmentOrder: number;
  assignedAt: string;
}

export interface BookingSubject {
  id: string;
  serviceId: string;
  subjectName: string;
  subjectOrder: number;
  durationMinutes?: number;
}

export interface Booking {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentPhone?: string;
  serviceId?: string;
  subject: string;
  subjects?: BookingSubject[];
  sessionType: SessionType;
  classType: ClassType;
  preferredDate: string;
  preferredTime: string;
  status: BookingStatus;
  tutorId?: string;
  tutorName?: string;
  tutors?: BookingTutor[];
  notes?: string;
  groupId?: string;
  groupSessionId?: string;
  deliveryMode?: string;
  curriculum?: string;
  durationMinutes?: number;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSessionTutor {
  id: string;
  tutorId: string;
  tutorName: string;
  assignmentOrder: number;
  assignedAt: string;
}

export interface GroupSession {
  id: string;
  subject: string;
  serviceId?: string;
  sessionType: SessionType;
  preferredDate: string;
  preferredTime: string;
  status: GroupSessionStatus;
  tutorId?: string;
  tutorName?: string;
  tutors?: GroupSessionTutor[];
  minStudents: number;
  maxStudents: number;
  currentCount: number;
  participants?: GroupSessionParticipant[];
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSessionParticipant {
  id: string;
  groupSessionId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  notes?: string;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingGroup {
  id: string;
  subject: string;
  sessionType: SessionType;
  deliveryMode: string;
  preferredDate: string;
  preferredTime: string;
  tutorId?: string;
  status: BookingStatus;
  maxGroupSize: number;
  currentGroupSize: number;
  students?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  targetRoles: UserRole[];
  targetGrades: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  meetingLink?: string;
  organizerId: string;
  organizerName: string;
  attendees: string[];
  createdAt: string;
}

export interface Material {
  id: string;
  title: string;
  description: string;
  type: MaterialType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploaderName: string;
  subject?: string;
  grade?: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  bookingId?: string;
  groupSessionId?: string;
  participants: User[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  isRead: boolean;
}

export interface Payment {
  id: string;
  bookingId: string;
  studentId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  transactionId?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  studentId: string;
  studentName: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PricingRate {
  sessionType: SessionType;
  rate: number;
  currency: string;
}
