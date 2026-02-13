"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface AdminPoll {
  id: string;
  title: string;
  status: string;
  featured: boolean;
  created_at: string;
  profiles: { username: string | null; display_name: string | null } | null;
}

interface Report {
  id: string;
  reason: string;
  resolved: boolean;
  created_at: string;
  polls: { id: string; title: string } | null;
}

export default function AdminPage() {
  const supabase = createClient();
  const [polls, setPolls] = useState<AdminPoll[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pollsRes, reportsRes] = await Promise.all([
        supabase
          .from("polls")
          .select("id, title, status, featured, created_at, profiles(username, display_name)")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("reports")
          .select("id, reason, resolved, created_at, polls(id, title)")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      setPolls((pollsRes.data as unknown as AdminPoll[]) || []);
      setReports((reportsRes.data as unknown as Report[]) || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const toggleFeatured = async (pollId: string, current: boolean) => {
    const { error } = await supabase
      .from("polls")
      .update({ featured: !current })
      .eq("id", pollId);

    if (error) {
      toast.error("Failed to update");
      return;
    }

    setPolls(
      polls.map((p) =>
        p.id === pollId ? { ...p, featured: !current } : p
      )
    );
    toast.success(!current ? "Poll featured" : "Poll unfeatured");
  };

  const moderatePoll = async (pollId: string) => {
    const { error } = await supabase
      .from("polls")
      .update({ status: "moderated" })
      .eq("id", pollId);

    if (error) {
      toast.error("Failed to moderate");
      return;
    }

    setPolls(
      polls.map((p) =>
        p.id === pollId ? { ...p, status: "moderated" } : p
      )
    );
    toast.success("Poll moderated");
  };

  const deletePoll = async (pollId: string) => {
    const { error } = await supabase
      .from("polls")
      .delete()
      .eq("id", pollId);

    if (error) {
      toast.error("Failed to delete: " + error.message);
      return;
    }

    setPolls(polls.filter((p) => p.id !== pollId));
    toast.success("Poll deleted");
  };

  const resolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ resolved: true })
      .eq("id", reportId);

    if (error) {
      toast.error("Failed to resolve");
      return;
    }

    setReports(
      reports.map((r) =>
        r.id === reportId ? { ...r, resolved: true } : r
      )
    );
    toast.success("Report resolved");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold gradient-text mb-8">
          Admin Dashboard
        </h1>

        <Tabs defaultValue="polls" className="space-y-4">
          <TabsList className="glass border-white/10">
            <TabsTrigger value="polls">
              Polls ({polls.length})
            </TabsTrigger>
            <TabsTrigger value="reports">
              Reports ({reports.filter((r) => !r.resolved).length} open)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="polls">
            <div className="space-y-2">
              {polls.map((poll) => (
                <Card key={poll.id} className="glass border-white/10">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{poll.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            poll.status === "moderated"
                              ? "border-red-500/30 text-red-300"
                              : poll.status === "closed"
                                ? "border-white/10"
                                : "border-emerald-500/30 text-emerald-300"
                          }`}
                        >
                          {poll.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          by{" "}
                          {poll.profiles?.display_name ||
                            poll.profiles?.username ||
                            "unknown"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          toggleFeatured(poll.id, poll.featured)
                        }
                        className={`text-xs ${
                          poll.featured
                            ? "border-primary/50 text-primary"
                            : "border-white/10"
                        }`}
                      >
                        {poll.featured ? "Unfeature" : "Feature"}
                      </Button>
                      {poll.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moderatePoll(poll.id)}
                          className="text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                        >
                          Moderate
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Delete this poll permanently?")) {
                            deletePoll(poll.id);
                          }
                        }}
                        className="text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <div className="space-y-2">
              {reports.length === 0 ? (
                <Card className="glass border-white/10">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No reports yet
                  </CardContent>
                </Card>
              ) : (
                reports.map((report) => (
                  <Card key={report.id} className="glass border-white/10">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {report.polls?.title || "Unknown poll"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.resolved ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-0 text-xs">
                            Resolved
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveReport(report.id)}
                            className="text-xs border-white/10"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
