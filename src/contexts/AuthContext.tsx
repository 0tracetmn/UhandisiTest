import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  parentName?: string;
  parentContact?: string;
  parentPhone?: string;
  grade?: string;
  school?: string;
  province?: string;
  feePayer?: 'student' | 'parent';
  transcriptFile?: File;
  qualificationsFile?: File;
  idCopyFile?: File;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          try {
            await loadUserProfile(session.user.id);
          } catch (error) {
            console.error('Error loading user profile:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      })();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string, retries = 3): Promise<void> => {
    for (let i = 0; i < retries; i++) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile query error:', error);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(`Failed to load profile: ${error.message}`);
      }

      if (profile) {
        const { data: authUser } = await supabase.auth.getUser();
        setUser({
          id: profile.id,
          email: authUser.user?.email || profile.id,
          name: profile.name,
          role: profile.role as UserRole,
          phoneNumber: profile.phone_number,
          profileImage: profile.profile_image_url,
          createdAt: profile.created_at,
        });
        return;
      }

      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error('Profile not found after retries');
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (data.user) {
      await loadUserProfile(data.user.id);
    }
  };

  const register = async (registerData: RegisterData) => {
    const { data, error } = await supabase.auth.signUp({
      email: registerData.email,
      password: registerData.password,
      options: {
        data: {
          name: registerData.name,
          role: registerData.role,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        name: registerData.name,
        role: registerData.role,
        phone_number: registerData.phoneNumber || null,
      })
      .eq('id', data.user.id);

    if (updateError) {
      console.error('Profile update error:', updateError);
    }

    if (registerData.role === 'student') {
      const { error: studentError } = await supabase
        .from('student_details')
        .insert({
          user_id: data.user.id,
          grade: registerData.grade || null,
          parent_name: registerData.parentName || null,
          parent_contact: registerData.parentContact || null,
          parent_phone: registerData.parentPhone || null,
          school: registerData.school || null,
          province: registerData.province || null,
          fee_payer: registerData.feePayer || 'student',
        });

      if (studentError && studentError.code !== '23505') {
        console.error('Student details error:', studentError);
      }
    } else if (registerData.role === 'tutor') {
      let transcriptUrl = null;
      let qualificationsUrl = null;
      let idCopyUrl = null;

      if (registerData.transcriptFile) {
        const fileExt = registerData.transcriptFile.name.split('.').pop();
        const fileName = `${data.user.id}-transcript.${fileExt}`;
        const filePath = `qualifications/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, registerData.transcriptFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error('Transcript upload error:', uploadError);
          throw new Error('Failed to upload transcript');
        }

        const { data: urlData } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        transcriptUrl = urlData.publicUrl;
      }

      if (registerData.qualificationsFile) {
        const fileExt = registerData.qualificationsFile.name.split('.').pop();
        const fileName = `${data.user.id}-qualifications.${fileExt}`;
        const filePath = `qualifications/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, registerData.qualificationsFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error('Qualifications upload error:', uploadError);
          throw new Error('Failed to upload qualifications');
        }

        const { data: urlData } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        qualificationsUrl = urlData.publicUrl;
      }

      if (registerData.idCopyFile) {
        const fileExt = registerData.idCopyFile.name.split('.').pop();
        const fileName = `${data.user.id}-id-copy.${fileExt}`;
        const filePath = `qualifications/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, registerData.idCopyFile, {
            upsert: true,
          });

        if (uploadError) {
          console.error('ID copy upload error:', uploadError);
          throw new Error('Failed to upload ID copy');
        }

        const { data: urlData } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);

        idCopyUrl = urlData.publicUrl;
      }

      const { error: tutorError } = await supabase
        .from('tutor_details')
        .insert({
          user_id: data.user.id,
          transcript_url: transcriptUrl,
          qualifications_url: qualificationsUrl,
          id_copy_url: idCopyUrl,
        });

      if (tutorError && tutorError.code !== '23505') {
        console.error('Tutor details error:', tutorError);
      }
    }

    if (data.session) {
      await loadUserProfile(data.user.id);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const hasRole = (role: UserRole) => {
    return user?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
