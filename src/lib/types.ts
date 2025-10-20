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
  gender?: 'Femenino' | 'Masculino';
  birthDate?: string;
  deathDate?: string;
  occupation?: string;
  maritalStatus?: 'Soltero/a' | 'Casado/a' | 'Divorciado/a' | 'Viudo/a';
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

    
    
    
