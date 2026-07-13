"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveExamProfileAction } from "../actions";

export function OnboardingModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    targetExam: "CLAT UG",
    targetYear: "2026",
    currentClass: "12th Standard",
    targetNlu: "NLSIU Bangalore",
    weakestSection: "Legal Reasoning",
  });

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await saveExamProfileAction(formData);
      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }
      toast.success("Exam profile setup complete!");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to setup profile");
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(val) => {
        if (!val) {
          return;
        }
        setOpen(val);
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-bold text-2xl">
            Welcome to Juristo Law Prep OS
          </DialogTitle>
          <DialogDescription>
            Let's personalize your learning experience. Step {step} of 2.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          {step === 1 ? (
            <>
              <div className="space-y-2">
                <Label>Target Exam</Label>
                <Select
                  onValueChange={(val) => handleChange("targetExam", val)}
                  value={formData.targetExam}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLAT UG">
                      CLAT UG (Common Law Admission Test)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Year</Label>
                <Select
                  onValueChange={(val) => handleChange("targetYear", val)}
                  value={formData.targetYear}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2028">2028</SelectItem>
                    <SelectItem value="2029">2029</SelectItem>
                    <SelectItem value="2030">2030</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current Stage</Label>
                <Select
                  onValueChange={(val) => handleChange("currentClass", val)}
                  value={formData.currentClass}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11th Standard">11th Standard</SelectItem>
                    <SelectItem value="12th Standard">12th Standard</SelectItem>
                    <SelectItem value="Dropper">Dropper</SelectItem>
                    <SelectItem value="College Student">
                      College Student
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="mt-2 w-full" onClick={() => setStep(2)}>
                Next Step
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Dream NLU</Label>
                <Select
                  onValueChange={(val) => handleChange("targetNlu", val)}
                  value={formData.targetNlu}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NLSIU Bangalore">
                      NLSIU Bangalore
                    </SelectItem>
                    <SelectItem value="NALSAR Hyderabad">
                      NALSAR Hyderabad
                    </SelectItem>
                    <SelectItem value="NLIU Bhopal">NLIU Bhopal</SelectItem>
                    <SelectItem value="WBNUJS Kolkata">
                      WBNUJS Kolkata
                    </SelectItem>
                    <SelectItem value="NLU Jodhpur">NLU Jodhpur</SelectItem>
                    <SelectItem value="Other NLU">Other NLU</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Weakest Section (Where do you need the most help?)
                </Label>
                <Select
                  onValueChange={(val) => handleChange("weakestSection", val)}
                  value={formData.weakestSection}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Legal Reasoning">
                      Legal Reasoning
                    </SelectItem>
                    <SelectItem value="Logical Reasoning">
                      Logical Reasoning
                    </SelectItem>
                    <SelectItem value="English Language">
                      English Language
                    </SelectItem>
                    <SelectItem value="Current Affairs & GK">
                      Current Affairs & GK
                    </SelectItem>
                    <SelectItem value="Quantitative Techniques">
                      Quantitative Techniques
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 flex gap-3">
                <Button
                  className="w-1/3"
                  onClick={() => setStep(1)}
                  variant="outline"
                >
                  Back
                </Button>
                <Button
                  className="w-2/3 bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Start Preparation
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
