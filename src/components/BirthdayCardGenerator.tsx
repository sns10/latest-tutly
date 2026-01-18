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
            <div className="relative z-10 h-full flex flex-col items-center justify-between text-white text-center px-4">
              {/* Header */}
              <div className="space-y-1 pt-2">
                <Cake className="h-12 w-12 text-yellow-300 mx-auto" />
                <h1 className="text-3xl font-bold tracking-tight drop-shadow-lg">
                  Happy Birthday!
                </h1>
              </div>

              {/* Student Name - Large and Centered */}
              <div className="flex-1 flex flex-col items-center justify-center w-full">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-8 py-6 text-center">
                  <h2 className="text-4xl font-bold drop-shadow-lg tracking-wide mb-2">
                    {student.name}
                  </h2>
                  <p className="text-base text-white/90 mb-3">
                    Class {student.class}
                  </p>
                  {student.age && (
                    <p className="text-xl font-semibold text-yellow-200">
                      🎈 Turning {student.age} 🎈
                    </p>
                  )}
                </div>
              </div>

              {/* Wishes */}
              <div className="space-y-4 pb-2">
                <p className="text-sm italic text-white/90 px-4 leading-relaxed">
                  "May this special day bring you endless joy, happiness, and wonderful memories!"
                </p>

                {/* Tuition Branding */}
                <div className="flex items-center justify-center gap-2">
                  {tuitionLogo && (
                    <img 
                      src={tuitionLogo} 
                      alt={tuitionName}
                      className="h-8 w-8 rounded object-contain bg-white/20 p-1"
                    />
                  )}
                  <p className="text-sm font-medium text-white/90">
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
            Tip: Print or download the card to share with the student.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
