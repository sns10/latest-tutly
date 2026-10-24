import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useWhatsAppAutomation, WhatsAppItem, WhatsAppTemplate } from '@/hooks/useWhatsAppAutomation';

interface AutoSendButtonProps {
  template: WhatsAppTemplate;
  items: WhatsAppItem[];
  label: string;
  className?: string;
  size?: 'sm' | 'default';
  onDone?: () => void;
}

/** Sends approved WhatsApp templates directly to parents. Renders nothing if the center isn't enabled. */
export function AutoSendButton({ template, items, label, className, size = 'default', onDone }: AutoSendButtonProps) {
  const { enabled, send } = useWhatsAppAutomation();
  if (!enabled) return null;

  const handleClick = async () => {
    if (items.length === 0) {
      toast.error('No students to send to');
      return;
    }
    if (items.length > 1 && !window.confirm(`Send WhatsApp messages to ${items.length} parents now?`)) return;
    try {
      const r = await send.mutateAsync({ template, messages: items });
      if (r.sent > 0) toast.success(`Sent to ${r.sent} parent${r.sent === 1 ? '' : 's'}`);
      if (r.failed > 0) {
        const firstErr = r.results.find((x) => !x.ok)?.error;
        toast.error(`${r.failed} not sent${firstErr ? `: ${firstErr}` : ''}`);
      }
      onDone?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send WhatsApp messages');
    }
  };

  return (
    <Button onClick={handleClick} disabled={send.isPending} size={size} variant="outline" className={className}>
      {send.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
      {send.isPending ? 'Sending…' : label}
    </Button>
  );
}
