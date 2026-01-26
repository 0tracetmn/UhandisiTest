import { supabase } from '../lib/supabase';
import { Booking, GroupSession, GroupSessionParticipant } from '../types';

export const bookingsService = {
  async getAll(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        student:profiles!student_id(name, email, phone_number),
        tutor:profiles!tutor_id(name, email),
        booking_tutors(
          id,
          tutor_id,
          assignment_order,
          assigned_at,
          tutor:profiles!tutor_id(name)
        ),
        booking_subjects(
          id,
          service_id,
          subject_order,
          service:tutoring_services!service_id(name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(booking => this.formatBooking(booking));
  },

  async getMyBookings(userId: string): Promise<Booking[]> {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profile?.role === 'student') {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!student_id(name, email, phone_number),
          tutor:profiles!tutor_id(name, email),
          booking_tutors(
            id,
            tutor_id,
            assignment_order,
            assigned_at,
            tutor:profiles!tutor_id(name)
          ),
          booking_subjects(
            id,
            service_id,
            subject_order,
            service:tutoring_services!service_id(name)
          )
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(booking => this.formatBooking(booking));
    } else if (profile?.role === 'tutor') {
      const { data: directBookings } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!student_id(name, email, phone_number),
          tutor:profiles!tutor_id(name, email),
          booking_tutors(
            id,
            tutor_id,
            assignment_order,
            assigned_at,
            tutor:profiles!tutor_id(name)
          ),
          booking_subjects(
            id,
            service_id,
            subject_order,
            service:tutoring_services!service_id(name)
          )
        `)
        .eq('tutor_id', userId)
        .order('created_at', { ascending: false });

      const { data: assignedBookings } = await supabase
        .from('booking_tutors')
        .select(`
          booking_id,
          bookings(
            *,
            student:profiles!bookings_student_id_fkey(name, email, phone_number),
            tutor:profiles!bookings_tutor_id_fkey(name, email),
            booking_tutors(
              id,
              tutor_id,
              assignment_order,
              assigned_at,
              tutor:profiles!booking_tutors_tutor_id_fkey(name)
            ),
            booking_subjects(
              id,
              service_id,
              subject_order,
              service:tutoring_services!booking_subjects_service_id_fkey(name)
            )
          )
        `)
        .eq('tutor_id', userId);

      const allBookingsData = [...(directBookings || [])];

      if (assignedBookings) {
        assignedBookings.forEach((ab: any) => {
          if (ab.bookings && !allBookingsData.find(b => b.id === ab.bookings.id)) {
            allBookingsData.push(ab.bookings);
          }
        });
      }

      allBookingsData.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return allBookingsData.map(booking => this.formatBooking(booking));
    }

    return [];
  },

  formatBooking(booking: any): Booking {
    return {
      id: booking.id,
      studentId: booking.student_id,
      studentName: booking.student?.name || '',
      studentEmail: booking.student?.email || '',
      studentPhone: booking.student?.phone_number || '',
      tutorId: booking.tutor_id,
      tutorName: booking.tutor?.name,
      tutors: (booking.booking_tutors || []).map((bt: any) => ({
        id: bt.id,
        tutorId: bt.tutor_id,
        tutorName: bt.tutor?.name || '',
        assignmentOrder: bt.assignment_order,
        assignedAt: bt.assigned_at,
      })),
      subject: booking.subject,
      subjects: (booking.booking_subjects || []).map((bs: any) => ({
        id: bs.id,
        serviceId: bs.service_id,
        subjectName: bs.service?.name || '',
        subjectOrder: bs.subject_order,
      })),
      sessionType: booking.session_type,
      classType: booking.class_type || 'one-on-one',
      preferredDate: booking.preferred_date,
      preferredTime: booking.preferred_time,
      status: booking.status,
      notes: booking.notes,
      groupId: booking.group_id,
      deliveryMode: booking.delivery_mode,
      curriculum: booking.curriculum,
      durationMinutes: booking.duration_minutes,
      meetingLink: booking.meeting_link,
      createdAt: booking.created_at,
      updatedAt: booking.updated_at,
    };
  },

  async create(bookingData: {
    subject: string;
    sessionType: 'online' | 'face-to-face';
    classType: 'one-on-one' | 'group';
    preferredDate: string;
    preferredTime: string;
    notes?: string;
    deliveryMode?: string;
  }): Promise<Booking> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (bookingData.classType === 'group') {
      return this.createGroupBooking(bookingData, user.id);
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        student_id: user.id,
        subject: bookingData.subject,
        session_type: bookingData.sessionType,
        class_type: bookingData.classType,
        preferred_date: bookingData.preferredDate,
        preferred_time: bookingData.preferredTime,
        delivery_mode: bookingData.deliveryMode,
        notes: bookingData.notes,
      })
      .select(`
        *,
        student:profiles!student_id(name, email, phone_number),
        tutor:profiles!tutor_id(name, email)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      studentId: data.student_id,
      studentName: data.student?.name || '',
      studentEmail: data.student?.email || '',
      studentPhone: data.student?.phone_number || '',
      tutorId: data.tutor_id,
      tutorName: data.tutor?.name,
      subject: data.subject,
      sessionType: data.session_type,
      classType: data.class_type || 'one-on-one',
      preferredDate: data.preferred_date,
      preferredTime: data.preferred_time,
      status: data.status,
      notes: data.notes,
      groupId: data.group_id,
      groupSessionId: data.group_session_id,
      deliveryMode: data.delivery_mode,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async createGroupBooking(bookingData: {
    subject: string;
    sessionType: 'online' | 'face-to-face';
    preferredDate: string;
    preferredTime: string;
    notes?: string;
  }, userId: string): Promise<Booking> {
    const { data: existingSession, error: searchError } = await supabase
      .from('group_sessions')
      .select('*')
      .eq('subject', bookingData.subject)
      .eq('preferred_date', bookingData.preferredDate)
      .eq('preferred_time', bookingData.preferredTime)
      .eq('session_type', bookingData.sessionType)
      .in('status', ['forming', 'ready'])
      .lt('current_count', 40)
      .maybeSingle();

    if (searchError) throw searchError;

    let groupSessionId: string;

    if (existingSession) {
      groupSessionId = existingSession.id;
    } else {
      const { data: newSession, error: createError } = await supabase
        .from('group_sessions')
        .insert({
          subject: bookingData.subject,
          session_type: bookingData.sessionType,
          preferred_date: bookingData.preferredDate,
          preferred_time: bookingData.preferredTime,
          status: 'forming',
          min_students: 3,
          max_students: 40,
          current_count: 0,
        })
        .select()
        .single();

      if (createError) throw createError;
      groupSessionId = newSession.id;
    }

    const { error: participantError } = await supabase
      .from('group_session_participants')
      .insert({
        group_session_id: groupSessionId,
        student_id: userId,
        notes: bookingData.notes,
      });

    if (participantError) {
      if (participantError.code === '23505') {
        throw new Error('You have already joined this group session');
      }
      throw participantError;
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        student_id: userId,
        subject: bookingData.subject,
        session_type: bookingData.sessionType,
        class_type: 'group',
        preferred_date: bookingData.preferredDate,
        preferred_time: bookingData.preferredTime,
        notes: bookingData.notes,
        group_session_id: groupSessionId,
        status: 'pending',
      })
      .select(`
        *,
        student:profiles!student_id(name, email, phone_number),
        tutor:profiles!tutor_id(name, email)
      `)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      studentId: data.student_id,
      studentName: data.student?.name || '',
      studentEmail: data.student?.email || '',
      studentPhone: data.student?.phone_number || '',
      tutorId: data.tutor_id,
      tutorName: data.tutor?.name,
      subject: data.subject,
      sessionType: data.session_type,
      classType: 'group',
      preferredDate: data.preferred_date,
      preferredTime: data.preferred_time,
      status: data.status,
      notes: data.notes,
      groupSessionId: data.group_session_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async getAllGroupSessions(): Promise<GroupSession[]> {
    const { data, error } = await supabase
      .from('group_sessions')
      .select(`
        *,
        tutor:profiles!tutor_id(name),
        group_session_tutors(
          id,
          tutor_id,
          assignment_order,
          assigned_at,
          tutor:profiles!tutor_id(name)
        ),
        group_session_participants(
          id,
          student_id,
          notes,
          joined_at,
          created_at,
          updated_at,
          student:profiles!student_id(name, email)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(session => ({
      id: session.id,
      subject: session.subject,
      serviceId: session.service_id,
      sessionType: session.session_type,
      preferredDate: session.preferred_date,
      preferredTime: session.preferred_time,
      status: session.status,
      tutorId: session.tutor_id,
      tutorName: session.tutor?.name,
      tutors: (session.group_session_tutors || []).map((gst: any) => ({
        id: gst.id,
        tutorId: gst.tutor_id,
        tutorName: gst.tutor?.name || '',
        assignmentOrder: gst.assignment_order,
        assignedAt: gst.assigned_at,
      })),
      minStudents: session.min_students,
      maxStudents: session.max_students,
      currentCount: session.current_count,
      participants: (session.group_session_participants || []).map((p: any) => ({
        id: p.id,
        groupSessionId: session.id,
        studentId: p.student_id,
        studentName: p.student?.name || '',
        studentEmail: p.student?.email || '',
        notes: p.notes,
        joinedAt: p.joined_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      meetingLink: session.meeting_link,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  },

  async getMyGroupSessions(userId: string): Promise<GroupSession[]> {
    const { data, error } = await supabase
      .from('group_sessions')
      .select(`
        *,
        tutor:profiles!tutor_id(name),
        group_session_tutors(
          id,
          tutor_id,
          assignment_order,
          assigned_at,
          tutor:profiles!tutor_id(name)
        ),
        group_session_participants!inner(
          id,
          student_id,
          notes,
          joined_at,
          created_at,
          updated_at,
          student:profiles!student_id(name, email)
        )
      `)
      .eq('group_session_participants.student_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(session => ({
      id: session.id,
      subject: session.subject,
      serviceId: session.service_id,
      sessionType: session.session_type,
      preferredDate: session.preferred_date,
      preferredTime: session.preferred_time,
      status: session.status,
      tutorId: session.tutor_id,
      tutorName: session.tutor?.name,
      tutors: (session.group_session_tutors || []).map((gst: any) => ({
        id: gst.id,
        tutorId: gst.tutor_id,
        tutorName: gst.tutor?.name || '',
        assignmentOrder: gst.assignment_order,
        assignedAt: gst.assigned_at,
      })),
      minStudents: session.min_students,
      maxStudents: session.max_students,
      currentCount: session.current_count,
      participants: (session.group_session_participants || []).map((p: any) => ({
        id: p.id,
        groupSessionId: session.id,
        studentId: p.student_id,
        studentName: p.student?.name || '',
        studentEmail: p.student?.email || '',
        notes: p.notes,
        joinedAt: p.joined_at,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      meetingLink: session.meeting_link,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    }));
  },

  async updateGroupSessionStatus(
    groupSessionId: string,
    status: string,
    tutorId?: string
  ): Promise<void> {
    const updates: any = { status };
    if (tutorId) {
      updates.tutor_id = tutorId;
    }

    const { error } = await supabase
      .from('group_sessions')
      .update(updates)
      .eq('id', groupSessionId);

    if (error) throw error;
  },

  async updateStatus(bookingId: string, status: string, tutorId?: string): Promise<void> {
    const updates: any = { status };
    if (tutorId) {
      updates.tutor_id = tutorId;
    }

    const { error } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId);

    if (error) throw error;
  },

  async deleteBooking(bookingId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId);

    if (error) throw error;
  },

  async deleteGroupSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('group_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) throw error;
  },

  async updateMeetingLink(bookingId: string, meetingLink: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ meeting_link: meetingLink })
      .eq('id', bookingId);

    if (error) throw error;
  },

  async updateGroupSessionMeetingLink(sessionId: string, meetingLink: string): Promise<void> {
    const { error } = await supabase
      .from('group_sessions')
      .update({ meeting_link: meetingLink })
      .eq('id', sessionId);

    if (error) throw error;
  },
};
