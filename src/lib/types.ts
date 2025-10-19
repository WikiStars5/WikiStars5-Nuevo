export interface Figure {
  id: string;
  name: string;
  imageUrl: string;
  imageHint?: string;
  nationality: string;
  tags: string[];
  isFeatured?: boolean;
}
