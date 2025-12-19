import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ALL_FEATURES, FeatureKey, FeatureTier } from '@/hooks/useTuitionFeatures';

interface EditTuitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tuition: any;
  onSuccess: () => void;
}

export function EditTuitionDialog({ open, onOpenChange, tuition, onSuccess }: EditTuitionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
    is_active: true,
    subscription_status: 'active',
  });
  const [enabledFeatures, setEnabledFeatures] = useState<FeatureKey[]>(ALL_FEATURES.map(f => f.key));

  useEffect(() => {
    if (tuition) {
      setFormData({
        name: tuition.name || '',
        email: tuition.email || '',
        phone: tuition.phone || '',
        address: tuition.address || '',
        logo_url: tuition.logo_url || '',
        is_active: tuition.is_active ?? true,
        subscription_status: tuition.subscription_status || 'active',
      });
      // Load features
      if (tuition.features && Array.isArray(tuition.features) && tuition.features.length > 0) {
        setEnabledFeatures(tuition.features as FeatureKey[]);
      } else {
        setEnabledFeatures(ALL_FEATURES.map(f => f.key));
      }
    }
  }, [tuition]);

  const toggleFeature = (key: FeatureKey) => {
    setEnabledFeatures(prev => 
      prev.includes(key) 
        ? prev.filter(f => f !== key) 
        : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tuitions')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          logo_url: formData.logo_url || null,
          is_active: formData.is_active,
          subscription_status: formData.subscription_status,
          features: enabledFeatures,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tuition.id);

      if (error) throw error;

      toast.success('Tuition updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating tuition:', error);
      toast.error(error.message || 'Failed to update tuition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tuition Center</DialogTitle>
          <DialogDescription>
            Update tuition center details and subscription status.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tuition Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Enter a URL to your tuition center's logo image</p>
          </div>

          <div className="space-y-2">
            <Label>Subscription Status</Label>
            <Select
              value={formData.subscription_status}
              onValueChange={(value) => setFormData({ ...formData, subscription_status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="is_active">Active Status</Label>
              <p className="text-xs text-muted-foreground">Enable or disable this tuition center</p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <Separator />

          {/* Feature Toggles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Feature Access</Label>
                <p className="text-xs text-muted-foreground">
                  {enabledFeatures.length}/{ALL_FEATURES.length} features enabled
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEnabledFeatures(ALL_FEATURES.map(f => f.key))}
                >
                  Enable All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEnabledFeatures([])}
                >
                  Disable All
                </Button>
              </div>
            </div>
            <ScrollArea className="h-[280px] border rounded-md p-3">
              <div className="space-y-4">
                {(['core', 'standard', 'premium'] as FeatureTier[]).map((tier) => {
                  const tierFeatures = ALL_FEATURES.filter(f => f.tier === tier);
                  const tierColors = {
                    core: 'bg-green-100 text-green-800',
                    standard: 'bg-blue-100 text-blue-800',
                    premium: 'bg-purple-100 text-purple-800',
                  };
                  return (
                    <div key={tier} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={tierColors[tier]}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {tierFeatures.length} features
                        </span>
                      </div>
                      <div className="space-y-2 pl-2">
                        {tierFeatures.map((feature) => (
                          <div key={feature.key} className="flex items-center justify-between py-1">
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={feature.key} className="text-sm font-normal cursor-pointer">
                                {feature.label}
                              </Label>
                              {feature.description && (
                                <p className="text-xs text-muted-foreground truncate">{feature.description}</p>
                              )}
                            </div>
                            <Switch
                              id={feature.key}
                              checked={enabledFeatures.includes(feature.key)}
                              onCheckedChange={() => toggleFeature(feature.key)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
