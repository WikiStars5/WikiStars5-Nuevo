import { PlaceHolderImages } from './placeholder-images';

export type Figure = {
  id: string;
  name: string;
  bio: string;
  nationality: string;
  tags: string[];
  imageUrl: string;
  imageHint: string;
  isFeatured: boolean;
  ratings: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  socials: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
};

export type User = {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string;
  avatarHint: string;
  country: string;
  role: 'admin' | 'user' | 'guest';
  lastAccess: Date;
};

export type Comment = {
  id: string;
  figureId: string;
  userId: string;
  parentId: string | null;
  text: string;
  likes: number;
  dislikes: number;
  createdAt: Date;
  rating: 1 | 2 | 3 | 4 | 5;
};

export type EmotionVote = {
  emotion: 'Joy' | 'Envy' | 'Sadness' | 'Anger' | 'Neutral';
  percentage: number;
};

export type Streak = {
  userId: string;
  figureId: string;
  streak: number;
};

const figures: Figure[] = [
  {
    id: 'aurora-velle',
    name: 'Aurora Velle',
    bio: 'An innovative digital artist known for her ethereal and vibrant creations. Her work explores the intersection of nature and technology, creating mesmerizing visual experiences that captivate audiences worldwide.',
    nationality: 'France',
    tags: ['Digital Art', 'Illustration', 'Creative Tech'],
    imageUrl: PlaceHolderImages.find(p => p.id === 'figure-1')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'figure-1')?.imageHint || '',
    isFeatured: true,
    ratings: { '1': 5, '2': 10, '3': 25, '4': 80, '5': 120 },
    socials: { twitter: 'auroravelle', instagram: 'auroravelle' },
  },
  {
    id: 'dr-arion-hale',
    name: 'Dr. Arion Hale',
    bio: 'A pioneering astrophysicist who led the team that discovered the first habitable exoplanet. His research focuses on stellar evolution and the potential for life beyond Earth.',
    nationality: 'USA',
    tags: ['Astrophysics', 'Science', 'Space Exploration'],
    imageUrl: PlaceHolderImages.find(p => p.id === 'figure-2')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'figure-2')?.imageHint || '',
    isFeatured: true,
    ratings: { '1': 2, '2': 8, '3': 30, '4': 95, '5': 150 },
    socials: { twitter: 'arionhale', website: 'arionhale-research.com' },
  },
  {
    id: 'kaia-sol',
    name: 'Kaia Sol',
    bio: 'A Grammy-winning musician and songwriter whose genre-bending music combines elements of soul, funk, and electronic music. Her powerful lyrics often touch on themes of social justice and personal empowerment.',
    nationality: 'Brazil',
    tags: ['Music', 'Songwriter', 'Activism'],
    imageUrl: PlaceHolderImages.find(p => p.id === 'figure-3')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'figure-3')?.imageHint || '',
    isFeatured: true,
    ratings: { '1': 1, '2': 4, '3': 15, '4': 70, '5': 200 },
    socials: { instagram: 'kaiasolmusic' },
  },
  {
    id: 'lena-petrova',
    name: 'Lena Petrova',
    bio: 'An acclaimed actress celebrated for her versatile performances in independent cinema. She has won numerous awards for her ability to portray complex and emotionally resonant characters.',
    nationality: 'Russia',
    tags: ['Acting', 'Cinema', 'Independent Film'],
    imageUrl: PlaceHolderImages.find(p => p.id === 'figure-4')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'figure-4')?.imageHint || '',
    isFeatured: false,
    ratings: { '1': 8, '2': 12, '3': 40, '4': 60, '5': 90 },
    socials: {},
  },
  {
    id: 'samir-khan',
    name: 'Samir Khan',
    bio: 'A bestselling author whose novels often explore themes of identity and belonging in a globalized world. His latest book won the prestigious International Quill Award.',
    nationality: 'India',
    tags: ['Literature', 'Author', 'Fiction'],
    imageUrl: PlaceHolderImages.find(p => p.id === 'figure-5')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'figure-5')?.imageHint || '',
    isFeatured: true,
    ratings: { '1': 3, '2': 5, '3': 22, '4': 88, '5': 110 },
    socials: { twitter: 'samirkhanwrites' },
  },
  {
    id: 'kenji-tanaka',
    name: 'Kenji Tanaka',
    bio: 'A world-renowned architect famous for his minimalist and sustainable designs. His buildings are known for their harmony with the natural environment and innovative use of materials.',
    nationality: 'Japan',
    tags: ['Architecture', 'Sustainability', 'Design'],
    imageUrl: PlaceHolderImages.find(p => p.id === 'figure-6')?.imageUrl || '',
    imageHint: PlaceHolderImages.find(p => p.id === 'figure-6')?.imageHint || '',
    isFeatured: false,
    ratings: { '1': 1, '2': 2, '3': 10, '4': 50, '5': 70 },
    socials: { website: 'tanaka-arch.jp' },
  },
];

