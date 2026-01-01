
'use client';

import type { Comment } from '@/lib/types';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { StarRating } from '@/components/shared/star-rating';
import { MessageSquare, ThumbsUp, ThumbsDown, FilePenLine, Trash2, Share2 } from 'lucide-react';
import { formatDateDistance, cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { countries } from '@/lib/countries';
import { commentTags } from '@/lib/tags';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';

type AttitudeOption = 'neutral' | 'fan' | 'simp' | 'hater';

const attitudeStyles: Record<AttitudeOption, { text: string; color: string }> = {
    fan: { text: 'Fan', color: 'text-yellow-400' },
    hater: { text: 'Hater', color: 'text-red-500' },
    simp: { text: 'Simp', color: 'text-pink-400' },
    neutral: { text: 'Espectador', color: 'text-gray-500' },
};


interface StarPostCardProps {
  post: Comment;
}

export default function StarPostCard({ post }: StarPostCardProps) {
  const { language, t } = useLanguage();
  const { user } = useUser();

  if (!post.figureId || !post.figureName) {
      return null;
  }
  
  const getAvatarFallback = () => post.userDisplayName?.charAt(0) || 'U';

  const country = post.userCountry ? countries.find(c => c.key === post.userCountry?.toLowerCase()) : null;
  const attitudeStyle = post.userAttitude ? attitudeStyles[post.userAttitude] : null;
  const tag = post.tag ? commentTags.find(t => t.id === post.tag) : null;
  const isOwner = user && user.uid === post.userId;


  return (
    <Card className="hover:border-primary/50 transition-colors">
        <div className="p-4">
             <div className="flex items-start gap-3">
                <Link href={`/u/${post.userDisplayName}`} className="flex-shrink-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={post.userPhotoURL || undefined} alt={post.userDisplayName} />
                        <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/u/${post.userDisplayName}`} className="font-semibold text-sm hover:underline">
                                {post.userDisplayName}
                            </Link>
                             {attitudeStyle && (
                                <p className={cn("text-xs font-bold", attitudeStyle.color)}>{attitudeStyle.text}</p>
                            )}
                            {post.userGender === 'Masculino' && <span className="text-blue-400 font-bold" title="Masculino">♂</span>}
                            {post.userGender === 'Femenino' && <span className="text-pink-400 font-bold" title="Feminino">♀</span>}
                            {country && (
                                <Image
                                    src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                                    alt={country.name}
                                    width={20}
                                    height={15}
                                    className="object-contain"
                                    title={country.name}
                                />
                            )}
                         </div>
                    </div>
                     <p className="text-xs text-muted-foreground">
                        Publicado en <Link href={`/figures/${post.figureId}`} className="text-primary hover:underline">{post.figureName}</Link>
                    </p>
                </div>
            </div>

            <div className="pl-12 mt-2 space-y-2">
                <div className="flex w-full justify-between items-center gap-2">
                    {tag ? (
                        <div className={cn("inline-flex items-center gap-2 text-xs font-bold px-2 py-0.5 rounded-full border", tag.color)}>
                            {tag.emoji} {tag.label}
                        </div>
                    ) : <div />}
                    {typeof post.rating === 'number' && post.rating >= 0 && <StarRating rating={post.rating} starClassName="h-4 w-4" />}
                </div>

                <Link href={`/figures/${post.figureId}?thread=${post.threadId || post.id}`} className="space-y-1 block">
                    {post.title && <h4 className="font-bold text-lg uppercase">{post.title}</h4>}
                    {post.text && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{post.text}</p>}
                </Link>
                 
                <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-semibold w-6 text-center">{post.likes ?? 0}</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-semibold w-6 text-center">{post.dislikes ?? 0}</span>
                        
                        <div className="flex-grow" />
                        
                        {isOwner && (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <FilePenLine className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </div>
                     <div className="flex">
                        <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                            <Link href={`/figures/${post.figureId}?thread=${post.threadId || post.id}#comment-${post.id}`}>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Responder
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    </Card>
  );
}
