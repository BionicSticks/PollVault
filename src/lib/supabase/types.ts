export interface Poll {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  type: "single" | "multiple";
  status: "active" | "closed" | "moderated";
  featured: boolean;
  require_verified: boolean;
  closes_at: string | null;
  created_at: string;
  category_id: string | null;
  org_id: string | null;
  profiles?: { username: string | null; display_name: string | null };
  options?: PollOption[];
  categories?: Category | null;
  organisations?: Organisation | null;
  poll_tags?: { tags: Tag }[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  position: number;
  vote_count: number;
}

export interface Vote {
  id: string;
  user_id: string;
  poll_id: string;
  option_id: string;
  created_at: string;
}

export interface VoteDemographic {
  poll_id: string;
  option_id: string;
  age_range: string;
  gender: string;
  country: string;
  count: number;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  role: "user" | "admin";
  voter_tier: "basic" | "verified";
  phone_verified: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatar_url: string | null;
  owner_id: string;
  created_at: string;
  profiles?: { username: string | null; display_name: string | null };
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role: "member" | "admin";
  profiles?: { username: string | null; display_name: string | null; avatar_url: string | null };
}

export const AGE_RANGES = [
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

export const GENDERS = [
  "male",
  "female",
] as const;
