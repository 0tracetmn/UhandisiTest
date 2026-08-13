import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Mail,
  Phone,
  GraduationCap,
  MapPin,
  User,
  X,
  AlertCircle,
  RefreshCw,
  Pencil,
  Save,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  grade: string | null;
  school: string | null;
  province: string | null;
  parentName: string | null;
  parentSurname: string | null;
  parentContact: string | null;
  parentPhone: string | null;
  feePayer: string | null;
  createdAt: string;
}

const REQUIRED_FIELDS: (keyof Student)[] = [
  'grade',
  'school',
  'province',
  'parentName',
  'parentSurname',
  'parentPhone',
];

const isIncomplete = (s: Student) => REQUIRED_FIELDS.some((f) => !s[f]);

const GRADE_OPTIONS = [
  { value: '', label: 'Select grade' },
  { value: 'Grade 8', label: 'Grade 8' },
  { value: 'Grade 9', label: 'Grade 9' },
  { value: 'Grade 10', label: 'Grade 10' },
  { value: 'Grade 11', label: 'Grade 11' },
  { value: 'Grade 12', label: 'Grade 12' },
  { value: 'NQF 5', label: 'NQF Level 5' },
  { value: 'NQF 6', label: 'NQF Level 6' },
  { value: 'NQF 7', label: 'NQF Level 7' },
];

const FEE_PAYER_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent/Guardian' },
];

interface EditableFields {
  grade: string;
  school: string;
  province: string;
  parentName: string;
  parentSurname: string;
  parentContact: string;
  parentPhone: string;
  feePayer: string;
}

const emptyForm: EditableFields = {
  grade: '',
  school: '',
  province: '',
  parentName: '',
  parentSurname: '',
  parentContact: '',
  parentPhone: '',
  feePayer: 'student',
};

const Field: React.FC<{ label: string; value: string | null; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div>
    <span className="text-sm text-slate-600">{label}:</span>
    <p
      className={`font-medium ${value ? 'text-slate-900' : 'text-slate-400 italic'} ${
        mono ? 'font-mono text-xs' : ''
      }`}
    >
      {value || 'Not provided'}
    </p>
  </div>
);