const users: User[] = [
  { id: 'user-1', name: 'Alex', email: 'alex@example.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-1')?.imageUrl || '', avatarHint: 'abstract', country: 'Canada', role: 'admin', lastAccess: new Date('2024-05-20T10:00:00Z') },
  { id: 'user-2', name: 'Bella', email: 'bella@example.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-2')?.imageUrl || '', avatarHint: 'pattern', country: 'Germany', role: 'user', lastAccess: new Date('2024-05-22T14:30:00Z') },
  { id: 'user-3', name: 'Chris', email: 'chris@example.com', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-3')?.imageUrl || '', avatarHint: 'geometric', country: 'Australia', role: 'user', lastAccess: new Date('2024-05-23T08:00:00Z') },
  { id: 'user-4', name: 'Guest-482', avatarUrl: PlaceHolderImages.find(p => p.id === 'avatar-4')?.imageUrl || '', avatarHint: 'nature', country: 'Unknown', role: 'guest', lastAccess: new Date() },
];

const comments: Comment[] = [
  { id: 'comment-1', figureId: 'aurora-velle', userId: 'user-2', parentId: null, text: "Her work is absolutely breathtaking! I've never seen anything like it.", likes: 15, dislikes: 0, createdAt: new Date('2024-05-21T10:00:00Z'), rating: 5 },
  { id: 'comment-2', figureId: 'aurora-velle', userId: 'user-3', parentId: 'comment-1', text: "I agree! The way she blends colors is magical.", likes: 8, dislikes: 0, createdAt: new Date('2024-05-21T11:30:00Z'), rating: 5 },
  { id: 'comment-3', figureId: 'aurora-velle', userId: 'user-1', parentId: 'comment-2', text: "It's the use of light that gets me. Pure genius.", likes: 5, dislikes: 0, createdAt: new Date('2024-05-21T12:00:00Z'), rating: 5 },
  { id: 'comment-4', figureId: 'dr-arion-hale', userId: 'user-3', parentId: null, text: "His contributions to science are immeasurable. A true inspiration for future generations.", likes: 22, dislikes: 1, createdAt: new Date('2024-05-22T15:00:00Z'), rating: 5 },
  { id: 'comment-5', figureId: 'kaia-sol', userId: 'user-4', parentId: null, text: "This song just makes you want to get up and dance. The energy is incredible!", likes: 12, dislikes: 0, createdAt: new Date('2024-05-23T09:45:00Z'), rating: 4 },
];

const emotionVotes: { [key: string]: EmotionVote[] } = {
  'aurora-velle': [
    { emotion: 'Joy', percentage: 75 },
    { emotion: 'Envy', percentage: 10 },
    { emotion: 'Neutral', percentage: 15 },
    { emotion: 'Sadness', percentage: 0 },
    { emotion: 'Anger', percentage: 0 },
  ],
  'dr-arion-hale': [
    { emotion: 'Joy', percentage: 80 },
    { emotion: 'Neutral', percentage: 18 },
    { emotion: 'Envy', percentage: 2 },
    { emotion: 'Sadness', percentage: 0 },
    { emotion: 'Anger', percentage: 0 },
  ],
  'kaia-sol': [
    { emotion: 'Joy', percentage: 90 },
    { emotion: 'Neutral', percentage: 8 },
    { emotion: 'Envy', percentage: 2 },
    { emotion: 'Sadness', percentage: 0 },
    { emotion: 'Anger', percentage: 0 },
  ],
};

const streaks: Streak[] = [
    { userId: 'user-2', figureId: 'aurora-velle', streak: 12 },
    { userId: 'user-3', figureId: 'aurora-velle', streak: 9 },
    { userId: 'user-1', figureId: 'aurora-velle', streak: 5 },
    { userId: 'user-3', figureId: 'dr-arion-hale', streak: 15 },
    { userId: 'user-4', figureId: 'kaia-sol', streak: 3 },
];

// --- Data Fetching Functions ---

export const getFigures = async () => figures;
export const getFeaturedFigures = async () => figures.filter(f => f.isFeatured);
export const getFigureById = async (id: string) => figures.find(f => f.id === id);
export const getRelatedFigures = async (id: string) => figures.filter(f => f.id !== id).slice(0, 3);

export const getUsers = async () => users;
export const getUserById = async (id: string) => users.find(u => u.id === id);

export const getCommentsByFigureId = async (figureId: string) => comments.filter(c => c.figureId === figureId);

export const getEmotionVotesByFigureId = async (figureId: string) => emotionVotes[figureId] || [];

export const getTopStreaksByFigureId = async (figureId: string) => streaks
    .filter(s => s.figureId === figureId)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);
