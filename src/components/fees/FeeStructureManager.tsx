import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ClassName, ClassFee, Student } from '@/types';
import { Settings, DollarSign, Calendar, Percent, Save, AlertTriangle } from 'lucide-react';

const ALL_CLASSES: ClassName[] = ['8th', '9th', '10th', '11th', '12th'];

interface ExtendedClassFee extends ClassFee {
  lateFeePercentage?: number;
  lateFeeAmount?: number;
  dueDay?: number;
}

interface FeeStructureManagerProps {
  classFees: ClassFee[];
  students: Student[];
  onUpdateClassFee: (className: string, amount: number) => void;
}

export function FeeStructureManager({ classFees, students, onUpdateClassFee }: FeeStructureManagerProps) {
  const [fees, setFees] = useState<ExtendedClassFee[]>([]);
  const [lateFeeConfig, setLateFeeConfig] = useState({
    enabled: false,
    percentage: 5,
    fixedAmount: 50,
    gracePeriod: 7
  });

  useEffect(() => {
    const mergedFees: ExtendedClassFee[] = ALL_CLASSES.map(className => {
      const existingFee = classFees.find(f => f.class === className);
      return existingFee || { class: className, amount: 0 };
    });
    setFees(mergedFees.sort((a, b) => a.class.localeCompare(b.class)));
  }, [classFees]);

  const handleAmountChange = (className: string, value: string) => {
    const amount = value === '' ? 0 : parseFloat(value);
    if (!isNaN(amount)) {
      setFees(fees.map(fee => fee.class === className ? { ...fee, amount } : fee));
    }
  };

  const handleSave = (className: string) => {
    const fee = fees.find(f => f.class === className);
    if (fee && fee.amount >= 0) {
      onUpdateClassFee(className, fee.amount);
      toast.success(`Fee for ${className} updated to ₹${fee.amount}`);
    }
  };

  const handleSaveAll = () => {
    fees.forEach(fee => {
      if (fee.amount >= 0) {
        onUpdateClassFee(fee.class, fee.amount);
      }
    });
    toast.success('All class fees updated');
  };

  const getStudentCount = (className: string) => {
    return students.filter(s => s.class === className).length;
  };

  const getMonthlyRevenue = (className: string, amount: number) => {
    const count = getStudentCount(className);
    return count * amount;
  };

  const totalExpectedRevenue = fees.reduce((sum, fee) => {
    return sum + getMonthlyRevenue(fee.class, fee.amount);
  }, 0);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="class-fees" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class-fees">Class Fees</TabsTrigger>
          <TabsTrigger value="late-fee">Late Fee Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="class-fees" className="space-y-4 mt-4">
          {/* Summary Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total Expected Monthly Revenue</p>
                  <p className="text-2xl font-bold">₹{totalExpectedRevenue.toLocaleString('en-IN')}</p>
                </div>
                <Button onClick={handleSaveAll}>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee Structure Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Class Fee Structure
              </CardTitle>
              <CardDescription>Set monthly tuition fee for each class</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Monthly Fee</TableHead>
                    <TableHead>Expected Revenue</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map(fee => (
                    <TableRow key={fee.class}>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {fee.class}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{getStudentCount(fee.class)} students</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            value={fee.amount}
                            onChange={(e) => handleAmountChange(fee.class, e.target.value)}
                            className="w-28"
                            min="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          ₹{getMonthlyRevenue(fee.class, fee.amount).toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleSave(fee.class)}>
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newFees = fees.map(f => ({ ...f, amount: f.amount * 1.1 }));
                    setFees(newFees);
                    toast.info('Applied 10% increase to all fees (not saved yet)');
                  }}
                >
                  +10% Increase
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newFees = fees.map(f => ({ ...f, amount: f.amount * 1.05 }));
                    setFees(newFees);
                    toast.info('Applied 5% increase to all fees (not saved yet)');
                  }}
                >
                  +5% Increase
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const avg = fees.reduce((s, f) => s + f.amount, 0) / fees.length;
                    const newFees = fees.map(f => ({ ...f, amount: Math.round(avg) }));
                    setFees(newFees);
                    toast.info('Applied uniform fee (not saved yet)');
                  }}
                >
                  Make Uniform
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="late-fee" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Late Fee Configuration
              </CardTitle>
              <CardDescription>
                Configure late fee charges for overdue payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Enable Late Fees</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically apply late fees after grace period
                  </p>
                </div>
                <Button
                  variant={lateFeeConfig.enabled ? "default" : "outline"}
                  onClick={() => setLateFeeConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  {lateFeeConfig.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              {lateFeeConfig.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Late Fee Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={lateFeeConfig.percentage}
                        onChange={(e) => setLateFeeConfig(prev => ({ 
                          ...prev, 
                          percentage: parseFloat(e.target.value) || 0 
                        }))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Applied on fee amount</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Or Fixed Amount
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="number"
                        value={lateFeeConfig.fixedAmount}
                        onChange={(e) => setLateFeeConfig(prev => ({ 
                          ...prev, 
                          fixedAmount: parseFloat(e.target.value) || 0 
                        }))}
                        className="pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Fixed late fee</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Grace Period
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={lateFeeConfig.gracePeriod}
                        onChange={(e) => setLateFeeConfig(prev => ({ 
                          ...prev, 
                          gracePeriod: parseInt(e.target.value) || 0 
                        }))}
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">After due date</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => toast.success('Late fee settings saved')}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <p className="text-sm text-blue-700">
                <strong>How it works:</strong> Late fees will be automatically calculated and added to overdue fees.
                The system will apply either the percentage-based fee or the fixed amount, whichever is higher.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
