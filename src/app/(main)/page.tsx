
'use client';

import type { Comment } from '@/lib/types';
import StarPostCard from '@/components/shared/starpost-card';
import { Timestamp } from 'firebase/firestore';
import FeaturedFigures from '@/components/shared/featured-figures';

// Mock data to simulate Firestore response
const mockStarPosts: Comment[] = [
  {
    id: '1',
    userId: 'user1',
    figureId: 'lionel-messi',
    figureName: 'Lionel Messi',
    userDisplayName: 'LeoFan',
    userPhotoURL: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80',
    title: 'El mejor de todos los tiempos',
    text: 'Simplemente increíble. Cada partido es una clase magistral. No hay debate posible, el GOAT indiscutible. 👑',
    rating: 5,
    createdAt: Timestamp.fromMillis(Date.now() - 3600000), // 1 hour ago
    replyCount: 12,
    parentId: null,
    likes: 152,
    dislikes: 12,
    tag: 'goat',
    userCountry: 'argentina',
    userGender: 'Masculino',
    userAttitude: 'fan',
  },
  {
    id: '2',
    userId: 'user2',
    figureId: 'cristiano-ronaldo',
    figureName: 'Cristiano Ronaldo',
    userDisplayName: 'CR7_Supporter',
    userPhotoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80',
    title: 'Mentalidad de campeón',
    text: 'La disciplina y la ambición de este hombre son de otro nivel. Un atleta perfecto y un ganador nato. ¡Siuuu!',
    rating: 5,
    createdAt: Timestamp.fromMillis(Date.now() - 7200000), // 2 hours ago
    replyCount: 8,
    parentId: null,
    likes: 210,
    dislikes: 25,
    tag: 'defender',
    userCountry: 'portugal',
    userGender: 'Masculino',
    userAttitude: 'fan',
  },
  {
    id: '3',
    userId: 'user3',
    figureId: 'keiko-fujimori',
    figureName: 'Keiko Fujimori',
    userDisplayName: 'PoliticoAnalista',
    userPhotoURL: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80',
    title: 'Una figura controversial',
    text: 'Su carrera política ha estado llena de altibajos. Es innegable su influencia, pero también las polémicas que la rodean.',
    rating: 2,
    createdAt: Timestamp.fromMillis(Date.now() - 10800000), // 3 hours ago
    replyCount: 5,
    parentId: null,
    likes: 30,
    dislikes: 45,
    tag: 'clown',
    userCountry: 'peru',
    userGender: 'Femenino',
    userAttitude: 'hater',
  },
   {
    id: '4',
    userId: 'user4',
    figureId: 'shakira',
    figureName: 'Shakira',
    userDisplayName: 'MusicLover',
    userPhotoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=100&q=80',
    title: 'Reina Latina',
    text: 'Desde "Pies Descalzos" hasta su última sesión con Bizarrap, Shakira nunca deja de reinventarse. ¡Una leyenda!',
    rating: 5,
    createdAt: Timestamp.fromMillis(Date.now() - 21600000), // 6 hours ago
    replyCount: 22,
    parentId: null,
    likes: 350,
    dislikes: 8,
    tag: 'my_love',
    userCountry: 'colombia',
    userGender: 'Femenino',
    userAttitude: 'simp',
  },
];


export default function HomePage() {

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:py-12">
      <FeaturedFigures />
      <h2 className="text-xl font-bold tracking-tight font-headline mb-4">Mira lo que dicen en vivo sobre tus personajes favoritos</h2>
      <div className="space-y-4">
        {mockStarPosts.map(post => (
            <StarPostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
