import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Users, Mail, Phone, GraduationCap, MapPin, User, X } from 'lucide-react';
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
  parentContact: string | null;
  parentPhone: string | null;
  feePayer: string | null;
  createdAt: string;
}

export const StudentsManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data: studentDetailsData } = await supabase
        .from('student_details')
        .select(`
          id,
          user_id,
          grade,
          school,
          province,
          parent_name,
          parent_contact,
          parent_phone,
          fee_payer,
          created_at,
          profiles!student_details_user_id_fkey(
            name,
            email,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      if (studentDetailsData) {
        const formattedStudents: Student[] = studentDetailsData.map((student: any) => ({
          id: student.id,
          userId: student.user_id,
          name: student.profiles?.name || 'Unknown',
          email: student.profiles?.email || 'No email',
          phoneNumber: student.profiles?.phone_number || null,
          grade: student.grade || null,
          school: student.school || null,
          province: student.province || null,
          parentName: student.parent_name || null,
          parentContact: student.parent_contact || null,
          parentPhone: student.parent_phone || null,
          feePayer: student.fee_payer || null,
          createdAt: student.created_at,
        }));
        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const openMailClient = (email: string) => {
    window.location.href = `mailto:${email}`;
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

      {students.length === 0 ? (
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
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-slate-900 text-lg">{student.name}</p>
                      {student.grade && (
                        <Badge variant="info">Grade {student.grade}</Badge>
                      )}
                      {student.school && (
                        <Badge variant="default">{student.school}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
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
                      onClick={() => setSelectedStudent(student)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Student Details"
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 text-lg mb-4">Student Information</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-slate-600">Full Name:</span>
                  <p className="font-medium text-slate-900">{selectedStudent.name}</p>
                </div>
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
                {selectedStudent.phoneNumber && (
                  <div>
                    <span className="text-sm text-slate-600">Phone Number:</span>
                    <p className="font-medium text-slate-900">{selectedStudent.phoneNumber}</p>
                  </div>
                )}
                {selectedStudent.grade && (
                  <div>
                    <span className="text-sm text-slate-600">Grade:</span>
                    <p className="font-medium text-slate-900">Grade {selectedStudent.grade}</p>
                  </div>
                )}
                {selectedStudent.school && (
                  <div>
                    <span className="text-sm text-slate-600">School:</span>
                    <p className="font-medium text-slate-900">{selectedStudent.school}</p>
                  </div>
                )}
                {selectedStudent.province && (
                  <div>
                    <span className="text-sm text-slate-600">Province:</span>
                    <p className="font-medium text-slate-900">{selectedStudent.province}</p>
                  </div>
                )}
                {selectedStudent.feePayer && (
                  <div>
                    <span className="text-sm text-slate-600">Fee Payer:</span>
                    <p className="font-medium text-slate-900 capitalize">{selectedStudent.feePayer}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-slate-600">Registration Date:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedStudent.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {(selectedStudent.parentName || selectedStudent.parentContact || selectedStudent.parentPhone) && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900 text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Parent/Guardian Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedStudent.parentName && (
                    <div>
                      <span className="text-sm text-slate-600">Name:</span>
                      <p className="font-medium text-slate-900">{selectedStudent.parentName}</p>
                    </div>
                  )}
                  {selectedStudent.parentContact && (
                    <div>
                      <span className="text-sm text-slate-600">Contact:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="font-medium text-slate-900">{selectedStudent.parentContact}</p>
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
                    </div>
                  )}
                  {selectedStudent.parentPhone && (
                    <div>
                      <span className="text-sm text-slate-600">Phone:</span>
                      <p className="font-medium text-slate-900">{selectedStudent.parentPhone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex gap-2">
                <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900">Quick Email Access</p>
                  <p className="text-sm text-green-700 mt-1">
                    Click the email buttons above to open your email client with the student or parent/guardian address pre-filled.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 p-3 rounded-lg">
              <p className="text-xs text-slate-600 font-mono">
                User ID: {selectedStudent.userId}
              </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setSelectedStudent(null)}
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
