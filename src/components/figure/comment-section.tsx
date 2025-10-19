import { getCommentsByFigureId, getUserById, type Comment as CommentType } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ThumbsUp, ThumbsDown, CornerDownRight } from 'lucide-react';
import { Textarea } from '../ui/textarea';
import { StarRating } from '../shared/star-rating';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type CommentProps = {
  comment: CommentType;
  allComments: CommentType[];
  level: number;
};

async function Comment({ comment, allComments, level }: CommentProps) {
  const user = await getUserById(comment.userId);
  const replies = allComments.filter((c) => c.parentId === comment.id);

  return (
    <div className={cn('flex flex-col', level > 0 ? 'ml-6 md:ml-12' : '')}>
      <div className="flex gap-4">
        <Avatar className="hidden h-10 w-10 sm:flex">
          <AvatarImage src={user?.avatarUrl} alt={user?.name} data-ai-hint={user?.avatarHint} />
          <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{user?.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
              </span>
            </div>
            <StarRating rating={comment.rating} starClassName="w-4 h-4" />
          </div>
          <p className="mt-2 text-foreground/90">{comment.text}</p>
          <div className="mt-2 flex items-center gap-4">
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground">
              <ThumbsUp className="h-4 w-4" /> {comment.likes}
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground">
              <ThumbsDown className="h-4 w-4" /> {comment.dislikes}
            </Button>
            {level < 3 && (
              <Button variant="ghost" size="sm" className="flex items-center gap-1.5 text-muted-foreground">
                <CornerDownRight className="h-4 w-4" /> Responder
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {replies.map((reply) => (
          <Comment key={reply.id} comment={reply} allComments={allComments} level={level + 1} />
        ))}
      </div>
    </div>
  );
}

async function NewCommentForm() {
    const currentUser = await getUserById('user-1');
    return (
        <div className="flex gap-4">
            <Avatar className="hidden h-10 w-10 sm:flex">
                <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.name} data-ai-hint={currentUser?.avatarHint} />
                <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <Textarea placeholder="Añade un comentario y califica..." className="mb-2" />
                 <div className="flex justify-between items-center">
                    <StarRating rating={0} starClassName="w-5 h-5 cursor-pointer" />
                    <Button>Publicar Comentario</Button>
                </div>
            </div>
        </div>
    );
}

export default async function CommentSection({ figureId }: { figureId: string }) {
  const allComments = await getCommentsByFigureId(figureId);
  const rootComments = allComments.filter((comment) => comment.parentId === null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opiniones de la Comunidad</CardTitle>
        <CardDescription>Mira lo que otros están diciendo sobre esta figura.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <NewCommentForm />
        <div className="space-y-6">
            {rootComments.map((comment) => (
            <Comment key={comment.id} comment={comment} allComments={allComments} level={0} />
            ))}
            {rootComments.length === 0 && (
                <p className="text-center text-muted-foreground py-8">¡Sé el primero en dejar un comentario!</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
