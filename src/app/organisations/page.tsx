"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Building2, Plus } from "lucide-react";
import type { Organisation } from "@/lib/supabase/types";

export default function OrganisationsPage() {
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/organisations?limit=50")
      .then((res) => res.json())
      .then((data) => setOrgs(data.organisations || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Organisations</h1>
          <p className="text-muted-foreground mt-1">
            Institutional polling from verified organisations
          </p>
        </div>
        <Link href="/organisations/create">
          <Button className="bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0 hover:opacity-90">
            <Plus className="h-4 w-4 mr-2" />
            Create Organisation
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg text-muted-foreground mb-4">
            No organisations yet. Be the first to create one!
          </p>
          <Link href="/organisations/create">
            <Button className="bg-gradient-to-r from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white border-0">
              Create Organisation
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org, i) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link href={`/organisations/${org.slug}`}>
                <div className="glass rounded-2xl p-5 hover:bg-white/[0.07] transition-all cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-[oklch(0.7_0.2_280)] to-[oklch(0.7_0.15_190)] text-white text-sm">
                        {org.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                        {org.name}
                      </h3>
                      {org.profiles?.display_name && (
                        <p className="text-xs text-muted-foreground">
                          by {org.profiles.display_name}
                        </p>
                      )}
                    </div>
                  </div>
                  {org.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {org.description}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
