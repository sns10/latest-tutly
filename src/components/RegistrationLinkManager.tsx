import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Link, QrCode, Check, ExternalLink, Share2, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface RegistrationLinkManagerProps {
  tuitionId: string;
}

export function RegistrationLinkManager({ tuitionId }: RegistrationLinkManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [tuitionName, setTuitionName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSlug = async () => {
      if (!tuitionId) return;

      const { data, error } = await supabase
        .from("tuitions")
        .select("slug, name")
        .eq("id", tuitionId)
        .single();

      if (!error && data) {
        setSlug(data.slug);
        setTuitionName(data.name);
      }
      setLoading(false);
    };

    if (isOpen) {
      fetchSlug();
    }
  }, [tuitionId, isOpen]);

  const registrationUrl = slug
    ? `${window.location.origin}/register/${slug}`
    : `${window.location.origin}/register/${tuitionId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Student Registration",
          text: "Register as a student using this link:",
          url: registrationUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const openPreview = () => {
    window.open(registrationUrl, "_blank");
  };

  const downloadQRCode = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    // Create a canvas element
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    // Set canvas size (larger for better quality)
    canvas.width = 512;
    canvas.height = 512;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const link = document.createElement("a");
        link.download = `registration-qr-${slug || tuitionId}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("QR code downloaded!");
      }
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  const printQRCode = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print");
      return;
    }

    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Registration QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 8px;
            }
            p {
              color: #666;
              margin-bottom: 24px;
            }
            .qr-container {
              display: inline-block;
              padding: 20px;
              background: white;
              border: 2px solid #e5e7eb;
              border-radius: 12px;
            }
            .url {
              margin-top: 16px;
              font-size: 12px;
              color: #888;
              word-break: break-all;
              max-width: 300px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${tuitionName}</h1>
            <p>Scan to register as a student</p>
            <div class="qr-container">
              ${svgData}
            </div>
            <div class="url">${registrationUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Link className="h-4 w-4" />
          Registration Link
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Student Registration Link
          </DialogTitle>
          <DialogDescription>
            Share this link or QR code with parents for easy student registration.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="gap-2">
              <Link className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="qr" className="gap-2">
              <QrCode className="h-4 w-4" />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="space-y-4 mt-4">
            {/* Registration URL */}
            <div className="space-y-2">
              <Label>Registration URL</Label>
              <div className="flex gap-2">
                <Input
                  value={registrationUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={shareLink} className="gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" onClick={openPreview} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Preview Form
              </Button>
            </div>

            {/* Info Card */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How it works</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Share this link via WhatsApp, SMS, or email.</p>
                <p>2. Parents fill in student details including DOB and contact info.</p>
                <p>3. Students are automatically added to your roster.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 mt-4">
            {/* QR Code Display */}
            <div className="flex flex-col items-center space-y-4">
              <div 
                ref={qrRef}
                className="p-6 bg-white rounded-xl border-2 border-muted shadow-sm"
              >
                <QRCodeSVG
                  value={registrationUrl}
                  size={200}
                  level="H"
                  includeMargin={false}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code to open the registration form
              </p>

              {/* QR Action Buttons */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={downloadQRCode} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" onClick={printQRCode} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            </div>

            {/* Tips Card */}
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Tips for using QR code</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Print and display at your tuition center entrance</p>
                <p>• Add to brochures, flyers, and visiting cards</p>
                <p>• Share in WhatsApp groups as an image</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
