import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, ImageIcon, Cake, Sparkles, Star } from 'lucide-react';
import { toast } from 'sonner';
import { BirthdayStudent } from '@/hooks/useBirthdayStudents';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface BirthdayCardGeneratorProps {
  student: BirthdayStudent | null;
  tuitionName: string;
  tuitionLogo?: string | null;
  onClose: () => void;
}

export function BirthdayCardGenerator({
  student,
  tuitionName,
  tuitionLogo,
  onClose,
}: BirthdayCardGeneratorProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = `birthday-card-${student?.name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Birthday card downloaded!');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to download card');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!cardRef.current) return;
    
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight);
      pdf.save(`birthday-card-${student?.name.replace(/\s+/g, '-')}.pdf`);
      
      toast.success('Birthday card PDF downloaded!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!cardRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Birthday Card - ${student?.name}</title>
            <style>
              body { margin: 0; padding: 20px; display: flex; justify-content: center; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            ${cardRef.current.outerHTML}
            <script>window.onload = function() { window.print(); window.close(); }</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!student) return null;

  return (
    <Dialog open={!!student} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-pink-500" />
            Birthday Card Generator
          </DialogTitle>
          <DialogDescription>
            Generate a printable birthday card with photo placeholder
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Birthday Card Preview */}
          <div 
            ref={cardRef}
            className="relative mx-auto w-full max-w-md aspect-[3/4] bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-500 rounded-2xl p-6 overflow-hidden shadow-2xl"
            style={{ fontFamily: 'system-ui, sans-serif' }}
          >
            {/* Decorative elements */}
            <div className="absolute top-4 left-4">
              <Sparkles className="h-8 w-8 text-yellow-300 animate-pulse" />
            </div>
            <div className="absolute top-4 right-4">
              <Star className="h-8 w-8 text-yellow-300 animate-pulse" />
            </div>
            <div className="absolute bottom-4 left-4">
              <Star className="h-6 w-6 text-yellow-300 opacity-70" />
            </div>
            <div className="absolute bottom-4 right-4">
              <Sparkles className="h-6 w-6 text-yellow-300 opacity-70" />
            </div>

            {/* Confetti dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: Math.random() * 10 + 5 + 'px',
                    height: Math.random() * 10 + 5 + 'px',
                    backgroundColor: ['#FFD700', '#FF69B4', '#00CED1', '#FF6347', '#9370DB'][i % 5],
                    top: Math.random() * 100 + '%',
                    left: Math.random() * 100 + '%',
                    opacity: 0.6,
                  }}
                />
              ))}
            </div>

            {/* Card Content */}
            <div className="relative z-10 h-full flex flex-col items-center justify-between text-white text-center">
              {/* Header */}
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Cake className="h-10 w-10 text-yellow-300" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight drop-shadow-lg">
                  Happy Birthday!
                </h1>
              </div>

              {/* Photo placeholder */}
              <div className="flex-1 flex items-center justify-center py-4">
                <div className="relative">
                  <div className="w-36 h-36 rounded-full bg-white/20 backdrop-blur border-4 border-white/50 flex items-center justify-center overflow-hidden shadow-xl">
                    {student.avatar ? (
                      <img 
                        src={student.avatar} 
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-2">
                        <ImageIcon className="h-10 w-10 mx-auto mb-1 text-white/70" />
                        <p className="text-xs text-white/70">Place Photo Here</p>
                      </div>
                    )}
                  </div>
                  {/* Decorative ring */}
                  <div className="absolute -inset-2 rounded-full border-2 border-dashed border-yellow-300/50 animate-spin" style={{ animationDuration: '20s' }} />
                </div>
              </div>

              {/* Student Info */}
              <div className="space-y-3 w-full">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 space-y-1">
                  <h2 className="text-xl font-bold drop-shadow">
                    {student.name}
                  </h2>
                  <p className="text-sm text-white/90">
                    Class {student.class}
                  </p>
                  {student.age && (
                    <p className="text-lg font-semibold text-yellow-200">
                      🎈 Turning {student.age} 🎈
                    </p>
                  )}
                </div>

                {/* Wishes */}
                <p className="text-sm italic text-white/90 px-2">
                  "May this special day bring you endless joy, happiness, and wonderful memories!"
                </p>

                {/* Tuition Branding */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  {tuitionLogo && (
                    <img 
                      src={tuitionLogo} 
                      alt={tuitionName}
                      className="h-6 w-6 rounded object-contain bg-white/20"
                    />
                  )}
                  <p className="text-xs font-medium text-white/80">
                    With love from {tuitionName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              onClick={handleDownloadImage}
              disabled={downloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Image
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Tip: If student has no photo, you can print the card and paste a physical photo in the placeholder area.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
