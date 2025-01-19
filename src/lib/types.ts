import type { AnalysisResult } from './gemini';

export interface Profile {
  id: string;
  username: string;
  gender: 'male' | 'female' | 'other';
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  user_id: string;
  front_image_url: string | null;
  left_side_image_url: string | null;
  right_side_image_url: string | null;
  hair_image_url: string | null;
  teeth_image_url: string | null;
  body_image_url: string | null;
  analysis_text: string | null;
  face_rating: number | null;
  hair_rating: number | null;
  teeth_rating: number | null;
  body_rating: number | null;
  overall_rating: number | null;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  type: 'analysis' | 'before_after';
  analysis_id: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  content: string | null;
  created_at: string;
  profiles?: Profile;
  analyses?: Analysis;
  before_analysis?: Analysis;
  after_analysis?: Analysis;
  comments?: Comment[];
  reactions?: Reaction[];
  _count?: {
    comments: number;
    reactions: number;
  };
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}

export interface Reaction {
  id: string;
  post_id: string;
  user_id: string;
  type: 'like' | 'helpful' | 'insightful';
  created_at: string;
}

export interface Connection {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  initialized: boolean;
  lastRefresh: number;
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (email: string, password: string, username: string, gender: Profile['gender']) => Promise<Profile>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}