// Enums
export type TripRole = 'owner' | 'admin' | 'editor' | 'viewer';
export type TripStatus = 'active' | 'archived';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired' | 'requested';
export type Visibility = 'private' | 'public';
export type VoteType = 'upvote' | 'downvote' | 'score';
export type SplitStatus = 'pending' | 'settled';

// Json type for jsonb columns. Defined as a plain object type so that
// Row/Insert/Update all satisfy the `Record<string, unknown>` constraint
// that GenericTable imposes. In practice our jsonb columns store objects,
// not bare arrays or scalars, so this is accurate.
export type Json = Record<string, unknown> | null;

// Table row types
export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Trip {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  visibility: Visibility;
  status: TripStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  budget_currency: string;
  budget_payer_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: TripRole;
  invite_status: InviteStatus;
  joined_at: string | null;
  created_at: string;
}

export interface TripInvite {
  id: string;
  trip_id: string;
  email: string;
  invited_by_user_id: string;
  token: string;
  role: TripRole;
  status: InviteStatus;
  expires_at: string;
  created_at: string;
}

export type CategoryType = 'general' | 'accommodation';

export interface Category {
  id: string;
  trip_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number | null;
  category_type: CategoryType;
  created_at: string;
}

export interface Place {
  id: string;
  trip_id: string;
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
  metadata_json: Json | null;
  visit_date: string | null;       // date: YYYY-MM-DD
  visit_time_from: string | null;  // time: HH:MM
  visit_time_to: string | null;    // time: HH:MM
  backup_place_id: string | null;  // FK → places.id
  note: string | null;             // editor-only trip note
  checkout_date: string | null;    // accommodation check-out date (YYYY-MM-DD)
  actual_checkin_at: string | null;  // ISO timestamp of actual check-in
  actual_checkout_at: string | null; // ISO timestamp of actual check-out
  created_at: string;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  trip_id: string;
  author_name: string | null;
  rating: number | null;
  text: string | null;
  published_at: string | null;
  source_provider: string | null;
  raw_json: Json | null;
  created_at: string;
}

export interface PlaceVote {
  id: string;
  trip_id: string;
  place_id: string;
  user_id: string;
  vote_type: VoteType;
  score: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceComment {
  id: string;
  place_id: string;
  trip_id: string;
  user_id: string;
  body: string;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  paid_by_user_id: string;
  title: string;
  amount: number;
  currency: string;
  expense_date: string | null;
  note: string | null;
  category: string | null;
  receipt_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripActivity {
  id: string;
  trip_id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  meta: Json;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  trip_id: string;
  user_id: string;
  amount_owed: number;
  status: SplitStatus;
  created_at: string;
}

// Supabase Database generic type.
// Notes on compatibility with @supabase/supabase-js v2.99+:
//   1. Each table must include `Relationships: []` to satisfy `GenericTable`.
//   2. `__InternalSupabase.PostgrestVersion` must be declared so that
//      supabase-js uses it instead of defaulting to '12', which causes
//      insert/update/upsert overloads to resolve the payload type as `never`.
// R<T> widens an interface T to also satisfy Record<string, unknown>.
// TypeScript interfaces do not automatically extend Record<string, unknown>
// (they lack an explicit index signature), which causes the Supabase client's
// GenericTable constraint to resolve the table as `never` for mutations.
// Intersecting with Record<string, unknown> satisfies that constraint while
// preserving all named property types for autocomplete and type-safety.
type R<T> = T & Record<string, unknown>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: R<Profile>;
        Insert: R<Omit<Profile, 'created_at' | 'avatar_url'> & { created_at?: string; avatar_url?: string | null }>;
        Update: R<Partial<Omit<Profile, 'id'>>>;
        Relationships: [];
      };
      trips: {
        Row: R<Trip>;
        Insert: R<Omit<Trip, 'id' | 'created_at' | 'updated_at' | 'cover_image_url' | 'status' | 'budget' | 'budget_currency' | 'budget_payer_user_id'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          cover_image_url?: string | null;
          status?: TripStatus;
          budget?: number | null;
          budget_currency?: string;
          budget_payer_user_id?: string | null;
        }>;
        Update: R<Partial<Omit<Trip, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      trip_members: {
        Row: R<TripMember>;
        Insert: R<Omit<TripMember, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        }>;
        Update: R<Partial<Omit<TripMember, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      trip_invites: {
        Row: R<TripInvite>;
        Insert: R<Omit<TripInvite, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        }>;
        Update: R<Partial<Omit<TripInvite, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      categories: {
        Row: R<Category>;
        Insert: R<Omit<Category, 'id' | 'created_at' | 'category_type'> & {
          id?: string;
          created_at?: string;
          category_type?: CategoryType;
        }>;
        Update: R<Partial<Omit<Category, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      places: {
        Row: R<Place>;
        Insert: R<Omit<Place, 'id' | 'created_at' | 'note' | 'checkout_date'> & {
          id?: string;
          created_at?: string;
          note?: string | null;
          checkout_date?: string | null;
        }>;
        Update: R<Partial<Omit<Place, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      place_reviews: {
        Row: R<PlaceReview>;
        Insert: R<Omit<PlaceReview, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        }>;
        Update: R<Partial<Omit<PlaceReview, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      place_votes: {
        Row: R<PlaceVote>;
        Insert: R<Omit<PlaceVote, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        }>;
        Update: R<Partial<Omit<PlaceVote, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      place_comments: {
        Row: R<PlaceComment>;
        Insert: R<Omit<PlaceComment, 'id' | 'created_at'> & { id?: string; created_at?: string }>;
        Update: R<Partial<Omit<PlaceComment, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      expenses: {
        Row: R<Expense>;
        Insert: R<Omit<Expense, 'id' | 'created_at' | 'updated_at' | 'category'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          category?: string | null;
        }>;
        Update: R<Partial<Omit<Expense, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      trip_activity: {
        Row: R<TripActivity>;
        Insert: R<Omit<TripActivity, 'id' | 'created_at'> & { id?: string; created_at?: string }>;
        Update: R<Partial<Omit<TripActivity, 'id' | 'created_at'>>>;
        Relationships: [];
      };
      expense_splits: {
        Row: R<ExpenseSplit>;
        Insert: R<Omit<ExpenseSplit, 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        }>;
        Update: R<Partial<Omit<ExpenseSplit, 'id' | 'created_at'>>>;
        Relationships: [];
      };
    };
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: {
      trip_role: TripRole;
      trip_status: TripStatus;
      invite_status: InviteStatus;
      visibility: Visibility;
      vote_type: VoteType;
      split_status: SplitStatus;
    };
  };
};
