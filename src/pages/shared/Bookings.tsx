import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { bookingsService } from '../../services/bookings.service';
import { notificationsService } from '../../services/notifications.service';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Plus, Search, User, Users, Link, ExternalLink } from 'lucide-react';
import { Booking, GroupSession, SessionType, ClassType } from '../../types';

export const Bookings: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [groupSessions, setGroupSessions] = useState<GroupSession[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [filteredGroupSessions, setFilteredGroupSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedGroupSession, setSelectedGroupSession] = useState<GroupSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    subject: '',
    sessionType: 'online' as SessionType,
    classType: 'one-on-one' as ClassType,
    preferredDate: '',
    preferredTime: '',
    notes: '',
  });

  const [meetingLinkInput, setMeetingLinkInput] = useState('');
  const [isSavingMeetingLink, setIsSavingMeetingLink] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    let filteredB = bookings.filter((b) => b.classType === 'one-on-one');
    let filteredG = groupSessions;

    if (searchTerm) {
      filteredB = filteredB.filter(
        (b) =>
          b.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.studentName.toLowerCase().includes(searchTerm.toLowerCase())
      );
      filteredG = filteredG.filter((g) =>
        g.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filteredB = filteredB.filter((b) => b.status === statusFilter);
      filteredG = filteredG.filter((g) => g.status === statusFilter);
    }

    setFilteredBookings(filteredB);
    setFilteredGroupSessions(filteredG);
  }, [searchTerm, statusFilter, bookings, groupSessions]);

  useEffect(() => {
    const markNotificationsAsRead = async () => {
      if (!user || user.role !== 'student') return;

      try {
        const notifications = await notificationsService.getNotifications();
        const unreadNotifications = notifications.filter(n => !n.is_read);

        for (const notification of unreadNotifications) {
          if (notification.type === 'meeting_link') {
            if (selectedBooking && notification.related_id === selectedBooking.id && notification.related_type === 'booking') {
              await notificationsService.markAsRead(notification.id);
            }
            if (selectedGroupSession && notification.related_id === selectedGroupSession.id && notification.related_type === 'group_session') {
              await notificationsService.markAsRead(notification.id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to mark notifications as read:', error);
      }
    };

    if (selectedBooking || selectedGroupSession) {
      markNotificationsAsRead();
    }
  }, [selectedBooking, selectedGroupSession, user]);

  const fetchBookings = async () => {
    try {
      const bookingData = user?.role === 'admin'
        ? await bookingsService.getAll()
        : await bookingsService.getMyBookings(user?.id || '');
      setBookings(bookingData);

      const groupData = user?.role === 'admin'
        ? await bookingsService.getAllGroupSessions()
        : await bookingsService.getMyGroupSessions(user?.id || '');
      setGroupSessions(groupData);

      setFilteredBookings(bookingData.filter((b) => b.classType === 'one-on-one'));
      setFilteredGroupSessions(groupData);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to remove this booking? This action cannot be undone.')) {
      return;
    }

    try {
      await bookingsService.deleteBooking(bookingId);
      setBookings(bookings.filter(b => b.id !== bookingId));
      setFilteredBookings(filteredBookings.filter(b => b.id !== bookingId));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(null);
      }
    } catch (error) {
      console.error('Failed to remove booking:', error);
      alert('Failed to remove booking. Please try again.');
    }
  };

  const handleRemoveGroupSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to remove this group session? This action cannot be undone.')) {
      return;
    }

    try {
      await bookingsService.deleteGroupSession(sessionId);
      setGroupSessions(groupSessions.filter(g => g.id !== sessionId));
      setFilteredGroupSessions(filteredGroupSessions.filter(g => g.id !== sessionId));
      if (selectedGroupSession?.id === sessionId) {
        setSelectedGroupSession(null);
      }
    } catch (error) {
      console.error('Failed to remove group session:', error);
      alert('Failed to remove group session. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bookingsService.create(formData);
      setIsModalOpen(false);
      fetchBookings();
      setFormData({
        subject: '',
        sessionType: 'online',
        classType: 'one-on-one',
        preferredDate: '',
        preferredTime: '',
        notes: '',
      });
    } catch (error) {
      console.error('Failed to create booking:', error);
    }
  };

  const handleSaveMeetingLinkForBooking = async () => {
    if (!selectedBooking || !meetingLinkInput.trim()) return;

    setIsSavingMeetingLink(true);
    try {
      await bookingsService.updateMeetingLink(selectedBooking.id, meetingLinkInput.trim());
      await fetchBookings();
      const updatedBooking = bookings.find(b => b.id === selectedBooking.id);
      if (updatedBooking) {
        setSelectedBooking({ ...updatedBooking, meetingLink: meetingLinkInput.trim() });
      }
      setMeetingLinkInput('');
      alert('Meeting link saved and sent to student!');
    } catch (error) {
      console.error('Failed to save meeting link:', error);
      alert('Failed to save meeting link. Please try again.');
    } finally {
      setIsSavingMeetingLink(false);
    }
  };

  const handleSaveMeetingLinkForGroupSession = async () => {
    if (!selectedGroupSession || !meetingLinkInput.trim()) return;

    setIsSavingMeetingLink(true);
    try {
      await bookingsService.updateGroupSessionMeetingLink(selectedGroupSession.id, meetingLinkInput.trim());
      await fetchBookings();
      const updatedSession = groupSessions.find(g => g.id === selectedGroupSession.id);
      if (updatedSession) {
        setSelectedGroupSession({ ...updatedSession, meetingLink: meetingLinkInput.trim() });
      }
      setMeetingLinkInput('');
      alert('Meeting link saved and sent to all participants!');
    } catch (error) {
      console.error('Failed to save meeting link:', error);
      alert('Failed to save meeting link. Please try again.');
    } finally {
      setIsSavingMeetingLink(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'neutral' | 'danger'> = {
      pending: 'warning',
      approved: 'info',
      assigned: 'success',
      completed: 'neutral',
      cancelled: 'danger',
      rejected: 'danger',
      forming: 'warning',
      ready: 'info',
      full: 'neutral',
    };
    return <Badge variant={variants[status] || 'neutral'}>{status}</Badge>;
  };

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
          <h1 className="text-3xl font-bold text-slate-900">Bookings</h1>
          <p className="text-slate-600 mt-1">Manage your tutoring sessions</p>
        </div>
        {user?.role === 'student' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by subject or student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              className="md:w-48"
            />
          </div>
        </CardBody>
      </Card>

      {filteredBookings.length === 0 && filteredGroupSessions.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No bookings found</h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by creating your first booking'}
            </p>
            {user?.role === 'student' && (
              <Button onClick={() => setIsModalOpen(true)}>Create Booking</Button>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGroupSessions.map((groupSession) => (
            <Card key={groupSession.id} hover>
              <CardBody>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Users className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-slate-900">{groupSession.subject}</h3>
                      {getStatusBadge(groupSession.status)}
                      {groupSession.meetingLink && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <Link className="w-3 h-3" />
                          <span>Meeting Link</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-600">
                        <span className="font-medium">Participants:</span> {groupSession.currentCount} / {groupSession.maxStudents}
                        {groupSession.currentCount < groupSession.minStudents && (
                          <span className="text-orange-600 ml-2">
                            (Needs {groupSession.minStudents - groupSession.currentCount} more)
                          </span>
                        )}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(groupSession.preferredDate).toLocaleDateString()} at{' '}
                        {groupSession.preferredTime}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium">Session:</span>{' '}
                        <span className="capitalize">{groupSession.sessionType}</span>
                      </p>
                      <p className="text-slate-600">
                        <span className="font-medium">Class Type:</span>{' '}
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Group Session
                        </span>
                      </p>
                      {(groupSession.tutors && groupSession.tutors.length > 0) ? (
                        <p className="text-slate-600">
                          <span className="font-medium">Tutor{groupSession.tutors.length > 1 ? 's' : ''}:</span>{' '}
                          {groupSession.tutors
                            .sort((a, b) => a.assignmentOrder - b.assignmentOrder)
                            .map(t => t.tutorName)
                            .join(', ')}
                        </p>
                      ) : groupSession.tutorName && (
                        <p className="text-slate-600">
                          <span className="font-medium">Tutor:</span> {groupSession.tutorName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedGroupSession(groupSession)}>
                      View Details
                    </Button>
                    {(groupSession.status === 'cancelled' || groupSession.status === 'rejected') && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveGroupSession(groupSession.id)}
                      >
                        Remove
                      </Button>
                    )}
                    {user?.role === 'admin' && groupSession.status === 'ready' && (
                      <>
                        <Button size="sm" variant="success">
                          Approve
                        </Button>
                        <Button size="sm" variant="danger">
                          Cancel
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
          {filteredBookings.map((booking) => (
            <Card key={booking.id} hover>
              <CardBody>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-900">{booking.subject}</h3>
                      {getStatusBadge(booking.status)}
                      {booking.meetingLink && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          <Link className="w-3 h-3" />
                          <span>Meeting Link</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-slate-600">
                        <span className="font-medium">Student:</span> {booking.studentName}
                      </p>
                      {booking.subjects && booking.subjects.length > 0 && (
                        <div className="text-blue-600">
                          <span className="font-medium">Subjects ({booking.subjects.length}):</span>
                          <div className="ml-4 mt-1 space-y-1">
                            {booking.subjects
                              .sort((a, b) => a.subjectOrder - b.subjectOrder)
                              .map((s, idx) => (
                                <div key={s.id} className="text-sm">
                                  <span className="font-medium">#{idx + 1}</span> {s.subjectName}
                                  {s.durationMinutes && (
                                    <span className="text-slate-600 ml-2">
                                      ({s.durationMinutes >= 60
                                        ? `${Math.floor(s.durationMinutes / 60)}h${s.durationMinutes % 60 > 0 ? ` ${s.durationMinutes % 60}min` : ''}`
                                        : `${s.durationMinutes}min`
                                      })
                                    </span>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      <p className="text-slate-600">
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(booking.preferredDate).toLocaleDateString()} at{' '}
                        {booking.preferredTime}
                      </p>
                      {booking.subjects && booking.subjects.length > 0 && (
                        <p className="text-slate-600">
                          <span className="font-medium">Total Duration:</span>{' '}
                          {(() => {
                            const total = booking.subjects.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
                            return total >= 60
                              ? `${Math.floor(total / 60)} hour${Math.floor(total / 60) > 1 ? 's' : ''}${total % 60 > 0 ? ` ${total % 60} min` : ''}`
                              : `${total} minutes`;
                          })()}
                        </p>
                      )}
                      {booking.curriculum && (
                        <p className="text-slate-600">
                          <span className="font-medium">Curriculum:</span> {booking.curriculum}
                        </p>
                      )}
                      <p className="text-slate-600">
                        <span className="font-medium">Session:</span>{' '}
                        <span className="capitalize">{booking.sessionType}</span>
                      </p>
                      <p className="text-slate-600 flex items-center gap-1">
                        <span className="font-medium">Class Type:</span>{' '}
                        {booking.classType === 'one-on-one' ? (
                          <span className="inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            One-on-One
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Group
                          </span>
                        )}
                      </p>
                      {(booking.tutors && booking.tutors.length > 0) ? (
                        <p className="text-slate-600">
                          <span className="font-medium">Tutor{booking.tutors.length > 1 ? 's' : ''}:</span>{' '}
                          {booking.tutors
                            .sort((a, b) => a.assignmentOrder - b.assignmentOrder)
                            .map(t => t.tutorName)
                            .join(', ')}
                        </p>
                      ) : booking.tutorName && (
                        <p className="text-slate-600">
                          <span className="font-medium">Tutor:</span> {booking.tutorName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedBooking(booking)}>
                      View Details
                    </Button>
                    {(booking.status === 'cancelled' || booking.status === 'rejected') && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRemoveBooking(booking.id)}
                      >
                        Remove
                      </Button>
                    )}
                    {user?.role === 'admin' && booking.status === 'pending' && (
                      <>
                        <Button size="sm" variant="success">
                          Approve
                        </Button>
                        <Button size="sm" variant="danger">
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!selectedGroupSession}
        onClose={() => setSelectedGroupSession(null)}
        title="Group Session Details"
        size="lg"
      >
        {selectedGroupSession && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Session Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-600">Subject:</span>
                  <p className="font-medium text-slate-900">{selectedGroupSession.subject}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedGroupSession.status)}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Class Type:</span>
                  <p className="font-medium text-slate-900 flex items-center gap-2 mt-1">
                    <Users className="w-4 h-4" />
                    Group Session
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Session Type:</span>
                  <p className="font-medium text-slate-900 capitalize">{selectedGroupSession.sessionType}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Date & Time:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedGroupSession.preferredDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {selectedGroupSession.preferredTime}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Capacity:</span>
                  <p className="font-medium text-slate-900">
                    {selectedGroupSession.currentCount} / {selectedGroupSession.maxStudents} students
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Minimum required: {selectedGroupSession.minStudents} students
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">
                Participants ({selectedGroupSession.currentCount})
              </h3>
              {selectedGroupSession.participants && selectedGroupSession.participants.length > 0 ? (
                <div className="space-y-3">
                  {selectedGroupSession.participants.map((participant) => (
                    <div key={participant.id} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <User className="w-4 h-4 mt-1 text-slate-400" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{participant.studentName}</p>
                          {participant.studentEmail && (
                            <p className="text-sm text-slate-600">{participant.studentEmail}</p>
                          )}
                          {participant.notes && (
                            <p className="text-sm text-slate-500 mt-1 italic">{participant.notes}</p>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            Joined: {new Date(participant.joinedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 italic">No participants yet</p>
              )}
            </div>

            {(selectedGroupSession.status === 'approved' || selectedGroupSession.status === 'assigned') && (
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Link className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Meeting Link</h3>
                </div>
                {selectedGroupSession.meetingLink ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="text-sm text-slate-600 mb-2 break-all">
                        {selectedGroupSession.meetingLink}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => window.open(selectedGroupSession.meetingLink, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Join Meeting
                      </Button>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'tutor') && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Paste new meeting link to update..."
                          value={meetingLinkInput}
                          onChange={(e) => setMeetingLinkInput(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveMeetingLinkForGroupSession}
                          disabled={!meetingLinkInput.trim() || isSavingMeetingLink}
                        >
                          {isSavingMeetingLink ? 'Updating...' : 'Update Link'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {(user?.role === 'admin' || user?.role === 'tutor') ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 mb-2">
                          Add a meeting link (Teams, Google Meet, Zoom, etc.) to share with all participants.
                        </p>
                        <Input
                          placeholder="Paste meeting link here..."
                          value={meetingLinkInput}
                          onChange={(e) => setMeetingLinkInput(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveMeetingLinkForGroupSession}
                          disabled={!meetingLinkInput.trim() || isSavingMeetingLink}
                        >
                          {isSavingMeetingLink ? 'Saving...' : 'Save & Send to Participants'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 italic">
                        Meeting link will be shared here once available.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {((selectedGroupSession.tutors && selectedGroupSession.tutors.length > 0) || selectedGroupSession.tutorName) && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-3">
                  Tutor{(selectedGroupSession.tutors && selectedGroupSession.tutors.length > 1) ? 's' : ''}
                </h3>
                {selectedGroupSession.tutors && selectedGroupSession.tutors.length > 0 ? (
                  <div className="space-y-2">
                    {selectedGroupSession.tutors
                      .sort((a, b) => a.assignmentOrder - b.assignmentOrder)
                      .map((tutor, index) => (
                        <div key={tutor.id} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-500">#{index + 1}</span>
                          <p className="font-medium text-slate-900">{tutor.tutorName}</p>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="font-medium text-slate-900">{selectedGroupSession.tutorName}</p>
                )}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Timeline</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Created:</span>
                  <p className="text-sm text-slate-700">
                    {new Date(selectedGroupSession.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedGroupSession.updatedAt && (
                  <div>
                    <span className="text-sm text-slate-600">Last Updated:</span>
                    <p className="text-sm text-slate-700">
                      {new Date(selectedGroupSession.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setSelectedGroupSession(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Booking Details"
        size="lg"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Session Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-600">Subject:</span>
                  <p className="font-medium text-slate-900">{selectedBooking.subject}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Status:</span>
                  <div className="mt-1">{getStatusBadge(selectedBooking.status)}</div>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Class Type:</span>
                  <p className="font-medium text-slate-900 flex items-center gap-2 mt-1">
                    {selectedBooking.classType === 'one-on-one' ? (
                      <>
                        <User className="w-4 h-4" />
                        One-on-One Session
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Group Session
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Session Type:</span>
                  <p className="font-medium text-slate-900 capitalize">{selectedBooking.sessionType}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Date & Time:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedBooking.preferredDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {selectedBooking.preferredTime}
                  </p>
                </div>
                {selectedBooking.curriculum && (
                  <div>
                    <span className="text-sm text-slate-600">Curriculum:</span>
                    <p className="font-medium text-slate-900">{selectedBooking.curriculum}</p>
                  </div>
                )}
                {selectedBooking.subjects && selectedBooking.subjects.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-600">Subjects & Durations:</span>
                    <div className="mt-2 space-y-2">
                      {selectedBooking.subjects
                        .sort((a, b) => a.subjectOrder - b.subjectOrder)
                        .map((subject, index) => (
                          <div key={subject.id} className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                            <div>
                              <span className="text-sm font-medium text-slate-700">
                                #{index + 1} {subject.subjectName}
                              </span>
                            </div>
                            {subject.durationMinutes && (
                              <span className="text-sm text-slate-600">
                                {subject.durationMinutes >= 60
                                  ? `${Math.floor(subject.durationMinutes / 60)}h${subject.durationMinutes % 60 > 0 ? ` ${subject.durationMinutes % 60}min` : ''}`
                                  : `${subject.durationMinutes}min`
                                }
                              </span>
                            )}
                          </div>
                        ))}
                      <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200 font-semibold">
                        <span className="text-sm text-slate-900">Total Duration:</span>
                        <span className="text-sm text-slate-900">
                          {(() => {
                            const total = selectedBooking.subjects.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
                            return total >= 60
                              ? `${Math.floor(total / 60)} hour${Math.floor(total / 60) > 1 ? 's' : ''}${total % 60 > 0 ? ` ${total % 60} min` : ''}`
                              : `${total} minutes`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Participants</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-600">Student:</span>
                  <p className="font-medium text-slate-900">{selectedBooking.studentName}</p>
                </div>
                {(selectedBooking.tutors && selectedBooking.tutors.length > 0) ? (
                  <div>
                    <span className="text-sm text-slate-600">Tutor{selectedBooking.tutors.length > 1 ? 's' : ''}:</span>
                    <div className="mt-1 space-y-1">
                      {selectedBooking.tutors
                        .sort((a, b) => a.assignmentOrder - b.assignmentOrder)
                        .map((tutor, index) => (
                          <div key={tutor.id} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">#{index + 1}</span>
                            <p className="font-medium text-slate-900">{tutor.tutorName}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : selectedBooking.tutorName ? (
                  <div>
                    <span className="text-sm text-slate-600">Tutor:</span>
                    <p className="font-medium text-slate-900">{selectedBooking.tutorName}</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm text-slate-600">Tutor:</span>
                    <p className="text-slate-500 italic">Not assigned yet</p>
                  </div>
                )}
              </div>
            </div>

            {(selectedBooking.status === 'approved' || selectedBooking.status === 'assigned') && (
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Link className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-900">Meeting Link</h3>
                </div>
                {selectedBooking.meetingLink ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="text-sm text-slate-600 mb-2 break-all">
                        {selectedBooking.meetingLink}
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => window.open(selectedBooking.meetingLink, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Join Meeting
                      </Button>
                    </div>
                    {(user?.role === 'admin' || user?.role === 'tutor') && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Paste new meeting link to update..."
                          value={meetingLinkInput}
                          onChange={(e) => setMeetingLinkInput(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveMeetingLinkForBooking}
                          disabled={!meetingLinkInput.trim() || isSavingMeetingLink}
                        >
                          {isSavingMeetingLink ? 'Updating...' : 'Update Link'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {(user?.role === 'admin' || user?.role === 'tutor') ? (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 mb-2">
                          Add a meeting link (Teams, Google Meet, Zoom, etc.) to share with the student.
                        </p>
                        <Input
                          placeholder="Paste meeting link here..."
                          value={meetingLinkInput}
                          onChange={(e) => setMeetingLinkInput(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={handleSaveMeetingLinkForBooking}
                          disabled={!meetingLinkInput.trim() || isSavingMeetingLink}
                        >
                          {isSavingMeetingLink ? 'Saving...' : 'Save & Send to Student'}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 italic">
                        Meeting link will be shared here once available.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {selectedBooking.notes && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-3">Additional Notes</h3>
                <p className="text-slate-700">{selectedBooking.notes}</p>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-3">Timeline</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-slate-600">Created:</span>
                  <p className="text-sm text-slate-700">
                    {new Date(selectedBooking.createdAt).toLocaleString()}
                  </p>
                </div>
                {selectedBooking.updatedAt && (
                  <div>
                    <span className="text-sm text-slate-600">Last Updated:</span>
                    <p className="text-sm text-slate-700">
                      {new Date(selectedBooking.updatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Booking">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject"
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            placeholder="e.g., Physics - Mechanics"
            required
          />

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Class Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  formData.classType === 'one-on-one'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setFormData({ ...formData, classType: 'one-on-one' })}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-900">One-on-One</span>
                </div>
              </div>
              <div
                className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  formData.classType === 'group'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
                onClick={() => setFormData({ ...formData, classType: 'group' })}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-slate-900">Group</span>
                </div>
              </div>
            </div>
          </div>

          <Select
            label="Session Type"
            value={formData.sessionType}
            onChange={(e) =>
              setFormData({ ...formData, sessionType: e.target.value as SessionType })
            }
            options={[
              { value: 'online', label: 'Online' },
              { value: 'face-to-face', label: 'Face-to-Face' },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Preferred Date"
              type="date"
              value={formData.preferredDate}
              onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              required
            />

            <Input
              label="Preferred Time"
              type="time"
              value={formData.preferredTime}
              onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
              required
            />
          </div>

          <Input
            label="Additional Notes"
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Any specific topics or questions?"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Booking</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
