// Enums
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type ProjectStatus = 'active' | 'archived';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
export type Visibility = 'private' | 'shared';
export type VoteType = 'upvote' | 'downvote' | 'score';
export type SplitStatus = 'pending' | 'settled';

// Table row types
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: Visibility;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  invite_status: InviteStatus;
  joined_at: string | null;
  created_at: string;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  invited_by_user_id: string;
  token: string;
  role: ProjectRole;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export interface Category {
  id: string;
  project_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number | null;
  created_at: string;
}

export interface Place {
  id: string;
  project_id: string;
  category_id: string;
  created_by_user_id: string;
  source_url: string | null;
  source_provider: string | null;
  external_place_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  price_level: number | null;
  editorial_summary: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  project_id: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  published_at: string | null;
  source_provider: string | null;
  raw_json: Record<string, unknown> | null;
  created_at: string;
}

export interface PlaceVote {
  id: string;
  project_id: string;
  place_id: string;
  user_id: string;
  vote_type: VoteType;
  score: number | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  project_id: string;
  paid_by_user_id: string;
  title: string;
  amount: number;
  currency: string;
  expense_date: string | null;
  note: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  project_id: string;
  user_id: string;
  amount_owed: number;
  status: SplitStatus;
  created_at: string;
}

// Supabase Database generic type
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at'> & { created_at?: string };
        Update: Partial<Omit<Profile, 'id'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      project_members: {
        Row: ProjectMember;
        Insert: Omit<ProjectMember, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ProjectMember, 'id' | 'created_at'>>;
      };
      project_invites: {
        Row: ProjectInvite;
        Insert: Omit<ProjectInvite, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ProjectInvite, 'id' | 'created_at'>>;
      };
      categories: {
        Row: Category;
        Insert: Omit<Category, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Category, 'id' | 'created_at'>>;
      };
      places: {
        Row: Place;
        Insert: Omit<Place, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Place, 'id' | 'created_at'>>;
      };
      place_reviews: {
        Row: PlaceReview;
        Insert: Omit<PlaceReview, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<PlaceReview, 'id' | 'created_at'>>;
      };
      place_votes: {
        Row: PlaceVote;
        Insert: Omit<PlaceVote, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PlaceVote, 'id' | 'created_at'>>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
      };
      expense_splits: {
        Row: ExpenseSplit;
        Insert: Omit<ExpenseSplit, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<ExpenseSplit, 'id' | 'created_at'>>;
      };
    };
    Enums: {
      project_role: ProjectRole;
      project_status: ProjectStatus;
      invite_status: InviteStatus;
      visibility: Visibility;
      vote_type: VoteType;
      split_status: SplitStatus;
    };
  };
};
