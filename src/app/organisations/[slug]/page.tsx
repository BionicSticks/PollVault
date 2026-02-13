"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PollCard } from "@/components/PollCard";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import type { Organisation, Poll } from "@/lib/supabase/types";

export default function OrgProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<Organisation | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [orgRes, pollsRes] = await Promise.all([
        fetch(`/api/organisations?slug=${slug}`),
        fetch(`/api/polls?org=${slug}`),
      ]);

      if (orgRes.ok) {
        const data = await orgRes.json();
        setOrg(data.organisation);
      }
      if (pollsRes.ok) {
        const data = await pollsRes.json();
        setPolls(data.polls || []);
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold">Organisation not found</h1>
        <p className="text-muted-foreground mt-2">
          The organisation you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-8 mb-8"
      >
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-to-br from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white text-2xl">
              {org.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold gradient-text">{org.name}</h1>
            {org.profiles?.display_name && (
              <p className="text-sm text-muted-foreground mt-1">
                Created by {org.profiles.display_name}
              </p>
            )}
          </div>
        </div>
        {org.description && (
          <p className="text-muted-foreground mt-4">{org.description}</p>
        )}
      </motion.div>

      <h2 className="text-xl font-semibold mb-4">Polls by {org.name}</h2>
      {polls.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl">
          <p className="text-muted-foreground">
            This organisation hasn&apos;t created any polls yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {polls.map((poll, i) => (
            <PollCard key={poll.id} poll={poll} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
