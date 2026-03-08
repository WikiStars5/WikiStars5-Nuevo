'use client';

import { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  collection, 
  serverTimestamp, 
  doc, 
  runTransaction, 
  increment, 
  query, 
  where, 
  limit, 
  getDocs, 
  Timestamp 
} from 'firebase/firestore';
import { signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { useAuth, useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Tag, XCircle, Search, User as UserIcon, Sparkles } from 'lucide-react';
import StarInput from '@/components/figure/star-input';
import { Figure, User as AppUser, Achievement } from '@/lib/types';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { normalizeText } from '@/lib/keywords';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { commentTags, type CommentTagId } from '@/lib/tags';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import FigureSearchInput from '@/components/figure/figure-search-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

const createCommentSchema = (needsIdentity: boolean) => z.object({
  rating: z.number({ required_error: 'Debes seleccionar una calificación.' }).min(0).max(5),
  username: needsIdentity 
    ? z.string().min(3, 'Mínimo 3 caracteres.').max(15, 'Máximo 15 caracteres.').regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos.')
    : z.string().optional(),
  text: z.string().max(500, 'Máximo 500 caracteres.').optional(),
  tag: z.custom<CommentTagId>().optional(),
});

type CommentFormValues = z.infer<ReturnType<typeof createCommentSchema>>;

export default function GlobalStarPostForm() {
  const { user, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const [selectedFigure, setSelectedFigure] = useState<Figure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<AppUser>(userProfileRef);

  const username = userProfile?.username || '';
  const isDefaultName = 
    username.startsWith('user') || 
    username.startsWith('Invitado') || 
    username.startsWith('Guest') || 
    username.startsWith('Convidado');
    
  const needsIdentity = !username || isDefaultName;

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(createCommentSchema(needsIdentity)),
    defaultValues: { text: '', rating: 5, username: '', tag: undefined },
  });

  const selectedTagId = form.watch('tag');
  const selectedTag = selectedTagId ? commentTags.find(t => t.id === selectedTagId) : null;

  const handleSubmit = async (data: CommentFormValues) => {
    if (!selectedFigure) {
      toast({ title: 'Selecciona un personaje', description: 'Debes elegir a quién va dirigido tu StarPost.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    let currentUser = user;

    if (!currentUser && auth) {
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        await reloadUser();
      } catch (error) {
        toast({ title: 'Error de autenticación', variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
    }

    if (!currentUser || !firestore) {
      setIsSubmitting(false);
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const figureRef = doc(firestore, 'figures', selectedFigure.id);
        const userRef = doc(firestore, 'users', currentUser!.uid);
        const achievementRef = doc(firestore, `users/${currentUser!.uid}/achievements`, selectedFigure.id);
        
        const [figureSnap, userSnap, achievementSnap] = await Promise.all([
          transaction.get(figureRef),
          transaction.get(userRef),
          transaction.get(achievementRef)
        ]);

        if (!figureSnap.exists()) throw new Error("Personaje no encontrado.");

        const figureData = figureSnap.data() as Figure;
        const userProfileData = userSnap.exists() ? userSnap.data() as AppUser : {};
        
        if (data.username && needsIdentity) {
          const usernameLower = normalizeText(data.username);
          const usernameRef = doc(firestore, 'usernames', usernameLower);
          const usernameDoc = await transaction.get(usernameRef);
          
          if (usernameDoc.exists() && usernameDoc.data()?.userId !== currentUser!.uid) {
            throw new Error(t('ProfilePage.toast.usernameInUse'));
          }

          transaction.set(userRef, { 
            username: data.username,
            usernameLower: usernameLower,
            id: currentUser!.uid,
            createdAt: userProfileData.createdAt || serverTimestamp()
          }, { merge: true });
          transaction.set(usernameRef, { userId: currentUser!.uid });
        }

        const finalDisplayName = data.username || userProfileData.username || currentUser!.displayName || `${t('ProfilePage.guestUser')}_${currentUser!.uid.substring(0,4)}`;
        const country = userProfileData.country || null;
        const gender = userProfileData.gender || null;

        transaction.update(figureRef, {
          ratingCount: increment(1),
          totalRating: increment(data.rating),
          [`ratingsBreakdown.${data.rating}`]: increment(1),
          updatedAt: serverTimestamp()
        });

        const commentRef = doc(collection(firestore, 'figures', selectedFigure.id, 'comments'));
        const commentData = {
          userId: currentUser!.uid,
          figureId: selectedFigure.id,
          figureName: selectedFigure.name,
          figureImageUrl: selectedFigure.imageUrl,
          text: data.text || '',
          tag: data.tag || null,
          rating: data.rating,
          createdAt: serverTimestamp(),
          userDisplayName: finalDisplayName,
          userPhotoURL: userProfileData.profilePhotoUrl || currentUser!.photoURL,
          userCountry: country,
          userGender: gender,
          likes: 0,
          dislikes: 0,
          parentId: null,
          replyCount: 0,
          threadId: commentRef.id,
        };
        transaction.set(commentRef, commentData);

        const userStarpostColRef = collection(firestore, 'users', currentUser!.uid, 'starposts');
        const starpostRef = doc(userStarpostColRef, commentRef.id);
        transaction.set(starpostRef, {
          figureId: selectedFigure.id,
          commentId: commentRef.id,
          createdAt: serverTimestamp(),
        });
      });

      const streakResult = await updateStreak({
        firestore,
        figureId: selectedFigure.id,
        figureName: selectedFigure.name,
        userId: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        userPhotoURL: currentUser.photoURL
      });

      if (streakResult?.streakGained) {
        showStreakAnimation(streakResult.newStreakCount, { 
          showPrompt: true,
          figureId: selectedFigure.id,
          figureName: selectedFigure.name
        });
      }

      toast({ title: '¡StarPost publicado!', description: `Has calificado a ${selectedFigure.name}.` });
      form.reset({ text: '', rating: 5, tag: undefined });
      setSelectedFigure(null);

    } catch (error: any) {
      console.error(error);
      toast({ title: 'Error', description: error.message || 'No se pudo publicar el StarPost.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={cn("mb-8 border-primary/20", (theme === 'dark' || theme === 'army') && "bg-black border-primary/40")}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Sparkles className="text-primary h-5 w-5" />
          ¿A quién quieres calificar hoy?
        </CardTitle>
        <CardDescription>Publica un StarPost al instante sin salir del feed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!selectedFigure ? (
          <FigureSearchInput onFigureSelect={setSelectedFigure} className="max-w-full" />
        ) : (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-dashed">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarImage src={selectedFigure.imageUrl} />
                <AvatarFallback>{selectedFigure.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm">{selectedFigure.name}</p>
                <p className="text-xs text-muted-foreground">{selectedFigure.occupation || 'Figura pública'}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedFigure(null)}>
              <XCircle className="h-5 w-5" />
            </Button>
          </div>
        )}

        {selectedFigure && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <StarInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tag"
                  render={({ field }) => (
                    <FormItem>
                      <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-9", !field.value && "text-muted-foreground")}>
                            {selectedTag ? `${selectedTag.emoji} ${selectedTag.label}` : <><Tag className="mr-2 h-4 w-4" /> Etiqueta</>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-2" align="end">
                          <div className="grid grid-cols-2 gap-2">
                            {commentTags.map(tag => (
                              <Button
                                key={tag.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className={cn("justify-start h-9 text-xs", selectedTagId === tag.id && "bg-muted")}
                                onClick={() => {
                                  form.setValue('tag', selectedTagId === tag.id ? undefined : tag.id);
                                  setIsTagPopoverOpen(false);
                                }}
                              >
                                <span className="mr-2">{tag.emoji}</span> {tag.label}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </FormItem>
                  )}
                />
              </div>

              {needsIdentity && (
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nombre de usuario para tu reseña</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: FanReal_99" className="h-9" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder={`¿Qué tienes que decir sobre ${selectedFigure.name}?`}
                        className="resize-none min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Publicar StarPost
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
