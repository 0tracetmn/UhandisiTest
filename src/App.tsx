import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';

import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Bookings } from './pages/shared/Bookings';
import { Materials } from './pages/shared/Materials';
import { Chat } from './pages/shared/Chat';
import { Announcements } from './pages/shared/Announcements';
import { Payments } from './pages/shared/Payments';
import { ServicesManagement } from './pages/admin/ServicesManagement';
import { TutorsManagement } from './pages/admin/TutorsManagement';
import { StudentsManagement } from './pages/admin/StudentsManagement';
import { BookClass } from './pages/student/BookClass';
import { Availability } from './pages/tutor/Availability';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/bookings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Bookings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/materials"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Materials />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/chat"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Chat />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/announcements"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Announcements />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/payments"
            element={
              <ProtectedRoute allowedRoles={['admin', 'student']}>
                <DashboardLayout>
                  <Payments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/book-class"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout>
                  <BookClass />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/availability"
            element={
              <ProtectedRoute allowedRoles={['tutor']}>
                <DashboardLayout>
                  <Availability />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/invoices"
            element={
              <ProtectedRoute allowedRoles={['admin', 'student']}>
                <DashboardLayout>
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
                    <p className="text-slate-600 mt-2">Invoice management coming soon</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <StudentsManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/tutors"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <TutorsManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <div className="text-center py-12">
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-600 mt-2">Settings page coming soon</p>
                  </div>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/services"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout>
                  <ServicesManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/unauthorized"
            element={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-slate-900 mb-4">403</h1>
                  <p className="text-xl text-slate-600 mb-6">Unauthorized Access</p>
                  <a href="/dashboard" className="text-blue-600 hover:text-blue-700">
                    Return to Dashboard
                  </a>
                </div>
              </div>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
