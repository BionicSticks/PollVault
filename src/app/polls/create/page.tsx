"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { Category, Organisation } from "@/lib/supabase/types";

interface SimilarPoll {
  id: string;
  title: string;
  similarity_score: number;
}

export default function CreatePollPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"single" | "multiple">("single");
  const [options, setOptions] = useState(["", ""]);
  const [requireVerified, setRequireVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState<string>("");
  const [orgId, setOrgId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [userOrgs, setUserOrgs] = useState<Organisation[]>([]);
  const [similarPolls, setSimilarPolls] = useState<SimilarPoll[]>([]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const duplicateTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load categories and user's organisations
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {});

    fetch("/api/organisations?limit=50")
      .then((res) => res.json())
      .then((data) => setUserOrgs(data.organisations || []))
      .catch(() => {});
  }, []);

  // Debounced duplicate check on title change
  useEffect(() => {
    if (duplicateTimer.current) clearTimeout(duplicateTimer.current);

    if (!title.trim() || title.trim().length < 5) {
      setSimilarPolls([]);
      return;
    }

    duplicateTimer.current = setTimeout(async () => {
      setCheckingDuplicate(true);
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(title)}&exact=true`
      );
      if (res.ok) {
        const data = await res.json();
        setSimilarPolls(data.similar || []);
      }
      setCheckingDuplicate(false);
    }, 500);

    return () => {
      if (duplicateTimer.current) clearTimeout(duplicateTimer.current);
    };
  }, [title]);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) {
      toast.error("At least 2 options are required");
      setLoading(false);
      return;
    }

    if (similarPolls.length > 0) {
      toast.error("A similar poll already exists. Please change your title.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        type,
        options: filledOptions,
        require_verified: requireVerified,
        category_id: categoryId && categoryId !== "none" ? categoryId : null,
        org_id: orgId && orgId !== "none" ? orgId : null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.similar) {
        setSimilarPolls(data.similar);
        toast.error("A similar poll already exists");
      } else {
        toast.error(data.error || "Failed to create poll");
      }
      setLoading(false);
      return;
    }

    toast.success("Poll created!");
    router.push(`/polls/${data.poll.id}`);
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
              Create a Poll
            </CardTitle>
            <CardDescription>
              Ask the people. Get real answers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Question</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What do you want to ask?"
                  required
                  className="bg-white/5 border-white/10 text-lg"
                />
                {checkingDuplicate && (
                  <p className="text-xs text-muted-foreground">
                    Checking for similar polls...
                  </p>
                )}
                {similarPolls.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Similar polls already exist
                    </div>
                    {similarPolls.map((sp) => (
                      <Link
                        key={sp.id}
                        href={`/polls/${sp.id}`}
                        className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        &ldquo;{sp.title}&rdquo;{" "}
                        <span className="text-xs text-amber-400">
                          ({Math.round(sp.similarity_score * 100)}% match)
                        </span>
                      </Link>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Please change your title to make it unique.
                    </p>
                  </div>
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
                  placeholder="Add context to your question..."
                  className="bg-white/5 border-white/10"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vote Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as "single" | "multiple")}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single choice</SelectItem>
                      <SelectItem value="multiple">Multiple choice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Voter Requirement</Label>
                  <Select
                    value={requireVerified ? "verified" : "anyone"}
                    onValueChange={(v) =>
                      setRequireVerified(v === "verified")
                    }
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anyone">Anyone can vote</SelectItem>
                      <SelectItem value="verified">
                        Verified voters only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category <span className="text-muted-foreground">(optional)</span></Label>
                  <Select
                    value={categoryId}
                    onValueChange={setCategoryId}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {userOrgs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Organisation <span className="text-muted-foreground">(optional)</span></Label>
                    <Select
                      value={orgId}
                      onValueChange={setOrgId}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="Select organisation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Personal poll</SelectItem>
                        {userOrgs.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Options</Label>
                {options.map((option, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="bg-white/5 border-white/10"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOption(index)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </Button>
                    )}
                  </motion.div>
                ))}
                {options.length < 10 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addOption}
                    className="w-full border-dashed border-white/10 hover:bg-white/5"
                  >
                    + Add Option
                  </Button>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || similarPolls.length > 0}
                className="w-full bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0 hover:opacity-90 h-12 text-lg disabled:opacity-50"
              >
                {loading ? "Creating..." : similarPolls.length > 0 ? "Similar poll exists — change title" : "Launch Poll"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
