import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function TermsOfService() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Terms of Service</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            Last updated: December 2024
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="font-semibold text-lg mb-3">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using Upskillr Tutly ("the Service"), you accept and agree to be 
                  bound by the terms and provision of this agreement. If you do not agree to abide 
                  by the above, please do not use this service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">2. Description of Service</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Upskillr Tutly is a multi-tenant tuition management platform that provides:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Student and faculty management</li>
                  <li>Attendance tracking</li>
                  <li>Test and assessment management</li>
                  <li>Fee management</li>
                  <li>Timetable scheduling</li>
                  <li>Student portal access</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  3. Acceptable Use
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to use the Service only for lawful purposes. You are responsible for:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Maintaining the security of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring the accuracy of data you input</li>
                  <li>Complying with applicable laws and regulations</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <XCircle className="h-5 w-5 text-red-500" />
                  4. Prohibited Activities
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You may not:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                  <li>Use the Service for any illegal purpose</li>
                  <li>Attempt to gain unauthorized access to any part of the Service</li>
                  <li>Interfere with or disrupt the Service</li>
                  <li>Upload malicious code or content</li>
                  <li>Sell, resell, or exploit any portion of the Service</li>
                </ul>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">5. Data Ownership</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You retain ownership of all data you input into the Service. We will not access, 
                  use, or share your data except as necessary to provide the Service or as required 
                  by law. You may export or delete your data at any time.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">6. Service Availability</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We strive to maintain high availability but do not guarantee uninterrupted service. 
                  We may perform maintenance or updates that temporarily affect availability. We will 
                  provide advance notice when possible.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  7. Limitation of Liability
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  The Service is provided "as is" without warranties of any kind. We shall not be 
                  liable for any indirect, incidental, special, consequential, or punitive damages 
                  resulting from your use of or inability to use the Service.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">8. Termination</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We may terminate or suspend your access to the Service immediately, without prior 
                  notice, for conduct that we believe violates these Terms or is harmful to other 
                  users, us, or third parties, or for any other reason.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">9. Changes to Terms</h3>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to modify these terms at any time. We will notify users of 
                  any material changes via email or through the Service. Continued use of the 
                  Service after changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section>
                <h3 className="font-semibold text-lg mb-3">10. Contact Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  For questions about these Terms, please contact us at:
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
