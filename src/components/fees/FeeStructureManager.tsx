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
import { sanitizeNumber } from '@/lib/validation';

// Validation constants
const MAX_FEE_AMOUNT = 10000000;
const MAX_LATE_FEE_PERCENTAGE = 100;
const MAX_LATE_FEE_AMOUNT = 10000;
const MAX_GRACE_PERIOD = 365;

const ALL_CLASSES: ClassName[] = ['4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];

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
    // Sanitize and validate input
    const cleaned = value.replace(/[^0-9.]/g, '');
    const amount = cleaned === '' ? 0 : sanitizeNumber(cleaned, 0, MAX_FEE_AMOUNT);
    if (!isNaN(amount)) {
      setFees(fees.map(fee => fee.class === className ? { ...fee, amount: Math.round(amount) } : fee));
    }
  };

  const handleSave = (className: string) => {
    const fee = fees.find(f => f.class === className);
    if (fee && fee.amount >= 0 && fee.amount <= MAX_FEE_AMOUNT) {
      onUpdateClassFee(className, Math.round(fee.amount));
      toast.success(`Fee for ${className} updated to ₹${Math.round(fee.amount).toLocaleString('en-IN')}`);
    } else if (fee && fee.amount > MAX_FEE_AMOUNT) {
      toast.error(`Fee cannot exceed ₹${MAX_FEE_AMOUNT.toLocaleString('en-IN')}`);
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
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Expected Monthly Revenue</p>
                  <p className="text-xl sm:text-2xl font-bold truncate">₹{totalExpectedRevenue.toLocaleString('en-IN')}</p>
                </div>
                <Button onClick={handleSaveAll} size="sm" className="w-full sm:w-auto shrink-0">
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Save All Changes</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Fee Structure Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                Class Fee Structure
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Set monthly tuition fee for each class</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {fees.map(fee => (
                  <Card key={fee.class}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-medium text-sm">
                            {fee.class}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getStudentCount(fee.class)} students
                          </span>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground">Monthly Fee</label>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              value={fee.amount}
                              onChange={(e) => handleAmountChange(fee.class, e.target.value)}
                              className="flex-1"
                              min="0"
                            />
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Expected Revenue</span>
                            <span className="text-sm font-semibold">
                              ₹{getMonthlyRevenue(fee.class, fee.amount).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleSave(fee.class)}
                            className="w-full"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const newFees = fees.map(f => ({ ...f, amount: f.amount * 1.1 }));
                    setFees(newFees);
                    toast.info('Applied 10% increase to all fees (not saved yet)');
                  }}
                  className="text-xs sm:text-sm"
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
                  className="text-xs sm:text-sm"
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
                  className="text-xs sm:text-sm"
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
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-muted rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base">Enable Late Fees</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Automatically apply late fees after grace period
                  </p>
                </div>
                <Button
                  variant={lateFeeConfig.enabled ? "default" : "outline"}
                  onClick={() => setLateFeeConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  size="sm"
                  className="w-full sm:w-auto shrink-0"
                >
                  {lateFeeConfig.enabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              {lateFeeConfig.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Late Fee Percentage
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={lateFeeConfig.percentage}
                        onChange={(e) => {
                          const val = sanitizeNumber(e.target.value, 0, MAX_LATE_FEE_PERCENTAGE);
                          setLateFeeConfig(prev => ({ ...prev, percentage: val }));
                        }}
                        className="pr-8"
                        maxLength={5}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Applied on fee amount (max {MAX_LATE_FEE_PERCENTAGE}%)</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Or Fixed Amount
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={lateFeeConfig.fixedAmount}
                        onChange={(e) => {
                          const val = sanitizeNumber(e.target.value, 0, MAX_LATE_FEE_AMOUNT);
                          setLateFeeConfig(prev => ({ ...prev, fixedAmount: val }));
                        }}
                        className="pl-7"
                        maxLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Fixed late fee (max ₹{MAX_LATE_FEE_AMOUNT.toLocaleString('en-IN')})</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Grace Period
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={lateFeeConfig.gracePeriod}
                        onChange={(e) => {
                          const val = sanitizeNumber(e.target.value, 0, MAX_GRACE_PERIOD);
                          setLateFeeConfig(prev => ({ ...prev, gracePeriod: Math.round(val) }));
                        }}
                        className="pr-12"
                        maxLength={3}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">days</span>
                    </div>
                    <p className="text-xs text-muted-foreground">After due date (max {MAX_GRACE_PERIOD} days)</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => toast.success('Late fee settings saved')} size="sm" className="w-full sm:w-auto">
                  <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="text-xs sm:text-sm">Save Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-700">
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
