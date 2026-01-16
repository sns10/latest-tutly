import { useState, useEffect } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Link, QrCode, Check, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";

interface RegistrationLinkManagerProps {
  tuitionId: string;
}

export function RegistrationLinkManager({ tuitionId }: RegistrationLinkManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchSlug = async () => {
      if (!tuitionId) return;

      const { data, error } = await supabase
        .from("tuitions")
        .select("slug")
        .eq("id", tuitionId)
        .single();

      if (!error && data) {
        setSlug(data.slug);
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
            Share this link with parents or students to register directly. No login required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
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
              <p>1. Share this link with parents or students via WhatsApp, SMS, or email.</p>
              <p>2. They fill in the student details including name, class, DOB, and contact info.</p>
              <p>3. The student is automatically added to your tuition center's roster.</p>
            </CardContent>
          </Card>

          {/* QR Code placeholder - can be enhanced later */}
          <div className="text-center">
            <Button variant="ghost" className="gap-2 text-muted-foreground" disabled>
              <QrCode className="h-4 w-4" />
              QR Code (Coming Soon)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
