export type CommentTagId = 'clown' | 'overrated' | 'my_religion' | 'my_love' | 'goat' | 'defender' | 'facts' | 'cinema';

export const commentTags: { id: CommentTagId, label: string, emoji: string, color: string }[] = [
  // Hater Group
  { id: 'clown', label: 'Payaso', emoji: '🤡', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  { id: 'overrated', label: 'Sobrevalorado', emoji: '📉', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  
  // Simp Group
  { id: 'my_religion', label: 'Mi Religión', emoji: '🛐', color: 'bg-pink-500/10 text-pink-400 border-pink-500/20' },
  { id: 'my_love', label: 'Mi Amor', emoji: '😍', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  
  // Fan Group
  { id: 'goat', label: 'GOAT', emoji: '👑', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  { id: 'defender', label: 'Defensor', emoji: '🛡️', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  
  // Spectator Group
  { id: 'facts', label: 'Factos', emoji: '🔥', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { id: 'cinema', label: 'Cine', emoji: '🍿', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
];
