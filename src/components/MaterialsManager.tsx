import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  class: string;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  material_type: string;
  created_at: string;
  subject_id: string;
  class: string;
}

interface MaterialsManagerProps {
  currentClass: string;
}

export default function MaterialsManager({ currentClass }: MaterialsManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [materialType, setMaterialType] = useState<'notes' | 'pyq'>('notes');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
    fetchMaterials();
  }, [currentClass]);

  const fetchSubjects = async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('class', currentClass)
      .order('name');

    if (error) {
      toast.error('Failed to load subjects');
    } else {
      setSubjects(data || []);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('academic_materials')
      .select('*')
      .eq('class', currentClass)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load materials');
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  const handleFileUpload = async () => {
    if (!file || !selectedSubject || !title) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUploading(true);

    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentClass}/${selectedSubject}/${materialType}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('academic-materials')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('academic-materials')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('academic_materials')
        .insert({
          class: currentClass,
          subject_id: selectedSubject,
          material_type: materialType,
          title,
          description,
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');

      setTitle('');
      setDescription('');
      setFile(null);
      fetchMaterials();
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId: string, fileUrl: string) => {
    try {
      const fileName = fileUrl.split('/').slice(-4).join('/');
      
      await supabase.storage
        .from('academic-materials')
        .remove([fileName]);

      const { error } = await supabase
        .from('academic_materials')
        .delete()
        .eq('id', materialId);

      if (error) throw error;

      toast.success('File deleted successfully');

      fetchMaterials();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
    }
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Materials</CardTitle>
          <CardDescription>Upload notes or PYQs for {currentClass} class</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Material Type</Label>
              <Select value={materialType} onValueChange={(v: 'notes' | 'pyq') => setMaterialType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="pyq">PYQ (Previous Year Questions)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chapter 5 - Algebra"
            />
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the material"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>File</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.ppt,.pptx"
            />
          </div>

          <Button
            onClick={handleFileUpload}
            disabled={uploading || !file || !selectedSubject || !title}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Uploading...' : 'Upload Material'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded Materials</CardTitle>
          <CardDescription>Manage materials for {currentClass} class</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading materials...</p>
          ) : materials.length === 0 ? (
            <p className="text-muted-foreground">No materials uploaded yet</p>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{material.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getSubjectName(material.subject_id)} • {material.material_type === 'notes' ? 'Notes' : 'PYQ'}
                        {material.description && ` • ${material.description}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {material.file_name} • {(material.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(material.file_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(material.id, material.file_url)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
