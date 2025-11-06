
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
  maritalStatus?: 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a' | 'Separado/Ex-Conviviente';
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
  ratingCount: number;
  totalRating: number;
  ratingsBreakdown: {
    '0': number;
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  createdAt?: Timestamp;
}

export interface Hashtag {
    id: string;
    name: string;
    figureCount: number;
}

export interface RelatedFigure {
  id: string;
  sourceFigureId: string;
  sourceFigureName: string;
  targetFigureId: string;
  targetFigureName: string;
  createdAt: Timestamp;
}


export interface AttitudeVote {
    id: string; // figureId
    userId: string;
    figureId: string;
    vote: 'neutral' | 'fan' | 'simp' | 'hater';
    initialVote?: 'neutral' | 'fan' | 'simp' | 'hater'; // The first vote ever cast
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
  rating: number; // Star rating from 0-5 associated with the comment. -1 for replies.
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likes?: number;
  dislikes?: number;
  parentId: string | null;
  threadId?: string; // ID of the root comment in the thread
  // Denormalized user data for display
  userDisplayName: string;
  userPhotoURL: string | null;
  userCountry?: string;
  userGender?: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo';
}

export interface CommentVote {
  id: string;
  userId: string;
  commentId: string;
  vote: 'like' | 'dislike';
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'comment_reply';
  message: string;
  isRead: boolean;
  createdAt: Timestamp;
  link: string;
}

export interface Streak {
  id: string; // The ID will now be the figureId
  userId: string;
  figureId: string; // Denormalized for querying
  currentStreak: number;
  lastCommentDate: Timestamp;
  userDisplayName: string;
  userPhotoURL?: string | null;
  userCountry?: string;
  userGender?: string;
}

export interface GoatBattle {
    id: string;
    messiVotes: number;
    ronaldoVotes: number;
    endTime?: Timestamp;
    winner?: 'messi' | 'ronaldo' | null;
}

export interface GoatVote {
    id: string; // userId
    userId: string;
    vote: 'messi' | 'ronaldo';
    createdAt: Timestamp;
}
    
