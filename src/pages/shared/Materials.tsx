import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { materialsService } from '../../services/materials.service';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { FileUpload } from '../../components/ui/FileUpload';
import { Badge } from '../../components/ui/Badge';
import { FileText, Video, Image, Download, Plus, Search, Eye, X, Maximize2, Minimize2 } from 'lucide-react';
import { Material, MaterialType } from '../../types';

interface TutoringService {
  id: string;
  name: string;
  description: string;
}

export const Materials: React.FC = () => {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([]);
  const [tutoringServices, setTutoringServices] = useState<TutoringService[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerContainerRef = React.useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'note' as MaterialType,
    subject: '',
    grade: '',
  });

  useEffect(() => {
    fetchMaterials();
    fetchTutoringServices();
  }, []);

  useEffect(() => {
    let filtered = materials;

    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (m.subject && m.subject.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter((m) => m.type === typeFilter);
    }

    if (subjectFilter !== 'all') {
      filtered = filtered.filter((m) => m.subject === subjectFilter);
    }

    if (gradeFilter !== 'all') {
      filtered = filtered.filter((m) => m.grade === gradeFilter);
    }

    setFilteredMaterials(filtered);
  }, [searchTerm, typeFilter, subjectFilter, gradeFilter, materials]);

  const fetchMaterials = async () => {
    try {
      let data: Material[];
      if (user?.role === 'student') {
        data = await materialsService.getForStudent(user.id);
      } else {
        data = await materialsService.getAll();
      }
      setMaterials(data);
      setFilteredMaterials(data);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTutoringServices = async () => {
    try {
      const services = await materialsService.getTutoringServices();
      setTutoringServices(services);
    } catch (error) {
      console.error('Failed to fetch tutoring services:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      await materialsService.upload(selectedFile, {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        subject: formData.subject || undefined,
        grade: formData.grade || undefined,
      });

      setIsModalOpen(false);
      await fetchMaterials();
      setFormData({
        title: '',
        description: '',
        type: 'note',
        subject: '',
        grade: '',
      });
      setSelectedFile(null);
    } catch (error) {
      console.error('Failed to upload material:', error);
      alert('Failed to upload material. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (material: Material) => {
    setLoadingUrl(true);
    setSelectedMaterial(material);
    setViewerModalOpen(true);
    try {
      console.log('Fetching public URL for:', material.fileUrl);
      const publicUrl = await materialsService.getSignedUrl(material.fileUrl, false);
      console.log('Public URL received:', publicUrl);

      if (material.type === 'note') {
        console.log('Fetching file as blob for:', material.type);
        const response = await fetch(publicUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        console.log('Blob created:', blob.type, blob.size);
        const blobUrl = URL.createObjectURL(blob);
        setViewerUrl(blobUrl);
      } else {
        setViewerUrl(publicUrl);
      }
    } catch (error: any) {
      console.error('Failed to load material:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Failed to load material: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`);
      setViewerModalOpen(false);
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleDownload = async (material: Material) => {
    try {
      const signedUrl = await materialsService.getSignedUrl(material.fileUrl, true);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = material.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download material:', error);
      alert('Failed to download material. Please try again.');
    }
  };

  const toggleFullscreen = async () => {
    if (!viewerContainerRef.current) return;

    try {
      if (!isFullscreen) {
        await viewerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  };

  const closeViewer = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    if (viewerUrl && viewerUrl.startsWith('blob:')) {
      URL.revokeObjectURL(viewerUrl);
    }
    setViewerModalOpen(false);
    setSelectedMaterial(null);
    setViewerUrl('');
    setIsFullscreen(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const getTypeIcon = (type: MaterialType) => {
    const icons = {
      note: <FileText className="w-6 h-6 text-blue-600" />,
      diagram: <Image className="w-6 h-6 text-green-600" />,
      video: <Video className="w-6 h-6 text-red-600" />,
    };
    return icons[type];
  };

  const getTypeBadge = (type: MaterialType) => {
    const variants: Record<MaterialType, 'primary' | 'success' | 'danger'> = {
      note: 'primary',
      diagram: 'success',
      video: 'danger',
    };
    return <Badge variant={variants[type]}>{type}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
          <h1 className="text-3xl font-bold text-slate-900">Learning Materials</h1>
          <p className="text-slate-600 mt-1">Access notes, diagrams, and video lessons</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'tutor') && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Upload Material
          </Button>
        )}
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search materials..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'note', label: 'Notes' },
                  { value: 'diagram', label: 'Diagrams' },
                  { value: 'video', label: 'Videos' },
                ]}
                className="md:w-48"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Subjects' },
                  ...tutoringServices.map(service => ({
                    value: service.name,
                    label: service.name,
                  })),
                ]}
                className="w-full"
              />
              <Select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Grades' },
                  { value: 'Grade 8', label: 'Grade 8' },
                  { value: 'Grade 9', label: 'Grade 9' },
                  { value: 'Grade 10', label: 'Grade 10' },
                  { value: 'Grade 11', label: 'Grade 11' },
                  { value: 'Grade 12', label: 'Grade 12' },
                  { value: 'NQF 5', label: 'NQF Level 5' },
                  { value: 'NQF 6', label: 'NQF Level 6' },
                  { value: 'NQF 7', label: 'NQF Level 7' },
                ]}
                className="w-full"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {filteredMaterials.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No materials found</h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || typeFilter !== 'all' || subjectFilter !== 'all' || gradeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No learning materials available yet'}
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <Card key={material.id} hover>
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">{getTypeIcon(material.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900 truncate">{material.title}</h3>
                      {getTypeBadge(material.type)}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {material.description}
                    </p>
                    <div className="space-y-1 text-xs text-slate-500 mb-3">
                      {material.subject && <p>Subject: {material.subject}</p>}
                      {material.grade && <p>Grade: {material.grade}</p>}
                      <p>Size: {formatFileSize(material.fileSize)}</p>
                      <p>Uploaded by: {material.uploaderName}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleView(material)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      {user?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(material)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={viewerModalOpen}
        onClose={closeViewer}
        title={selectedMaterial?.title || 'View Material'}
        size="xl"
      >
        <div ref={viewerContainerRef} className={`space-y-4 ${isFullscreen ? 'bg-black p-4' : ''}`}>
          <div className="flex justify-end mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={toggleFullscreen}
              className="flex items-center gap-2"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  Fullscreen
                </>
              )}
            </Button>
          </div>
          {loadingUrl ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {selectedMaterial?.type === 'video' ? (
                <video
                  src={viewerUrl}
                  controls
                  controlsList="nodownload"
                  className="w-full rounded-lg bg-black"
                  style={{ maxHeight: isFullscreen ? '100vh' : '70vh' }}
                  onContextMenu={(e) => e.preventDefault()}
                  onError={(e) => {
                    const video = e.target as HTMLVideoElement;
                    console.error('Video loading error:', {
                      error: video.error,
                      code: video.error?.code,
                      message: video.error?.message,
                      src: viewerUrl
                    });
                  }}
                  onLoadedMetadata={() => console.log('Video metadata loaded successfully')}
                >
                  <source src={viewerUrl} type="video/mp4" />
                  <source src={viewerUrl} type="video/webm" />
                  Your browser does not support the video tag.
                </video>
              ) : selectedMaterial?.type === 'diagram' ? (
                <img
                  src={viewerUrl}
                  alt={selectedMaterial.title}
                  className="w-full rounded-lg"
                  style={{ maxHeight: isFullscreen ? '100vh' : '70vh', objectFit: 'contain' }}
                  onContextMenu={(e) => e.preventDefault()}
                />
              ) : (
                <object
                  data={`${viewerUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  type="application/pdf"
                  className="w-full rounded-lg border border-slate-200"
                  style={{ height: isFullscreen ? '95vh' : '70vh' }}
                  title={selectedMaterial?.title}
                >
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <FileText className="w-16 h-16 text-slate-300 mb-4" />
                    <p className="text-slate-600 mb-4">Unable to display PDF in browser</p>
                    {user?.role === 'admin' && (
                      <Button onClick={() => selectedMaterial && handleDownload(selectedMaterial)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </object>
              )}
              {!isFullscreen && (
                <div className="text-sm text-slate-600">
                  <p className="font-medium">{selectedMaterial?.description}</p>
                  {selectedMaterial?.subject && (
                    <p className="mt-2">Subject: {selectedMaterial.subject}</p>
                  )}
                  {selectedMaterial?.grade && (
                    <p>Grade: {selectedMaterial.grade}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Upload Learning Material"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Newton's Laws Notes"
            required
          />

          <Input
            label="Description"
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the material"
            required
          />

          <Select
            label="Material Type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as MaterialType })}
            options={[
              { value: 'note', label: 'Notes' },
              { value: 'diagram', label: 'Diagram' },
              { value: 'video', label: 'Video' },
            ]}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              options={[
                { value: '', label: 'Select a subject' },
                ...tutoringServices.map(service => ({
                  value: service.name,
                  label: service.name,
                })),
              ]}
              required
            />

            <Select
              label="Grade"
              value={formData.grade}
              onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
              options={[
                { value: '', label: 'Select a grade' },
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
          </div>

          <FileUpload
            label="Upload File"
            onFileSelect={setSelectedFile}
            accept={
              formData.type === 'video'
                ? 'video/mp4,video/webm'
                : formData.type === 'diagram'
                ? 'image/*'
                : '.pdf,.doc,.docx'
            }
            maxSize={formData.type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024}
            helperText={
              formData.type === 'video'
                ? 'Max 100MB. Use H.264 codec for best browser compatibility (avoid HEVC/H.265)'
                : 'Max 10MB for documents'
            }
          />

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedFile || uploading || !formData.subject || !formData.grade}
            >
              {uploading ? 'Uploading...' : 'Upload Material'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
