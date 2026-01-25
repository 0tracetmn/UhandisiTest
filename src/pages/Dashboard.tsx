import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { StudentDashboard } from './student/StudentDashboard';
import { TutorDashboard } from './tutor/TutorDashboard';
import { AdminDashboard } from './admin/AdminDashboard';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'tutor':
      return <TutorDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <div>Invalid role</div>;
  }
};
