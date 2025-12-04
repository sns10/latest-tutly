import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, Image, FileText, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { toPng, toJpeg } from 'html-to-image';
import { useRef, forwardRef, useImperativeHandle, ReactNode } from 'react';

interface ImageExporterProps {
  children: ReactNode;
  filename: string;
  title?: string;
}

export interface ImageExporterRef {
  exportAsImage: (format: 'png' | 'jpeg') => Promise<void>;
}

export const ImageExporter = forwardRef<ImageExporterRef, ImageExporterProps>(
  ({ children, filename, title }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);

    const exportAsImage = async (format: 'png' | 'jpeg' = 'png') => {
      if (!contentRef.current) {
        toast.error('Nothing to export');
        return;
      }

      try {
        toast.loading('Generating image...');

        const exportFn = format === 'jpeg' ? toJpeg : toPng;
        const dataUrl = await exportFn(contentRef.current, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });

        const link = document.createElement('a');
        link.download = `${filename}-${new Date().toISOString().split('T')[0]}.${format}`;
        link.href = dataUrl;
        link.click();

        toast.dismiss();
        toast.success('Image downloaded successfully!');
      } catch (error) {
        console.error('Error exporting image:', error);
        toast.dismiss();
        toast.error('Failed to export image');
      }
    };

    useImperativeHandle(ref, () => ({
      exportAsImage,
    }));

    return (
      <div>
        <div ref={contentRef} className="bg-background">
          {title && (
            <div className="p-4 border-b mb-4 print:block hidden">
              <h2 className="text-xl font-bold">{title}</h2>
              <p className="text-sm text-muted-foreground">
                Generated on {new Date().toLocaleDateString()}
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }
);

ImageExporter.displayName = 'ImageExporter';

interface ExportButtonProps {
  onExportImage: (format: 'png' | 'jpeg') => void;
  label?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportButton({ onExportImage, label = 'Export', size = 'sm' }: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size}>
          <Download className="h-4 w-4 mr-2" />
          {label}
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onExportImage('png')}>
          <Image className="h-4 w-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onExportImage('jpeg')}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JPEG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
