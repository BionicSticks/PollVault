"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { AGE_RANGES, GENDERS } from "@/lib/supabase/types";

interface DemographicPromptProps {
  ageRange: string;
  gender: string;
  country: string;
  onAgeRangeChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onCountryChange: (value: string) => void;
}

export function DemographicPrompt({
  ageRange,
  gender,
  country,
  onAgeRangeChange,
  onGenderChange,
  onCountryChange,
}: DemographicPromptProps) {
  return (
    <div className="space-y-4 p-4 rounded-xl glass border-white/5">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">
          Optional: Help improve statistics
        </p>
        <p className="text-xs text-muted-foreground">
          This data is never stored individually — only aggregate tallies are
          kept. Your identity is never linked to these answers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Age Range</Label>
          <Select value={ageRange} onValueChange={onAgeRangeChange}>
            <SelectTrigger className="bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Skip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Prefer not to say</SelectItem>
              {AGE_RANGES.map((range) => (
                <SelectItem key={range} value={range}>
                  {range}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Gender</Label>
          <Select value={gender} onValueChange={onGenderChange}>
            <SelectTrigger className="bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Skip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Prefer not to say</SelectItem>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>
                  {g.charAt(0).toUpperCase() + g.slice(1).replace("-", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <Select value={country} onValueChange={onCountryChange}>
            <SelectTrigger className="bg-white/5 border-white/10 text-sm">
              <SelectValue placeholder="Skip" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="skip">Prefer not to say</SelectItem>
              <SelectItem value="US">United States</SelectItem>
              <SelectItem value="GB">United Kingdom</SelectItem>
              <SelectItem value="IE">Ireland</SelectItem>
              <SelectItem value="CA">Canada</SelectItem>
              <SelectItem value="AU">Australia</SelectItem>
              <SelectItem value="DE">Germany</SelectItem>
              <SelectItem value="FR">France</SelectItem>
              <SelectItem value="IN">India</SelectItem>
              <SelectItem value="BR">Brazil</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
