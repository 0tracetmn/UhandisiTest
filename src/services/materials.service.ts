import { supabase } from '../lib/supabase';
import { Material } from '../types';

export const materialsService = {
  async getTutoringServices(): Promise<Array<{ id: string; name: string; description: string }>> {
    const { data, error } = await supabase
      .from('tutoring_services')
      .select('id, name, description')
      .order('name');

    if (error) throw error;

    return data || [];
  },

  async getAll(): Promise<Material[]> {
    const { data, error } = await supabase
      .from('materials')
      .select(`
        *,
        uploader:profiles!uploaded_by(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(material => ({
      id: material.id,
      title: material.title,
      description: material.description || '',
      type: material.type,
      fileUrl: material.file_url,
      fileName: material.file_name,
      fileSize: material.file_size,
      uploadedBy: material.uploaded_by,
      uploaderName: material.uploader?.name || '',
      subject: material.subject,
      grade: material.grade,
      createdAt: material.created_at,
    }));
  },

  async getForStudent(studentId: string): Promise<Material[]> {
    const { data: studentDetails, error: studentError } = await supabase
      .from('student_details')
      .select('grade')
      .eq('user_id', studentId)
      .maybeSingle();

    if (studentError) throw studentError;

    const { data, error } = await supabase
      .from('materials')
      .select(`
        *,
        uploader:profiles!uploaded_by(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const allMaterials = (data || []).map(material => ({
      id: material.id,
      title: material.title,
      description: material.description || '',
      type: material.type,
      fileUrl: material.file_url,
      fileName: material.file_name,
      fileSize: material.file_size,
      uploadedBy: material.uploaded_by,
      uploaderName: material.uploader?.name || '',
      subject: material.subject,
      grade: material.grade,
      createdAt: material.created_at,
    }));

    if (!studentDetails || !studentDetails.grade) {
      return allMaterials;
    }

    const normalizeGrade = (grade: string | undefined | null): string => {
      if (!grade) return '';
      const gradeStr = grade.toLowerCase().trim();
      const match = gradeStr.match(/\d+/);
      return match ? match[0] : gradeStr;
    };

    const studentGradeNormalized = normalizeGrade(studentDetails.grade);

    return allMaterials.filter(material => {
      if (!material.grade) return true;
      const materialGradeNormalized = normalizeGrade(material.grade);
      return materialGradeNormalized === studentGradeNormalized;
    });
  },

  async upload(file: File, metadata: {
    title: string;
    description: string;
    type: 'note' | 'diagram' | 'video';
    subject?: string;
    grade?: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `materials/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('materials')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase
      .from('materials')
      .insert({
        uploaded_by: user.id,
        title: metadata.title,
        description: metadata.description,
        type: metadata.type,
        file_url: filePath,
        file_name: file.name,
        file_size: file.size,
        subject: metadata.subject || null,
        grade: metadata.grade || null,
      });

    if (dbError) throw dbError;
  },

  async getSignedUrl(filePath: string, download: boolean = false): Promise<string> {
    console.log('Getting URL for path:', filePath, 'download:', download);

    if (download) {
      // For downloads, use signed URL with download header
      const { data, error } = await supabase.storage
        .from('materials')
        .createSignedUrl(filePath, 3600, {
          download: true,
        });

      if (error) {
        console.error('Error creating signed download URL:', error);
        throw error;
      }

      console.log('Signed download URL created:', data.signedUrl);
      return data.signedUrl;
    } else {
      // For viewing, use public URL (bucket is public)
      const { data } = supabase.storage
        .from('materials')
        .getPublicUrl(filePath);

      console.log('Public URL for viewing:', data.publicUrl);
      return data.publicUrl;
    }
  },

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  },

  getMimeType(fileName: string): string {
    const ext = this.getFileExtension(fileName);
    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  },

  canDisplayInline(fileName: string): boolean {
    const ext = this.getFileExtension(fileName);
    return ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm'].includes(ext);
  },

  async delete(materialId: string): Promise<void> {
    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('file_url')
      .eq('id', materialId)
      .single();

    if (fetchError) throw fetchError;

    const filePath = material.file_url.split('/').slice(-2).join('/');

    const { error: deleteError } = await supabase.storage
      .from('materials')
      .remove([filePath]);

    if (deleteError) throw deleteError;

    const { error: dbError } = await supabase
      .from('materials')
      .delete()
      .eq('id', materialId);

    if (dbError) throw dbError;
  },
};