export const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditableFields>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: studentDetailsData, error: detailsError } = await supabase
        .from('student_details')
        .select(
          'id, user_id, grade, school, province, parent_name, parent_surname, parent_contact, parent_phone, fee_payer, created_at'
        )
        .order('created_at', { ascending: false });

      if (detailsError) throw new Error(detailsError.message);
      if (!studentDetailsData) throw new Error('No data returned from student_details');

      const userIds = studentDetailsData.map((sd: { user_id: string }) => sd.user_id);

      const profileMap = new Map<
        string,
        { name: string; email: string; phone_number: string | null }
      >();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email, phone_number')
          .in('id', userIds);

        if (profilesError) throw new Error(profilesError.message);

        if (profilesData) {
          for (const profile of profilesData) {
            profileMap.set(profile.id, {
              name: profile.name,
              email: profile.email,
              phone_number: profile.phone_number,
            });
          }
        }
      }

      const formattedStudents: Student[] = studentDetailsData.map((sd: any) => {
        const profile = profileMap.get(sd.user_id);
        return {
          id: sd.id,
          userId: sd.user_id,
          name: profile?.name || 'Unknown',
          email: profile?.email || 'No email',
          phoneNumber: profile?.phone_number || null,
          grade: sd.grade || null,
          school: sd.school || null,
          province: sd.province || null,
          parentName: sd.parent_name || null,
          parentSurname: sd.parent_surname || null,
          parentContact: sd.parent_contact || null,
          parentPhone: sd.parent_phone || null,
          feePayer: sd.fee_payer || null,
          createdAt: sd.created_at,
        };
      });

      setStudents(formattedStudents);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load students';
      console.error('Failed to fetch students:', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openMailClient = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const beginEdit = (s: Student) => {
    setForm({
      grade: s.grade || '',
      school: s.school || '',
      province: s.province || '',
      parentName: s.parentName || '',
      parentSurname: s.parentSurname || '',
      parentContact: s.parentContact || '',
      parentPhone: s.parentPhone || '',
      feePayer: s.feePayer || 'student',
    });
    setSaveError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError(null);
  };

  const closeModal = () => {
    setSelectedStudent(null);
    setEditing(false);
    setSaveError(null);
  };

  const saveEdit = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error: updateError } = await supabase
        .from('student_details')
        .update({
          grade: form.grade || null,
          school: form.school || null,
          province: form.province || null,
          parent_name: form.parentName || null,
          parent_surname: form.parentSurname || null,
          parent_contact: form.parentContact || null,
          parent_phone: form.parentPhone || null,
          fee_payer: form.feePayer || 'student',
        })
        .eq('id', selectedStudent.id);

      if (updateError) throw new Error(updateError.message);

      const updated: Student = {
        ...selectedStudent,
        grade: form.grade || null,
        school: form.school || null,
        province: form.province || null,
        parentName: form.parentName || null,
        parentSurname: form.parentSurname || null,
        parentContact: form.parentContact || null,
        parentPhone: form.parentPhone || null,
        feePayer: form.feePayer || null,
      };
      setStudents((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedStudent(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
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
          <h1 className="text-3xl font-bold text-slate-900">Student Management</h1>
          <p className="text-slate-600 mt-1">View and manage all students</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-600">Total Students</p>
            <p className="text-2xl font-bold text-slate-900">{students.length}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <GraduationCap className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {error ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <p className="text-slate-900 font-medium text-lg">Failed to load students</p>
              <p className="text-slate-600 text-sm mt-1 mb-4">{error}</p>
              <Button onClick={fetchStudents} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : students.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-900 font-medium text-lg">No students found</p>
              <p className="text-slate-600 text-sm mt-1">Students will appear here once they register</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-slate-900">All Students</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {students.map((student) => {
                const incomplete = isIncomplete(student);
                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-lg">{student.name}</p>
                        {student.grade && <Badge variant="info">{student.grade}</Badge>}
                        {student.school && <Badge variant="neutral">{student.school}</Badge>}
                        {incomplete && (
                          <Badge variant="warning">
                            <AlertCircle className="w-3 h-3 mr-1 inline" />
                            Details incomplete
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          <span>{student.email}</span>
                        </div>
                        {student.phoneNumber && (
                          <div className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            <span>{student.phoneNumber}</span>
                          </div>
                        )}
                        {student.province && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{student.province}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Registered: {new Date(student.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStudent(student);
                          setEditing(false);
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={!!selectedStudent}
        onClose={closeModal}
        title={editing ? 'Edit Student Details' : 'Student Details'}
        size="lg"
      >
        {selectedStudent && !editing && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-lg">Student Information</h3>
                {isIncomplete(selectedStudent) && (
                  <Badge variant="warning">
                    <AlertCircle className="w-3 h-3 mr-1 inline" />
                    Incomplete
                  </Badge>
                )}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Full Name" value={selectedStudent.name} />
                <div>
                  <span className="text-sm text-slate-600">Email Address:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-slate-900 truncate">{selectedStudent.email}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMailClient(selectedStudent.email)}
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Field label="Phone Number" value={selectedStudent.phoneNumber} />
                <Field label="Grade" value={selectedStudent.grade} />
                <Field label="School" value={selectedStudent.school} />
                <Field label="Province" value={selectedStudent.province} />
                <div>
                  <span className="text-sm text-slate-600">Fee Payer:</span>
                  <p
                    className={`font-medium capitalize ${
                      selectedStudent.feePayer ? 'text-slate-900' : 'text-slate-400 italic'
                    }`}
                  >
                    {selectedStudent.feePayer || 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Registration Date:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedStudent.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Parent/Guardian Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Parent/Guardian Name" value={selectedStudent.parentName} />
                <Field label="Parent/Guardian Surname" value={selectedStudent.parentSurname} />
                <div>
                  <span className="text-sm text-slate-600">Parent/Guardian Email:</span>
                  {selectedStudent.parentContact ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="font-medium text-slate-900 truncate">
                        {selectedStudent.parentContact}
                      </p>
                      {selectedStudent.parentContact.includes('@') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMailClient(selectedStudent.parentContact!)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-slate-400 italic">Not provided</p>
                  )}
                </div>
                <Field label="Parent/Guardian Contact Number" value={selectedStudent.parentPhone} />
              </div>
            </div>

            <div className="bg-slate-100 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-mono">User ID: {selectedStudent.userId}</p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button className="flex-1" onClick={() => beginEdit(selectedStudent)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
              <Button className="flex-1" variant="outline" onClick={closeModal}>
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}

        {selectedStudent && editing && (
          <div className="space-y-6">
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {saveError}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 text-lg mb-4">Student Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Select
                  label="Grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  options={GRADE_OPTIONS}
                />
                <Input
                  label="School"
                  value={form.school}
                  onChange={(e) => setForm({ ...form, school: e.target.value })}
                  placeholder="School name"
                />
                <Input
                  label="Province"
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  placeholder="e.g., Gauteng"
                />
                <Select
                  label="Fee Payer"
                  value={form.feePayer}
                  onChange={(e) => setForm({ ...form, feePayer: e.target.value })}
                  options={FEE_PAYER_OPTIONS}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Parent/Guardian Information
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Parent/Guardian Name"
                  value={form.parentName}
                  onChange={(e) => setForm({ ...form, parentName: e.target.value })}
                  placeholder="First name(s)"
                />
                <Input
                  label="Parent/Guardian Surname"
                  value={form.parentSurname}
                  onChange={(e) => setForm({ ...form, parentSurname: e.target.value })}
                  placeholder="Last name"
                />
                <Input
                  label="Parent/Guardian Email"
                  type="email"
                  value={form.parentContact}
                  onChange={(e) => setForm({ ...form, parentContact: e.target.value })}
                  placeholder="Optional"
                />
                <Input
                  label="Parent/Guardian Contact Number"
                  type="tel"
                  value={form.parentPhone}
                  onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                  placeholder="+27 XX XXX XXXX"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button className="flex-1" onClick={saveEdit} isLoading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={cancelEdit}
                disabled={saving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
