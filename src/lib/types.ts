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
}

export interface Hashtag {
    id: string;
    name: string;
    figureCount: number;
}
