export interface Figure {
  id: string;
  name: string;
  imageUrl: string;
  imageHint?: string;
  nationality: string;
  tags: string[];
  isFeatured?: boolean;
  nameKeywords: string[];
  approved: boolean;
  description?: string;
  photoUrl?: string;
  attitude?: {
    neutral: number;
    fan: number;
    simp: number;
    hater: number;
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

    