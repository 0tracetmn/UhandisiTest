import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { announcementsService } from '../../services/announcements.service';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { Bell, Plus, Trash2 } from 'lucide-react';
import { Announcement } from '../../types';

const GRADE_OPTIONS = [
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'NQF 5',
  'NQF 6',
  'NQF 7',
];

export const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRoles: [] as string[],
    targetGrades: [] as string[],
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = user?.role === 'student'
        ? await announcementsService.getForCurrentUser()
        : await announcementsService.getAll();
      setAnnouncements(data);

      if (user?.role === 'student') {
        data.forEach(announcement => {
          announcementsService.markAsRead(announcement.id).catch(console.error);
        });
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await announcementsService.create({
        ...formData,
        isPublished: true,
      });

      setIsModalOpen(false);
      fetchAnnouncements();
      setFormData({
        title: '',
        content: '',
        targetRoles: [],
        targetGrades: [],
      });
    } catch (error) {
      console.error('Failed to create announcement:', error);
      alert('Failed to create announcement. Please try again.');
    }
  };

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await announcementsService.delete(announcementId);
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      alert('Failed to delete announcement. Please try again.');
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
          <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-600 mt-1">Stay updated with the latest news</p>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No announcements yet</h3>
            <p className="text-slate-600">Check back later for updates</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} hover>
              <CardBody>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-xl font-semibold text-slate-900">
                        {announcement.title}
                      </h3>
                      <Badge variant="info">
                        {announcement.targetRoles.length > 0
                          ? announcement.targetRoles.join(', ')
                          : 'All Roles'}
                      </Badge>
                      {announcement.targetGrades.length > 0 && (
                        <Badge variant="success">
                          {announcement.targetGrades.join(', ')}
                        </Badge>
                      )}
                      {announcement.targetGrades.length === 0 && announcement.targetRoles.includes('student') && (
                        <Badge variant="success">
                          All Grades
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-700 mb-4 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Posted by {announcement.authorName}</span>
                      <span>•</span>
                      <span>{new Date(announcement.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(announcement.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Announcement"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Announcement title"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Announcement content..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-32"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Target Roles
            </label>
            <div className="space-y-2">
              {['admin', 'tutor', 'student'].map((role) => (
                <label key={role} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.targetRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          targetRoles: [...formData.targetRoles, role],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          targetRoles: formData.targetRoles.filter((r) => r !== role),
                        });
                      }
                    }}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-700 capitalize">{role}s</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Leave unchecked to target all roles
            </p>
          </div>

          {formData.targetRoles.includes('student') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target Grades (for Students)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GRADE_OPTIONS.map((grade) => (
                  <label key={grade} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.targetGrades.includes(grade)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            targetGrades: [...formData.targetGrades, grade],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            targetGrades: formData.targetGrades.filter((g) => g !== grade),
                          });
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{grade}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Leave unchecked to target all student grades
              </p>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Publish Announcement</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
