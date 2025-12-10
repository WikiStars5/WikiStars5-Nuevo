export type CommentTagId = 'clown' | 'facts' | 'crybaby' | 'goat';

export const commentTags: { id: CommentTagId, label: string, emoji: string, color: string }[] = [
  { id: 'clown', label: 'Payaso', emoji: '🤡', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { id: 'facts', label: 'Factos', emoji: '🔥', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { id: 'crybaby', label: 'Llorón', emoji: '😭', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'goat', label: 'GOAT', emoji: '👑', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
];
