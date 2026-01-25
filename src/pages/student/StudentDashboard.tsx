import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Calendar, BookOpen, MessageCircle, Clock, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Booking {
  id: string;
  serviceName: string;
  deliveryMode: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  tutorName: string | null;
  createdAt: string;
  curriculum?: string;
  durationMinutes?: number;
  totalDuration?: number;
  subjectCount?: number;
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          subject,
          service_id,
          delivery_mode,
          preferred_date,
          preferred_time,
          status,
          tutor_id,
          curriculum,
          duration_minutes,
          created_at,
          tutoring_services(name),
          profiles!bookings_tutor_id_fkey(name),
          booking_subjects(
            id,
            service_id,
            subject_order,
            duration_minutes,
            tutoring_services(name)
          ),
          booking_tutors(
            id,
            tutor_id,
            assignment_order,
            profiles(name)
          )
        `)
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false });

      if (bookingsData) {
        setMyBookings(bookingsData.map((booking: any) => {
          const subjects = booking.booking_subjects || [];
          const totalDuration = subjects.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);

          return {
            id: booking.id,
            serviceName: booking.subject || booking.tutoring_services?.name || 'Unknown Service',
            deliveryMode: booking.delivery_mode || 'Not specified',
            preferredDate: booking.preferred_date,
            preferredTime: booking.preferred_time,
            status: booking.status,
            tutorName: (booking.booking_tutors && booking.booking_tutors.length > 0)
              ? booking.booking_tutors.map((bt: any) => bt.profiles?.name).filter(Boolean).join(', ')
              : (booking.profiles?.name || null),
            createdAt: booking.created_at,
            curriculum: booking.curriculum,
            durationMinutes: booking.duration_minutes,
            totalDuration: totalDuration || booking.duration_minutes,
            subjectCount: subjects.length,
          };
        }));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'info' | 'default' | 'danger'; label: string }> = {
      pending: { variant: 'warning', label: 'Pending Approval' },
      approved: { variant: 'info', label: 'Approved' },
      assigned: { variant: 'success', label: 'Tutor Assigned' },
      completed: { variant: 'default', label: 'Completed' },
      rejected: { variant: 'danger', label: 'Rejected' },
      cancelled: { variant: 'danger', label: 'Cancelled' },
    };
    const statusInfo = variants[status] || { variant: 'default' as const, label: status };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const stats = [
    {
      label: 'Active Sessions',
      value: myBookings.filter((b) => b.status === 'assigned').length,
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pending Approval',
      value: myBookings.filter((b) => b.status === 'pending').length,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'Completed',
      value: myBookings.filter((b) => b.status === 'completed').length,
      icon: <Check className="w-6 h-6" />,
      color: 'bg-green-50 text-green-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Welcome back, {user?.name}!</h1>
        <p className="text-slate-600 mt-1">Here's an overview of your learning journey</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {myBookings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">My Bookings</h2>
              <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/bookings')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {myBookings.slice(0, 5).map(booking => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{booking.serviceName}</p>
                    {booking.subjectCount && booking.subjectCount > 1 && (
                      <p className="text-xs text-blue-600 mt-1">+ {booking.subjectCount - 1} more subject{booking.subjectCount > 2 ? 's' : ''}</p>
                    )}
                    <p className="text-sm text-slate-600 mt-1">
                      {new Date(booking.preferredDate).toLocaleDateString()} at {booking.preferredTime}
                    </p>
                    {booking.subjectCount > 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Total Duration: {(() => {
                          const totalDuration = booking.totalDuration || booking.durationMinutes || 0;
                          return totalDuration >= 60
                            ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? ` ${totalDuration % 60}min` : ''}`
                            : `${totalDuration}min`;
                        })()}
                      </p>
                    )}
                    {booking.curriculum && (
                      <p className="text-xs text-slate-500">Curriculum: {booking.curriculum}</p>
                    )}
                    {booking.tutorName && (
                      <p className="text-sm text-slate-500 mt-1">Tutor: {booking.tutorName}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1 capitalize">
                      {booking.deliveryMode.replace('_', ' ')}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {myBookings.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No bookings yet</h3>
              <p className="text-slate-600 mb-6">Start your learning journey by booking your first session</p>
              <Button onClick={() => navigate('/dashboard/book-class')}>
                Book a Class
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card hover className="cursor-pointer" onClick={() => navigate('/dashboard/book-class')}>
          <CardBody className="text-center">
            <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Book a Class</h3>
            <p className="text-sm text-slate-600">Schedule your next tutoring session</p>
          </CardBody>
        </Card>

        <Card hover className="cursor-pointer" onClick={() => navigate('/dashboard/materials')}>
          <CardBody className="text-center">
            <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Learning Materials</h3>
            <p className="text-sm text-slate-600">Access notes, diagrams, and videos</p>
          </CardBody>
        </Card>

        <Card hover className="cursor-pointer" onClick={() => navigate('/dashboard/chat')}>
          <CardBody className="text-center">
            <MessageCircle className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Chat with Tutor</h3>
            <p className="text-sm text-slate-600">Get help when you need it</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
