import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, Lock, Eye, FileText, Mail } from 'lucide-react';

export function PrivacyPolicy() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Privacy Policy</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Last updated: December 2024
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <Eye className="h-5 w-5 text-primary" />
                  Information We Collect
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We collect information you provide directly to us, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Account information (name, email, password)</li>
                  <li>Student information (name, class, division, contact details)</li>
                  <li>Academic data (attendance, test scores, fees)</li>
                  <li>Usage data (how you interact with our platform)</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <Lock className="h-5 w-5 text-primary" />
                  How We Protect Your Data
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>End-to-end encryption for sensitive data</li>
                  <li>Secure SSL/TLS connections</li>
                  <li>Regular security audits and updates</li>
                  <li>Role-based access control (RBAC)</li>
                  <li>Automated data backups</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                  How We Use Your Information
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  We use the information we collect to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Generate reports and analytics for your tuition center</li>
                  <li>Respond to your comments and questions</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">Data Retention</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We retain your data for as long as your account is active or as needed to provide 
                  you services. You can request deletion of your data at any time by contacting us.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">Your Rights</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You have the right to:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data in a portable format</li>
                  <li>Withdraw consent at any time</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <Mail className="h-5 w-5 text-primary" />
                  Contact Us
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about this Privacy Policy, please contact us at:
                </p>
                <p className="mt-2 text-muted-foreground">
                  Email: support@tutly.app
                </p>
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
