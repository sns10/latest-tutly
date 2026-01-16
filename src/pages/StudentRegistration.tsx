import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { ClassName } from "@/types";
import { Loader2, CheckCircle, GraduationCap, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const classNames: ClassName[] = ["4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const genders = ["Male", "Female", "Other"];

// Validation schema
const registrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  studentClass: z.string().min(1, "Please select a class"),
  divisionId: z.string().optional(),
  rollNo: z.number().optional(),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  parentName: z.string().optional(),
  parentPhone: z.string().min(10, "Parent phone is required").max(15, "Invalid phone number"),
  address: z.string().optional(),
});

interface Division {
  id: string;
  name: string;
  class: string;
}

interface TuitionInfo {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
}

export default function StudentRegistration() {
  const { tuitionSlug } = useParams<{ tuitionSlug: string }>();
  const [tuition, setTuition] = useState<TuitionInfo | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    studentClass: "" as ClassName | "",
    divisionId: "",
    rollNo: "",
    dateOfBirth: "",
    gender: "",
    email: "",
    phone: "",
    parentName: "",
    parentPhone: "",
    address: "",
  });

  // Fetch tuition info by slug
  useEffect(() => {
    const fetchTuition = async () => {
      if (!tuitionSlug) {
        setError("Invalid registration link");
        setLoading(false);
        return;
      }

      try {
        // Try to fetch by slug first, then by ID
        let { data: tuitionData, error: tuitionError } = await supabase
          .from("tuitions")
          .select("id, name, logo_url, is_active")
          .eq("slug", tuitionSlug)
          .maybeSingle();

        // If not found by slug, try by ID (backward compatibility)
        if (!tuitionData) {
          const { data: byId, error: idError } = await supabase
            .from("tuitions")
            .select("id, name, logo_url, is_active")
            .eq("id", tuitionSlug)
            .maybeSingle();
          
          tuitionData = byId;
          tuitionError = idError;
        }

        if (tuitionError || !tuitionData) {
          setError("Tuition center not found. Please check the registration link.");
          setLoading(false);
          return;
        }

        if (!tuitionData.is_active) {
          setError("This tuition center is currently not accepting registrations.");
          setLoading(false);
          return;
        }

        setTuition(tuitionData);

        // Fetch divisions for this tuition
        const { data: divisionsData } = await supabase
          .from("divisions")
          .select("id, name, class")
          .eq("tuition_id", tuitionData.id);

        setDivisions(divisionsData || []);
      } catch (err) {
        console.error("Error fetching tuition:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTuition();
  }, [tuitionSlug]);

  // Filter divisions based on selected class
  const availableDivisions = divisions.filter(d => d.class === formData.studentClass);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Validate form data
    const result = registrationSchema.safeParse({
      ...formData,
      rollNo: formData.rollNo ? parseInt(formData.rollNo, 10) : undefined,
    });

    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    if (!tuition) return;

    setSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-student`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            tuitionId: tuition.id,
            name: formData.name.trim(),
            class: formData.studentClass,
            divisionId: formData.divisionId || null,
            rollNo: formData.rollNo ? parseInt(formData.rollNo, 10) : null,
            dateOfBirth: formData.dateOfBirth,
            gender: formData.gender || null,
            email: formData.email || null,
            phone: formData.phone || null,
            parentName: formData.parentName || null,
            parentPhone: formData.parentPhone,
            address: formData.address || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSubmitted(true);
      toast.success("Registration successful!");
    } catch (err) {
      console.error("Registration error:", err);
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Link to="/" className="block mt-4">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Registration Successful!</h2>
            <p className="text-muted-foreground">
              Thank you for registering with {tuition?.name}. The tuition center will contact you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          {tuition?.logo_url ? (
            <img
              src={tuition.logo_url}
              alt={tuition.name}
              className="h-20 w-20 object-contain mx-auto rounded-lg"
            />
          ) : (
            <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{tuition?.name}</h1>
            <p className="text-muted-foreground">Student Registration Form</p>
          </div>
        </div>

        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle>Student Details</CardTitle>
            <CardDescription>
              Please fill in the details below to register the student.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Student Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter student's full name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    className={validationErrors.name ? "border-destructive" : ""}
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive">{validationErrors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="class">Class *</Label>
                  <Select
                    value={formData.studentClass}
                    onValueChange={(value) => {
                      handleInputChange("studentClass", value);
                      handleInputChange("divisionId", ""); // Reset division
                    }}
                  >
                    <SelectTrigger className={validationErrors.studentClass ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classNames.map((c) => (
                        <SelectItem key={c} value={c}>{c} Class</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.studentClass && (
                    <p className="text-sm text-destructive">{validationErrors.studentClass}</p>
                  )}
                </div>

                {availableDivisions.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Select
                      value={formData.divisionId}
                      onValueChange={(value) => handleInputChange("divisionId", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDivisions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            Division {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="rollNo">Roll Number</Label>
                  <Input
                    id="rollNo"
                    type="number"
                    placeholder="Enter roll number (optional)"
                    value={formData.rollNo}
                    onChange={(e) => handleInputChange("rollNo", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    className={validationErrors.dateOfBirth ? "border-destructive" : ""}
                  />
                  {validationErrors.dateOfBirth && (
                    <p className="text-sm text-destructive">{validationErrors.dateOfBirth}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleInputChange("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genders.map((g) => (
                        <SelectItem key={g} value={g.toLowerCase()}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Details */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Student Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@email.com (optional)"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className={validationErrors.email ? "border-destructive" : ""}
                    />
                    {validationErrors.email && (
                      <p className="text-sm text-destructive">{validationErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Student Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Student phone (optional)"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Details */}
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Parent/Guardian Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parentName">Parent/Guardian Name</Label>
                    <Input
                      id="parentName"
                      placeholder="Parent's full name"
                      value={formData.parentName}
                      onChange={(e) => handleInputChange("parentName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">Parent Phone *</Label>
                    <Input
                      id="parentPhone"
                      type="tel"
                      placeholder="Parent's phone number"
                      value={formData.parentPhone}
                      onChange={(e) => handleInputChange("parentPhone", e.target.value)}
                      className={validationErrors.parentPhone ? "border-destructive" : ""}
                    />
                    {validationErrors.parentPhone && (
                      <p className="text-sm text-destructive">{validationErrors.parentPhone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-6">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter full address (optional)"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Student"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Powered by Tutly
        </p>
      </div>
    </div>
  );
}
