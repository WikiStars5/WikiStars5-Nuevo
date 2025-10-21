import type { Timestamp } from 'firebase/firestore';

export interface Figure {
  id: string;
  name: string;
  imageUrl: string;
  imageHint?: string;
  nationality: string;
  tags?: string[];
  tagsLower?: string[];
  tagKeywords?: string[];
  isFeatured?: boolean;
  nameKeywords: string[];
  approved: boolean;
  description?: string;
  photoUrl?: string;
  gender?: 'Femenino' | 'Masculino';
  birthDate?: string;
  deathDate?: string;
  occupation?: string;
  maritalStatus?: 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a';
  height?: number;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    youtube?: string;
    facebook?: string;
    linkedin?: string;
    discord?: string;
    tiktok?: string;
    website?: string;
  };
  attitude?: {
    neutral: number;
    fan: number;
    simp: number;
    hater: number;
  };
  emotion?: {
    alegria: number;
    envidia: number;
    tristeza: number;
    miedo: number;
    desagrado: number;
    furia: number;
  };
}

export interface Hashtag {
    id: string;
    name: string;
    figureCount: number;
}

export interface AttitudeVote {
    id: string;
    userId: string;
    figureId: string;
    vote: 'neutral' | 'fan' | 'simp' | 'hater';
    createdAt: any; // Firestore Timestamp
}

export interface EmotionVote {
    id: string;
    userId: string;
    figureId: string;
    vote: 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';
    createdAt: any; // Firestore Timestamp
}

export interface Comment {
  id: string;
  userId: string;
  figureId: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likes?: number;
  dislikes?: number;
  // Denormalized user data for display
  userDisplayName: string;
  userPhotoURL: string | null;
}

export interface CommentVote {
  id: string;
  userId: string;
  commentId: string;
  vote: 'like' | 'dislike';
  createdAt: Timestamp;
}
