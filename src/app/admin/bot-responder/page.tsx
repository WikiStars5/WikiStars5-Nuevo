
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { Loader2, ArrowLeft, Bot, MessageSquare, XCircle } from 'lucide-react';
import type { Figure, Comment as CommentType } from '@/lib/types';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { Skeleton } from '@/components/ui/skeleton';
import CommentItem from '@/components/admin/admin-comment-item';
import AdminBotReplyForm from '@/components/admin/admin-bot-reply-form';

export default function BotResponderPage() {
  const [selectedFigure, setSelectedFigure] = React.useState<Figure | null>(null);
  const [replyingToComment, setReplyingToComment] = React.useState<CommentType | null>(null);

  const firestore = useFirestore();

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !selectedFigure) return null;
    return query(
        collection(firestore, 'figures', selectedFigure.id, 'comments'),
        orderBy('createdAt', 'desc'),
        limit(50)
    );
  }, [firestore, selectedFigure]);

  const { data: comments, isLoading: isLoadingComments, refetch } = useCollection<CommentType>(commentsQuery);

  const handleReplySuccess = () => {
    setReplyingToComment(null);
    // Optionally refetch comments if reply count needs to be updated live
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Bot /> Responder como Bot</CardTitle>
              <CardDescription>
                Responde a comentarios existentes usando identidades de bots para mantener la actividad y las rachas.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al panel</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="space-y-4">
                <h3 className="font-semibold text-lg">Paso 1: Selecciona el Perfil</h3>
                {selectedFigure ? (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <p className="font-semibold">Perfil seleccionado: <span className="text-primary">{selectedFigure.name}</span></p>
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                            setSelectedFigure(null);
                            setReplyingToComment(null);
                        }}>
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <FigureSearchInput onFigureSelect={setSelectedFigure} />
                )}
            </div>
            
            {selectedFigure && (
                 <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Paso 2: Elige un Comentario y Responde</h3>
                     {isLoadingComments && (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                     )}
                     {!isLoadingComments && (!comments || comments.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">No hay comentarios en este perfil para responder.</p>
                     )}

                    <div className="space-y-4">
                        {comments?.map(comment => (
                            <div key={comment.id}>
                                <CommentItem 
                                    comment={comment}
                                    onReply={() => setReplyingToComment(comment)}
                                />
                                {replyingToComment?.id === comment.id && (
                                     <div className="mt-4 pl-10">
                                         <AdminBotReplyForm
                                            figureId={selectedFigure.id}
                                            figureName={selectedFigure.name}
                                            parentComment={comment}
                                            onReplySuccess={handleReplySuccess}
                                            allComments={comments}
                                        />
                                     </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
