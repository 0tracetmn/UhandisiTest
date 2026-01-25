export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30000,
};

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
  },
  users: {
    list: '/users',
    getById: (id: string) => `/users/${id}`,
    update: (id: string) => `/users/${id}`,
    delete: (id: string) => `/users/${id}`,
  },
  tutors: {
    list: '/tutors',
    getById: (id: string) => `/tutors/${id}`,
    approve: (id: string) => `/tutors/${id}/approve`,
    reject: (id: string) => `/tutors/${id}/reject`,
    qualifications: (id: string) => `/tutors/${id}/qualifications`,
  },
  students: {
    list: '/students',
    getById: (id: string) => `/students/${id}`,
    update: (id: string) => `/students/${id}`,
  },
  bookings: {
    list: '/bookings',
    create: '/bookings',
    getById: (id: string) => `/bookings/${id}`,
    update: (id: string) => `/bookings/${id}`,
    assign: (id: string) => `/bookings/${id}/assign`,
    cancel: (id: string) => `/bookings/${id}/cancel`,
    myBookings: '/bookings/my',
  },
  announcements: {
    list: '/announcements',
    create: '/announcements',
    getById: (id: string) => `/announcements/${id}`,
    update: (id: string) => `/announcements/${id}`,
    delete: (id: string) => `/announcements/${id}`,
  },
  meetings: {
    list: '/meetings',
    create: '/meetings',
    getById: (id: string) => `/meetings/${id}`,
    update: (id: string) => `/meetings/${id}`,
    delete: (id: string) => `/meetings/${id}`,
  },
  materials: {
    list: '/materials',
    upload: '/materials/upload',
    getById: (id: string) => `/materials/${id}`,
    delete: (id: string) => `/materials/${id}`,
    download: (id: string) => `/materials/${id}/download`,
  },
  chat: {
    conversations: '/chat/conversations',
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    send: '/chat/messages',
  },
  payments: {
    create: '/payments',
    list: '/payments',
    getById: (id: string) => `/payments/${id}`,
    verify: (id: string) => `/payments/${id}/verify`,
  },
  invoices: {
    list: '/invoices',
    create: '/invoices',
    getById: (id: string) => `/invoices/${id}`,
    download: (id: string) => `/invoices/${id}/download`,
  },
  pricing: {
    list: '/pricing',
    update: '/pricing',
  },
};
