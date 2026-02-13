"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function CreateOrganisationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed to create organisation");
      setLoading(false);
      return;
    }

    toast.success("Organisation created!");
    router.push(`/organisations/${data.organisation.slug}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-strong border-white/10">
          <CardHeader>
            <CardTitle className="text-2xl gradient-text">
              Create an Organisation
            </CardTitle>
            <CardDescription>
              Set up an institutional account for your team or company.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Organisation Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Research Lab"
                  required
                  minLength={2}
                  className="bg-white/5 border-white/10 text-lg"
                />
                {slug && (
                  <p className="text-xs text-muted-foreground">
                    URL: /organisations/{slug}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does your organisation do?"
                  className="bg-white/5 border-white/10"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || name.trim().length < 2}
                className="w-full bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0 hover:opacity-90 h-12 text-lg"
              >
                {loading ? "Creating..." : "Create Organisation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
