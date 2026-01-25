import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Users, Calendar, TrendingUp, CheckCircle, Clock, FileText, ExternalLink, AlertCircle, X, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PendingTutor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  transcriptUrl: string | null;
  qualificationsUrl: string | null;
  idCopyUrl: string | null;
  createdAt: string;
}

interface PendingBooking {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  serviceName: string;
  serviceId: string;
  deliveryMode: string;
  classType: string;
  preferredDate: string;
  preferredTime: string;
  notes: string | null;
  createdAt: string;
}

interface PendingGroupSession {
  id: string;
  subject: string;
  sessionType: string;
  preferredDate: string;
  preferredTime: string;
  status: string;
  currentCount: number;
  minStudents: number;
  maxStudents: number;
  createdAt: string;
}

interface AvailableTutor {
  id: string;
  name: string;
  email: string;
  isAvailable: boolean;
}

export const AdminDashboard: React.FC = () => {
  const [pendingTutors, setPendingTutors] = useState<PendingTutor[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<PendingTutor | null>(null);
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [pendingGroupSessions, setPendingGroupSessions] = useState<PendingGroupSession[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<PendingBooking | null>(null);
  const [selectedGroupSession, setSelectedGroupSession] = useState<PendingGroupSession | null>(null);
  const [availableTutors, setAvailableTutors] = useState<AvailableTutor[]>([]);
  const [selectedTutorsForBooking, setSelectedTutorsForBooking] = useState<string[]>([]);
  const [selectedTutorsForGroup, setSelectedTutorsForGroup] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalTutors, setTotalTutors] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: pendingTutorsData } = await supabase
        .from('tutor_details')
        .select(`
          id,
          user_id,
          transcript_url,
          qualifications_url,
          id_copy_url,
          created_at,
          profiles!tutor_details_user_id_fkey(
            name,
            email,
            phone_number
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingTutorsData) {
        const formattedTutors: PendingTutor[] = pendingTutorsData.map((tutor: any) => ({
          id: tutor.id,
          userId: tutor.user_id,
          name: tutor.profiles?.name || 'Unknown',
          email: tutor.profiles?.email || 'No email',
          phoneNumber: tutor.profiles?.phone_number || null,
          transcriptUrl: tutor.transcript_url,
          qualificationsUrl: tutor.qualifications_url,
          idCopyUrl: tutor.id_copy_url,
          createdAt: tutor.created_at,
        }));
        setPendingTutors(formattedTutors);
      }

      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setTotalUsers(usersCount || 0);

      const { count: tutorsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'tutor');
      setTotalTutors(tutorsCount || 0);

      const { count: studentsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      setTotalStudents(studentsCount || 0);

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          service_id,
          delivery_mode,
          class_type,
          preferred_date,
          preferred_time,
          notes,
          created_at,
          profiles!bookings_student_id_fkey(name, email),
          tutoring_services(name)
        `)
        .eq('status', 'pending')
        .eq('class_type', 'one-on-one')
        .order('created_at', { ascending: false });

      if (bookingsData) {
        const formattedBookings: PendingBooking[] = bookingsData.map((booking: any) => ({
          id: booking.id,
          studentId: booking.student_id,
          studentName: booking.profiles?.name || 'Unknown',
          studentEmail: booking.profiles?.email || '',
          serviceName: booking.tutoring_services?.name || 'Unknown Service',
          serviceId: booking.service_id,
          deliveryMode: booking.delivery_mode || 'Not specified',
          classType: booking.class_type || 'one-on-one',
          preferredDate: booking.preferred_date,
          preferredTime: booking.preferred_time,
          notes: booking.notes,
          createdAt: booking.created_at,
        }));
        setPendingBookings(formattedBookings);
      }

      const { data: groupSessionsData } = await supabase
        .from('group_sessions')
        .select('*')
        .in('status', ['forming', 'ready'])
        .order('created_at', { ascending: false });

      if (groupSessionsData) {
        const formattedGroupSessions: PendingGroupSession[] = groupSessionsData.map((session: any) => ({
          id: session.id,
          subject: session.subject,
          sessionType: session.session_type,
          preferredDate: session.preferred_date,
          preferredTime: session.preferred_time,
          status: session.status,
          currentCount: session.current_count,
          minStudents: session.min_students,
          maxStudents: session.max_students,
          createdAt: session.created_at,
        }));
        setPendingGroupSessions(formattedGroupSessions);
      }

      const { data: tutorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'tutor');

      if (tutorsData) {
        setAvailableTutors(tutorsData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (tutorId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tutor_details')
        .update({ status: 'approved', updated_at: new Date().toISOString() })
        .eq('id', tutorId);

      if (error) throw error;

      setPendingTutors(pendingTutors.filter((t) => t.id !== tutorId));
      setSelectedTutor(null);
    } catch (error) {
      console.error('Failed to approve tutor:', error);
      alert('Failed to approve tutor. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (tutorId: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('tutor_details')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', tutorId);

      if (error) throw error;

      setPendingTutors(pendingTutors.filter((t) => t.id !== tutorId));
      setSelectedTutor(null);
    } catch (error) {
      console.error('Failed to reject tutor:', error);
      alert('Failed to reject tutor. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openBookingApprovalModal = async (booking: PendingBooking) => {
    setSelectedBooking(booking);
    setSelectedTutorsForBooking([]);
    await checkTutorAvailability(booking);
  };

  const checkTutorAvailability = async (booking: PendingBooking) => {
    try {
      const bookingDate = new Date(booking.preferredDate);
      const dayOfWeek = bookingDate.getDay();
      const bookingTime = booking.preferredTime;

      const { data: tutorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'tutor');

      if (!tutorsData) {
        setAvailableTutors([]);
        return;
      }

      const tutorsWithAvailability = await Promise.all(
        tutorsData.map(async (tutor) => {
          const { data: availability } = await supabase
            .from('tutor_availability')
            .select('*')
            .eq('tutor_id', tutor.id)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true);

          const isAvailable = availability?.some((slot) => {
            const slotStart = slot.start_time;
            const slotEnd = slot.end_time;
            return bookingTime >= slotStart && bookingTime < slotEnd;
          }) || false;

          return {
            id: tutor.id,
            name: tutor.name,
            email: tutor.email,
            isAvailable,
          };
        })
      );

      tutorsWithAvailability.sort((a, b) => {
        if (a.isAvailable === b.isAvailable) return 0;
        return a.isAvailable ? -1 : 1;
      });

      setAvailableTutors(tutorsWithAvailability);
    } catch (error) {
      console.error('Failed to check tutor availability:', error);
    }
  };

  const handleApproveAndAssign = async () => {
    if (!selectedBooking || selectedTutorsForBooking.length === 0) {
      alert('Please select at least 1 tutor to assign');
      return;
    }

    if (selectedTutorsForBooking.length > 5) {
      alert('Cannot assign more than 5 tutors to a session');
      return;
    }

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update booking status and assign first tutor to tutor_id (for backward compatibility)
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'assigned',
          tutor_id: selectedTutorsForBooking[0],
          tutor_assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedBooking.id);

      if (bookingError) throw bookingError;

      // Insert all selected tutors into booking_tutors junction table
      const tutorAssignments = selectedTutorsForBooking.map((tutorId, index) => ({
        booking_id: selectedBooking.id,
        tutor_id: tutorId,
        assigned_by: user?.id,
        assignment_order: index + 1,
      }));

      const { error: assignmentError } = await supabase
        .from('booking_tutors')
        .insert(tutorAssignments);

      if (assignmentError) throw assignmentError;

      setPendingBookings(pendingBookings.filter((b) => b.id !== selectedBooking.id));
      setSelectedBooking(null);
      setSelectedTutorsForBooking([]);
      alert(`Booking approved and ${selectedTutorsForBooking.length} tutor(s) assigned successfully!`);
    } catch (error) {
      console.error('Failed to approve booking:', error);
      alert('Failed to approve booking. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to reject this booking?')) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (error) throw error;

      setPendingBookings(pendingBookings.filter((b) => b.id !== bookingId));
      alert('Booking rejected.');
    } catch (error) {
      console.error('Failed to reject booking:', error);
      alert('Failed to reject booking. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openGroupSessionApprovalModal = async (groupSession: PendingGroupSession) => {
    setSelectedGroupSession(groupSession);
    setSelectedTutorsForGroup([]);

    const { data: tutorsData } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'tutor');

    if (tutorsData) {
      setAvailableTutors(tutorsData.map(t => ({ ...t, isAvailable: true })));
    }
  };

  const handleApproveGroupSession = async () => {
    if (!selectedGroupSession || selectedTutorsForGroup.length === 0) {
      alert('Please select at least 1 tutor to assign');
      return;
    }

    if (selectedTutorsForGroup.length > 5) {
      alert('Cannot assign more than 5 tutors to a session');
      return;
    }

    setActionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Update group session status and assign first tutor to tutor_id (for backward compatibility)
      const { error: sessionError } = await supabase
        .from('group_sessions')
        .update({
          status: 'approved',
          tutor_id: selectedTutorsForGroup[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedGroupSession.id);

      if (sessionError) throw sessionError;

      // Insert all selected tutors into group_session_tutors junction table
      const tutorAssignments = selectedTutorsForGroup.map((tutorId, index) => ({
        group_session_id: selectedGroupSession.id,
        tutor_id: tutorId,
        assigned_by: user?.id,
        assignment_order: index + 1,
      }));

      const { error: assignmentError } = await supabase
        .from('group_session_tutors')
        .insert(tutorAssignments);

      if (assignmentError) throw assignmentError;

      setPendingGroupSessions(pendingGroupSessions.filter((g) => g.id !== selectedGroupSession.id));
      setSelectedGroupSession(null);
      setSelectedTutorsForGroup([]);
      alert(`Group session approved and ${selectedTutorsForGroup.length} tutor(s) assigned successfully!`);
    } catch (error) {
      console.error('Failed to approve group session:', error);
      alert('Failed to approve group session. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelGroupSession = async (groupSessionId: string) => {
    if (!confirm('Are you sure you want to cancel this group session?')) {
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('group_sessions')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', groupSessionId);

      if (error) throw error;

      setPendingGroupSessions(pendingGroupSessions.filter((g) => g.id !== groupSessionId));
      alert('Group session cancelled.');
    } catch (error) {
      console.error('Failed to cancel group session:', error);
      alert('Failed to cancel group session. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const stats = [
    {
      label: 'Total Users',
      value: totalUsers,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Pending Tutors',
      value: pendingTutors.length,
      icon: <Clock className="w-6 h-6" />,
      color: 'bg-orange-50 text-orange-600',
      highlight: pendingTutors.length > 0,
    },
    {
      label: 'Pending Bookings',
      value: pendingBookings.length + pendingGroupSessions.length,
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-yellow-50 text-yellow-600',
      highlight: (pendingBookings.length + pendingGroupSessions.length) > 0,
    },
    {
      label: 'Students',
      value: totalStudents,
      icon: <Users className="w-6 h-6" />,
      color: 'bg-purple-50 text-purple-600',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-600 mt-1">Manage your tutoring company operations</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} hover className={stat.highlight ? 'ring-2 ring-orange-500' : ''}>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                  {stat.highlight && (
                    <Badge variant="warning" className="mt-2">
                      Requires Attention
                    </Badge>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  {stat.icon}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {pendingTutors.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Pending Tutor Approvals</h2>
                <Badge variant="warning">{pendingTutors.length}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {pendingTutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{tutor.name}</p>
                    <p className="text-sm text-slate-600">{tutor.email}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Registered: {new Date(tutor.createdAt).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {tutor.transcriptUrl && (
                        <Badge variant="info">Transcript</Badge>
                      )}
                      {tutor.qualificationsUrl && (
                        <Badge variant="success">Qualifications</Badge>
                      )}
                      {tutor.idCopyUrl && (
                        <Badge variant="default">ID Copy</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTutor(tutor)}
                    >
                      Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {pendingTutors.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-900 font-medium">All tutor applications reviewed</p>
              <p className="text-slate-600 text-sm mt-1">No pending approvals at this time</p>
            </div>
          </CardBody>
        </Card>
      )}

      {pendingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Pending Session Bookings</h2>
                <Badge variant="warning">{pendingBookings.length}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {pendingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-slate-900">{booking.studentName}</p>
                      <Badge variant="info">{booking.serviceName}</Badge>
                      <Badge variant={booking.classType === 'group' ? 'warning' : 'default'}>
                        {booking.classType === 'group' ? 'Group Session' : 'One-on-One'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{booking.studentEmail}</p>
                    <p className="text-sm text-slate-600 mt-2">
                      {new Date(booking.preferredDate).toLocaleDateString()} at {booking.preferredTime}
                    </p>
                    <p className="text-sm text-slate-500 capitalize">
                      {booking.deliveryMode.replace('_', ' ')}
                    </p>
                    {booking.notes && (
                      <p className="text-sm text-slate-600 mt-2 italic">"{booking.notes}"</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Requested: {new Date(booking.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => openBookingApprovalModal(booking)}
                      disabled={actionLoading}
                    >
                      <UserCheck className="w-4 h-4 mr-1" />
                      Assign Tutor
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRejectBooking(booking.id)}
                      disabled={actionLoading}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {pendingGroupSessions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-slate-900">Group Sessions</h2>
                <Badge variant="warning">{pendingGroupSessions.length}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {pendingGroupSessions.map((groupSession) => (
                <div
                  key={groupSession.id}
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-5 h-5 text-green-600" />
                      <p className="font-semibold text-slate-900">{groupSession.subject}</p>
                      <Badge variant="success">Group Session</Badge>
                      <Badge variant="info">
                        {groupSession.currentCount} / {groupSession.maxStudents} students
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-2">
                      {new Date(groupSession.preferredDate).toLocaleDateString()} at {groupSession.preferredTime}
                    </p>
                    <p className="text-sm text-slate-500 capitalize">
                      {groupSession.sessionType.replace('_', ' ')}
                    </p>
                    <p className="text-sm text-slate-600 mt-2">
                      Minimum {groupSession.minStudents} students required
                      {groupSession.status === 'ready' ? (
                        <span className="text-green-600 font-medium ml-1">- Ready for approval</span>
                      ) : (
                        <span className="text-orange-600 font-medium ml-1">
                          - Waiting for {groupSession.minStudents - groupSession.currentCount} more student(s)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Created: {new Date(groupSession.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    {groupSession.status === 'ready' ? (
                      <>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => openGroupSessionApprovalModal(groupSession)}
                          disabled={actionLoading}
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          Assign Tutor
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleCancelGroupSession(groupSession.id)}
                          disabled={actionLoading}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Awaiting Students
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleCancelGroupSession(groupSession.id)}
                          disabled={actionLoading}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={!!selectedTutor}
        onClose={() => setSelectedTutor(null)}
        title="Review Tutor Application"
      >
        {selectedTutor && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Tutor Information</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Name:</span>
                  <p className="font-medium text-slate-900">{selectedTutor.name}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Email:</span>
                  <p className="font-medium text-slate-900">{selectedTutor.email}</p>
                </div>
                {selectedTutor.phoneNumber && (
                  <div>
                    <span className="text-sm text-slate-600">Phone:</span>
                    <p className="font-medium text-slate-900">{selectedTutor.phoneNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-slate-600">Registration Date:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedTutor.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Uploaded Documents</h3>
              <div className="space-y-3">
                {selectedTutor.transcriptUrl ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900">Transcript</p>
                        <p className="text-sm text-slate-600">Academic transcript document</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedTutor.transcriptUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Transcript not uploaded</span>
                  </div>
                )}

                {selectedTutor.qualificationsUrl ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-slate-900">Qualifications</p>
                        <p className="text-sm text-slate-600">Certificates and degrees</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedTutor.qualificationsUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Qualifications not uploaded</span>
                  </div>
                )}

                {selectedTutor.idCopyUrl ? (
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="font-medium text-slate-900">Copy of ID</p>
                        <p className="text-sm text-slate-600">Identity verification document</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedTutor.idCopyUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">ID copy not uploaded</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                className="flex-1"
                variant="success"
                onClick={() => handleApprove(selectedTutor.id)}
                isLoading={actionLoading}
                disabled={actionLoading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Tutor
              </Button>
              <Button
                className="flex-1"
                variant="danger"
                onClick={() => handleReject(selectedTutor.id)}
                isLoading={actionLoading}
                disabled={actionLoading}
              >
                <X className="w-4 h-4 mr-2" />
                Decline Tutor
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedBooking}
        onClose={() => {
          setSelectedBooking(null);
          setSelectedTutorsForBooking([]);
        }}
        title="Approve Booking & Assign Tutor"
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Booking Details</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Student:</span>
                  <p className="font-medium text-slate-900">{selectedBooking.studentName}</p>
                  <p className="text-sm text-slate-600">{selectedBooking.studentEmail}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Service:</span>
                  <p className="font-medium text-slate-900">{selectedBooking.serviceName}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Class Type:</span>
                  <p className="font-medium text-slate-900 capitalize">
                    {selectedBooking.classType === 'group' ? 'Group Session' : 'One-on-One'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Date & Time:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedBooking.preferredDate).toLocaleDateString()} at {selectedBooking.preferredTime}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Delivery Mode:</span>
                  <p className="font-medium text-slate-900 capitalize">
                    {selectedBooking.deliveryMode.replace('_', ' ')}
                  </p>
                </div>
                {selectedBooking.notes && (
                  <div>
                    <span className="text-sm text-slate-600">Student Notes:</span>
                    <p className="text-sm text-slate-700 italic mt-1">"{selectedBooking.notes}"</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Tutors to Assign (Min: 1, Max: 5)
              </label>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {selectedTutorsForBooking.length} tutor(s) selected
                </p>
                {selectedTutorsForBooking.length >= 5 && (
                  <Badge variant="warning">Maximum reached</Badge>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-300 rounded-lg p-3">
                {availableTutors.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">No tutors found</p>
                ) : (
                  availableTutors.map(tutor => (
                    <label
                      key={tutor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        tutor.isAvailable
                          ? selectedTutorsForBooking.includes(tutor.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300 bg-white'
                          : 'border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed'
                      } ${
                        selectedTutorsForBooking.length >= 5 && !selectedTutorsForBooking.includes(tutor.id)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="tutors"
                        value={tutor.id}
                        checked={selectedTutorsForBooking.includes(tutor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedTutorsForBooking.length < 5) {
                              setSelectedTutorsForBooking([...selectedTutorsForBooking, tutor.id]);
                            }
                          } else {
                            setSelectedTutorsForBooking(selectedTutorsForBooking.filter(id => id !== tutor.id));
                          }
                        }}
                        disabled={!tutor.isAvailable || (selectedTutorsForBooking.length >= 5 && !selectedTutorsForBooking.includes(tutor.id))}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${
                            tutor.isAvailable ? 'text-slate-900' : 'text-slate-400'
                          }`}>
                            {tutor.name}
                          </p>
                          {tutor.isAvailable ? (
                            <Badge variant="success">Available</Badge>
                          ) : (
                            <Badge variant="default">Not Available</Badge>
                          )}
                          {selectedTutorsForBooking.includes(tutor.id) && (
                            <Badge variant="info">
                              #{selectedTutorsForBooking.indexOf(tutor.id) + 1}
                            </Badge>
                          )}
                        </div>
                        <p className={`text-sm ${
                          tutor.isAvailable ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {tutor.email}
                        </p>
                        {!tutor.isAvailable && (
                          <p className="text-xs text-slate-500 mt-1">
                            No availability set for this day/time
                          </p>
                        )}
                      </div>
                    </label>
                  ))
                )}
              </div>
              {availableTutors.some(t => !t.isAvailable) && (
                <p className="text-xs text-slate-500 mt-2">
                  Note: Grayed out tutors are not available for the selected date and time
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                className="flex-1"
                variant="success"
                onClick={handleApproveAndAssign}
                isLoading={actionLoading}
                disabled={actionLoading || selectedTutorsForBooking.length === 0}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Approve & Assign Tutor
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setSelectedBooking(null);
                  setSelectedTutorsForBooking([]);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedGroupSession}
        onClose={() => {
          setSelectedGroupSession(null);
          setSelectedTutorsForGroup([]);
        }}
        title="Approve Group Session & Assign Tutor"
        size="lg"
      >
        {selectedGroupSession && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Group Session Details</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Subject:</span>
                  <p className="font-medium text-slate-900">{selectedGroupSession.subject}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Participants:</span>
                  <p className="font-medium text-slate-900">
                    {selectedGroupSession.currentCount} students enrolled (min: {selectedGroupSession.minStudents}, max: {selectedGroupSession.maxStudents})
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Date & Time:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedGroupSession.preferredDate).toLocaleDateString()} at {selectedGroupSession.preferredTime}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Session Type:</span>
                  <p className="font-medium text-slate-900 capitalize">
                    {selectedGroupSession.sessionType.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Tutors to Assign (Min: 1, Max: 5)
              </label>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  {selectedTutorsForGroup.length} tutor(s) selected
                </p>
                {selectedTutorsForGroup.length >= 5 && (
                  <Badge variant="warning">Maximum reached</Badge>
                )}
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-300 rounded-lg p-3">
                {availableTutors.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4 text-center">No tutors found</p>
                ) : (
                  availableTutors.map(tutor => (
                    <label
                      key={tutor.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTutorsForGroup.includes(tutor.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      } ${
                        selectedTutorsForGroup.length >= 5 && !selectedTutorsForGroup.includes(tutor.id)
                          ? 'opacity-50 cursor-not-allowed'
                          : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="tutorsGroup"
                        value={tutor.id}
                        checked={selectedTutorsForGroup.includes(tutor.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (selectedTutorsForGroup.length < 5) {
                              setSelectedTutorsForGroup([...selectedTutorsForGroup, tutor.id]);
                            }
                          } else {
                            setSelectedTutorsForGroup(selectedTutorsForGroup.filter(id => id !== tutor.id));
                          }
                        }}
                        disabled={selectedTutorsForGroup.length >= 5 && !selectedTutorsForGroup.includes(tutor.id)}
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{tutor.name}</p>
                          {selectedTutorsForGroup.includes(tutor.id) && (
                            <Badge variant="info">
                              #{selectedTutorsForGroup.indexOf(tutor.id) + 1}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{tutor.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                className="flex-1"
                variant="success"
                onClick={handleApproveGroupSession}
                isLoading={actionLoading}
                disabled={actionLoading || selectedTutorsForGroup.length === 0}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Approve & Assign Tutor
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setSelectedGroupSession(null);
                  setSelectedTutorsForGroup([]);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
