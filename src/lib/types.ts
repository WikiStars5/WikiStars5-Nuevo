
import type { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  username: string;
  email: string | null;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  fcmTokens?: string[]; // For Push Notifications
  referralCount?: number;
  visitCount?: number;
  lastVisit?: Timestamp;
}

export interface GlobalSettings {
  isRatingEnabled: boolean;
  isVotingEnabled?: boolean;
  isCommentingEnabled?: boolean;
  isReplyEnabled?: boolean;
}

export interface Figure {
  id: string;
  name: string;
  imageUrl: string;
  imageHint?: string;
  nationality: string;
  nameKeywords: string[];
  approved: boolean;
  description?: string;
  photoUrl?: string;
  gender?: 'Femenino' | 'Masculino';
  profileType?: 'figure' | 'page';
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
    wikipedia?: string;
    fandom?: string;
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
  shareCounts?: {
    profile: number;
    goat: number;
    attitude: number;
    emotion: number;
    rating: number;
  };
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  // Temporary fields for security rules, not stored in DB.
  __oldVote?: string | null;
  __newVote?: string | null;
  __ratingCount_delta?: number;
  __totalRating_delta?: number;
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
    createdAt: any; // Firestore Timestamp
    // Denormalized data
    figureName: string;
    figureImageUrl: string;
}

export interface EmotionVote {
    id: string;
    userId: string;
    figureId: string;
    vote: 'alegria' | 'envidia' | 'tristeza' | 'miedo' | 'desagrado' | 'furia';
    createdAt: any; // Firestore Timestamp
    // Denormalized data
    figureName: string;
    figureImageUrl: string;
}

export interface Comment {
  id: string;
  userId: string;
  figureId: string;
  text: string;
  rating: number; // Star rating from 0-5 associated with the comment. -1 for replies or when ratings are disabled.
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likes?: number;
  dislikes?: number;
  parentId: string | null;
  replyCount?: number; // Number of direct replies to this comment
  threadId?: string; // ID of the root comment in the thread
  // Denormalized user data for display
  userDisplayName: string;
  userPhotoURL: string | null;
  userCountry?: string | null;
  userGender?: 'Masculino' | 'Femenino' | 'Otro' | 'Prefiero no decirlo' | null;
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
  message: string; // Legacy, will be deprecated
  data: {
    commenterName: string;
    figureName: string;
  };
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
  userCountry?: string | null;
  userGender?: string | null;
  // Denormalized figure data
  figureName?: string;
  figureImageUrl?: string;
}

export interface GoatBattle {
    id: string;
    messiVotes: number;
    ronaldoVotes: number;
    startTime?: Timestamp;
    endTime?: Timestamp;
    winner?: 'messi' | 'ronaldo' | null;
    isPaused?: boolean;
}

export interface GoatVote {
    id: string; // userId
    userId: string;
    vote: 'messi' | 'ronaldo';
    createdAt: Timestamp;
}

export interface Referral {
    referredUserId: string;
    createdAt: Timestamp;
    sourceFigureId?: string | null;
    hasVoted?: boolean;
}
