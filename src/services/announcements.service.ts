import { supabase } from '../lib/supabase';
import { Announcement } from '../types';

export const announcementsService = {
  async getAll(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        *,
        author:profiles!author_id(name)
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      authorId: announcement.author_id,
      authorName: announcement.author?.name || '',
      targetRoles: announcement.target_roles || [],
      targetGrades: announcement.target_grades || [],
      isPublished: announcement.is_published,
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
    }));
  },

  async getForCurrentUser(): Promise<Announcement[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    let query = supabase
      .from('announcements')
      .select(`
        *,
        author:profiles!author_id(name)
      `)
      .eq('is_published', true);

    if (profile.role === 'student') {
      const { data: studentDetails } = await supabase
        .from('student_details')
        .select('grade')
        .eq('user_id', user.id)
        .single();

      const studentGrade = studentDetails?.grade;

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      const filtered = (data || []).filter(announcement => {
        const targetRoles = announcement.target_roles || [];
        const targetGrades = announcement.target_grades || [];

        const roleMatches = targetRoles.length === 0 || targetRoles.includes('student');
        if (!roleMatches) return false;

        const gradeMatches = targetGrades.length === 0 || (studentGrade && targetGrades.includes(studentGrade));
        return gradeMatches;
      });

      return filtered.map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        authorId: announcement.author_id,
        authorName: announcement.author?.name || '',
        targetRoles: announcement.target_roles || [],
        targetGrades: announcement.target_grades || [],
        isPublished: announcement.is_published,
        createdAt: announcement.created_at,
        updatedAt: announcement.updated_at,
      }));
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map(announcement => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      authorId: announcement.author_id,
      authorName: announcement.author?.name || '',
      targetRoles: announcement.target_roles || [],
      targetGrades: announcement.target_grades || [],
      isPublished: announcement.is_published,
      createdAt: announcement.created_at,
      updatedAt: announcement.updated_at,
    }));
  },

  async create(announcementData: {
    title: string;
    content: string;
    targetRoles: string[];
    targetGrades: string[];
    isPublished: boolean;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('announcements')
      .insert({
        author_id: user.id,
        title: announcementData.title,
        content: announcementData.content,
        target_roles: announcementData.targetRoles,
        target_grades: announcementData.targetGrades,
        is_published: announcementData.isPublished,
      });

    if (error) throw error;
  },

  async delete(announcementId: string): Promise<void> {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);

    if (error) throw error;
  },

  async markAsRead(announcementId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('announcement_reads')
      .insert({
        announcement_id: announcementId,
        user_id: user.id,
      });

    if (error && error.code !== '23505') {
      throw error;
    }
  },

  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'student') return 0;

    const { data: studentDetails } = await supabase
      .from('student_details')
      .select('grade')
      .eq('user_id', user.id)
      .single();

    const studentGrade = studentDetails?.grade;

    const { data: announcements } = await supabase
      .from('announcements')
      .select('id, target_roles, target_grades')
      .eq('is_published', true);

    if (!announcements) return 0;

    const relevantAnnouncements = announcements.filter(announcement => {
      const targetRoles = announcement.target_roles || [];
      const targetGrades = announcement.target_grades || [];

      const roleMatches = targetRoles.length === 0 || targetRoles.includes('student');
      if (!roleMatches) return false;

      const gradeMatches = targetGrades.length === 0 || (studentGrade && targetGrades.includes(studentGrade));
      return gradeMatches;
    });

    const announcementIds = relevantAnnouncements.map(a => a.id);

    if (announcementIds.length === 0) return 0;

    const { data: reads } = await supabase
      .from('announcement_reads')
      .select('announcement_id')
      .eq('user_id', user.id)
      .in('announcement_id', announcementIds);

    const readIds = new Set((reads || []).map(r => r.announcement_id));
    const unreadCount = announcementIds.filter(id => !readIds.has(id)).length;

    return unreadCount;
  },
};
