import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Users, BookOpen, TrendingUp, FileText, ExternalLink } from 'lucide-react';
import { Booking } from '../../types';
import { supabase } from '../../lib/supabase';

interface TutorDocuments {
  transcriptUrl: string | null;
  qualificationsUrl: string | null;
  idCopyUrl: string | null;
}

export const TutorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<TutorDocuments>({
    transcriptUrl: null,
    qualificationsUrl: null,
    idCopyUrl: null,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.id) {
          const { data: tutorDetails } = await supabase
            .from('tutor_details')
            .select('transcript_url, qualifications_url, id_copy_url')
            .eq('user_id', user.id)
            .maybeSingle();

          if (tutorDetails) {
            setDocuments({
              transcriptUrl: tutorDetails.transcript_url,
              qualificationsUrl: tutorDetails.qualifications_url,
              idCopyUrl: tutorDetails.id_copy_url,
            });
          }

          // Fetch bookings where tutor is assigned (either via tutor_id or booking_tutors)
          const { data: directBookings } = await supabase
            .from('bookings')
            .select(`
              *,
              student:profiles!bookings_student_id_fkey(name, email, phone_number),
              booking_subjects(
                id,
                service_id,
                subject_order,
                tutoring_services(name)
              )
            `)
            .eq('tutor_id', user.id)
            .order('created_at', { ascending: false });

          const { data: assignedBookings } = await supabase
            .from('booking_tutors')
            .select(`
              booking_id,
              bookings(
                *,
                student:profiles!bookings_student_id_fkey(name, email, phone_number),
                booking_subjects(
                  id,
                  service_id,
                  subject_order,
                  tutoring_services(name)
                )
              )
            `)
            .eq('tutor_id', user.id);

          const allBookingsData = [...(directBookings || [])];

          // Add bookings from booking_tutors (avoid duplicates)
          if (assignedBookings) {
            assignedBookings.forEach((ab: any) => {
              if (ab.bookings && !allBookingsData.find(b => b.id === ab.bookings.id)) {
                allBookingsData.push(ab.bookings);
              }
            });
          }

          if (allBookingsData.length > 0) {
            const formattedBookings: Booking[] = allBookingsData.map((booking: any) => ({
              id: booking.id,
              studentId: booking.student_id,
              studentName: booking.student?.name || 'Unknown',
              studentEmail: booking.student?.email || '',
              studentPhone: booking.student?.phone_number || '',
              subject: booking.subject,
              subjects: (booking.booking_subjects || []).map((bs: any) => ({
                id: bs.id,
                serviceId: bs.service_id,
                subjectName: bs.tutoring_services?.name || '',
                subjectOrder: bs.subject_order,
              })),
              sessionType: booking.session_type,
              classType: booking.class_type || 'one-on-one',
              preferredDate: booking.preferred_date,
              preferredTime: booking.preferred_time,
              status: booking.status,
              tutorId: booking.tutor_id,
              tutorName: user.name,
              notes: booking.notes,
              curriculum: booking.curriculum,
              durationMinutes: booking.duration_minutes,
              createdAt: booking.created_at,
              updatedAt: booking.updated_at,
            }));
            setBookings(formattedBookings);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.id, user?.name]);

  const stats = [
    {
      label: 'Upcoming Sessions',
      value: bookings.filter((b) => b.status === 'assigned').length,
      icon: <Calendar className="w-6 h-6" />,
      color: 'blue',
    },
    {
      label: 'Total Students',
      value: new Set(bookings.map((b) => b.studentId)).size,
      icon: <Users className="w-6 h-6" />,
      color: 'green',
    },
    {
      label: 'Completed Sessions',
      value: bookings.filter((b) => b.status === 'completed').length,
      icon: <BookOpen className="w-6 h-6" />,
      color: 'purple',
    },
    {
      label: 'This Month',
      value: bookings.filter((b) => {
        const date = new Date(b.createdAt);
        const now = new Date();
        return date.getMonth() === now.getMonth();
      }).length,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'orange',
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
        <p className="text-slate-600 mt-1">Manage your tutoring sessions and students</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} hover>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`text-${stat.color}-600 bg-${stat.color}-50 p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Upcoming Sessions</h2>
            <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/bookings')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {bookings.filter((b) => b.status === 'assigned').length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No upcoming sessions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings
                .filter((b) => b.status === 'assigned')
                .slice(0, 5)
                .map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{booking.subject}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Student: {booking.studentName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(booking.preferredDate).toLocaleDateString()} at{' '}
                        {booking.preferredTime}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="info">{booking.sessionType}</Badge>
                      <Button size="sm" onClick={() => navigate('/dashboard/bookings')}>View Details</Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardBody>
      </Card>

      {(documents.transcriptUrl || documents.qualificationsUrl || documents.idCopyUrl) && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-slate-900">My Documents</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {documents.transcriptUrl && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-10 h-10 text-blue-600" />
                    <div>
                      <p className="font-medium text-slate-900">Transcript</p>
                      <p className="text-sm text-slate-600">Academic transcript document</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(documents.transcriptUrl!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              )}

              {documents.qualificationsUrl && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-10 h-10 text-green-600" />
                    <div>
                      <p className="font-medium text-slate-900">Qualifications</p>
                      <p className="text-sm text-slate-600">Certificates and degrees</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(documents.qualificationsUrl!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              )}

              {documents.idCopyUrl && (
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-10 h-10 text-orange-600" />
                    <div>
                      <p className="font-medium text-slate-900">Copy of ID</p>
                      <p className="text-sm text-slate-600">Identity verification document</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(documents.idCopyUrl!, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View
                  </Button>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <Card hover className="cursor-pointer">
          <CardBody className="text-center">
            <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">My Schedule</h3>
            <p className="text-sm text-slate-600">View and manage your sessions</p>
          </CardBody>
        </Card>

        <Card hover className="cursor-pointer">
          <CardBody className="text-center">
            <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">My Students</h3>
            <p className="text-sm text-slate-600">View student progress</p>
          </CardBody>
        </Card>

        <Card hover className="cursor-pointer">
          <CardBody className="text-center">
            <BookOpen className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">Upload Materials</h3>
            <p className="text-sm text-slate-600">Share notes and resources</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
