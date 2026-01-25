import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { FileUpload } from '../components/ui/FileUpload';
import { UserRole } from '../types';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phoneNumber: '',
    role: 'student' as UserRole,
    parentName: '',
    parentContact: '',
    parentPhone: '',
    grade: '',
    school: '',
    province: '',
    feePayer: 'student' as 'student' | 'parent',
  });
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [qualificationsFile, setQualificationsFile] = useState<File | null>(null);
  const [idCopyFile, setIdCopyFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.role === 'student') {
      if (!formData.phoneNumber) {
        setError('Phone number is required for students');
        return;
      }
      if (!formData.parentName) {
        setError('Parent/Guardian name is required for students');
        return;
      }
      if (!formData.parentPhone) {
        setError('Parent/Guardian contact number is required for students');
        return;
      }
      if (!formData.school) {
        setError('School name is required for students');
        return;
      }
      if (!formData.province) {
        setError('Province is required for students');
        return;
      }
      if (!formData.grade) {
        setError('Grade is required for students');
        return;
      }
    }

    if (formData.role === 'tutor') {
      if (!transcriptFile) {
        setError('Please upload your transcript');
        return;
      }
      if (!qualificationsFile) {
        setError('Please upload your qualifications');
        return;
      }
      if (!idCopyFile) {
        setError('Please upload your ID copy');
        return;
      }
    }

    setIsLoading(true);

    try {
      const registerData: any = {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        phoneNumber: formData.phoneNumber || undefined,
      };

      if (formData.role === 'student') {
        registerData.parentName = formData.parentName;
        registerData.parentContact = formData.parentContact || undefined;
        registerData.parentPhone = formData.parentPhone;
        registerData.grade = formData.grade || undefined;
        registerData.school = formData.school;
        registerData.province = formData.province;
        registerData.feePayer = formData.feePayer;
      } else if (formData.role === 'tutor') {
        registerData.transcriptFile = transcriptFile;
        registerData.qualificationsFile = qualificationsFile;
        registerData.idCopyFile = idCopyFile;
      }

      await register(registerData);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <img
            src="/63c6bf0a-3055-4ef7-9344-7ee7e8b608c7.jpg"
            alt="Uhandisi Tutors"
            className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
          <p className="text-slate-600 mt-2">Join Uhandisi Tutors today</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Select
              label="I am a"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              options={[
                { value: 'student', label: 'Student' },
                { value: 'tutor', label: 'Tutor' },
              ]}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Full Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 6 characters"
                required
              />

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                required
              />
            </div>

            <Input
              label="Phone Number"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+27 XX XXX XXXX"
              required={formData.role === 'student'}
            />

            {formData.role === 'student' && (
              <>
                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Student Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Select
                      label="Grade"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      options={[
                        { value: '', label: 'Select your grade' },
                        { value: 'Grade 8', label: 'Grade 8' },
                        { value: 'Grade 9', label: 'Grade 9' },
                        { value: 'Grade 10', label: 'Grade 10' },
                        { value: 'Grade 11', label: 'Grade 11' },
                        { value: 'Grade 12', label: 'Grade 12' },
                        { value: 'NQF 5', label: 'NQF Level 5' },
                        { value: 'NQF 6', label: 'NQF Level 6' },
                        { value: 'NQF 7', label: 'NQF Level 7' },
                      ]}
                      required
                    />

                    <Input
                      label="School Name"
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      placeholder="Name of your school"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <Input
                      label="Province"
                      type="text"
                      value={formData.province}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                      placeholder="e.g., Gauteng, Western Cape"
                      required
                    />

                    <Input
                      label="Parent/Guardian Name"
                      type="text"
                      value={formData.parentName}
                      onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                      placeholder="Full name"
                      required
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <Input
                      label="Parent/Guardian Contact Number"
                      type="tel"
                      value={formData.parentPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, parentPhone: e.target.value })
                      }
                      placeholder="+27 XX XXX XXXX"
                      required
                    />

                    <Input
                      label="Parent/Guardian Email"
                      type="email"
                      value={formData.parentContact}
                      onChange={(e) =>
                        setFormData({ ...formData, parentContact: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Who will be paying the fees?
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="feePayer"
                          value="student"
                          checked={formData.feePayer === 'student'}
                          onChange={(e) => setFormData({ ...formData, feePayer: e.target.value as 'student' | 'parent' })}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-slate-700 group-hover:text-slate-900">
                          Myself (Student)
                        </span>
                      </label>
                      <label className="flex items-center cursor-pointer group">
                        <input
                          type="radio"
                          name="feePayer"
                          value="parent"
                          checked={formData.feePayer === 'parent'}
                          onChange={(e) => setFormData({ ...formData, feePayer: e.target.value as 'student' | 'parent' })}
                          className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-slate-700 group-hover:text-slate-900">
                          Parent/Guardian
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {formData.role === 'tutor' && (
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Tutor Documents (All Required)
                </h3>
                <div className="space-y-6">
                  <FileUpload
                    label="Upload Transcript"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    maxSize={10 * 1024 * 1024}
                    onFileSelect={(file) => setTranscriptFile(file)}
                    helperText="Upload your academic transcript. Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)"
                  />

                  <FileUpload
                    label="Upload Qualifications"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    maxSize={10 * 1024 * 1024}
                    onFileSelect={(file) => setQualificationsFile(file)}
                    helperText="Upload your certificates, degrees, or other proof of qualifications. Accepted formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)"
                  />

                  <FileUpload
                    label="Upload Copy of ID"
                    accept=".pdf,.jpg,.jpeg,.png"
                    maxSize={10 * 1024 * 1024}
                    onFileSelect={(file) => setIdCopyFile(file)}
                    helperText="Upload a clear copy of your ID document. Accepted formats: PDF, JPG, PNG (Max 10MB)"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-slate-600 hover:text-slate-900">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
