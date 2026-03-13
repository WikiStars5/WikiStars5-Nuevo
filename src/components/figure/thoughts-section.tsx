'use client';

import { useState, useContext, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, runTransaction, query, orderBy, getDocs, limit, onSnapshot } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { useAuth, useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Instagram, Image as ImageIcon, Trash2, Cloud, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import { useLanguage } from '@/context/LanguageContext';
import { cn, formatDateDistance } from '@/lib/utils';
import Image from 'next/image';
import { useTheme } from 'next-themes';

const createThoughtSchema = z.object({
  text: z.string().min(1, 'El pensamiento no puede estar vacío.').max(250, 'Máximo 250 caracteres.'),
});

type ThoughtFormValues = z.infer<typeof createThoughtSchema>;

interface Thought {
    id: string;
    userId: string;
    text: string;
    instagramImageUrl?: string | null;
    createdAt: any;
    userDisplayName: string;
    userPhotoURL: string | null;
}

export default function ThoughtsSection({ figureId, figureName }: { figureId: string, figureName: string }) {
  const { user, reloadUser } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const { showStreakAnimation } = useContext(StreakAnimationContext);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [instaUrl, setInstaUrl] = useState('');
  const [instaImageUrl, setInstaImageUrl] = useState<string | null>(null);
  const [isFetchingInsta, setIsFetchingInsta] = useState(false);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [isLoadingThoughts, setIsLoadingLoading] = useState(true);

  const form = useForm<ThoughtFormValues>({
    resolver: zodResolver(createThoughtSchema),
    defaultValues: { text: '' },
  });

  const textValue = form.watch('text', '');

  // Fetch thoughts
  useEffect(() => {
    if (!firestore || !figureId) return;
    const q = query(
      collection(firestore, 'figures', figureId, 'thoughts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setThoughts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Thought)));
      setIsLoadingLoading(false);
    });
    return () => unsubscribe();
  }, [firestore, figureId]);

  const handleFetchInstaImage = async () => {
    if (!instaUrl.trim()) return;
    const match = instaUrl.match(/\/p\/([a-zA-Z0-9_-]+)/) || instaUrl.match(/\/reel\/([a-zA-Z0-9_-]+)/);
    if (!match) {
        toast({ title: "Enlace inválido", description: "Enlace de Instagram no reconocido.", variant: "destructive" });
        return;
    }
    setIsFetchingInsta(true);
    try {
        const postId = match[1];
        const cleanUrl = `https://www.instagram.com/p/${postId}/media/?size=l`;
        const proxiedUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
        const imgTester = new window.Image();
        imgTester.onload = () => {
            setInstaImageUrl(proxiedUrl);
            setIsFetchingInsta(false);
            setInstaUrl('');
        };
        imgTester.onerror = () => {
            setIsFetchingInsta(false);
            toast({ title: "Error", description: "No se pudo obtener la imagen.", variant: "destructive" });
        };
        imgTester.src = proxiedUrl;
    } catch (e) {
        setIsFetchingInsta(false);
        toast({ title: "Error", description: "Error inesperado.", variant: "destructive" });
    }
  };

  const handleSubmit = async (data: ThoughtFormValues) => {
    if (!firestore) return;
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

    if (!currentUser) {
        setIsSubmitting(false);
        return;
    }

    try {
        const thoughtRef = doc(collection(firestore, 'figures', figureId, 'thoughts'));
        const userRef = doc(firestore, 'users', currentUser.uid);
        const userSnap = await getDocs(query(collection(firestore, 'users'), where('__name__', '==', currentUser.uid), limit(1)));
        const userData = userSnap.empty ? {} : userSnap.docs[0].data();

        const payload = {
            userId: currentUser.uid,
            text: data.text,
            instagramImageUrl: instaImageUrl,
            createdAt: serverTimestamp(),
            userDisplayName: userData.username || currentUser.displayName || `Invitado_${currentUser.uid.substring(0,4)}`,
            userPhotoURL: userData.profilePhotoUrl || currentUser.photoURL || null,
        };

        await runTransaction(firestore, async (transaction) => {
            transaction.set(thoughtRef, payload);
        });

        const streakResult = await updateStreak({
            firestore, figureId, figureName,
            userId: currentUser.uid, isAnonymous: currentUser.isAnonymous,
            userPhotoURL: currentUser.photoURL
        });

        if (streakResult?.streakGained) {
            showStreakAnimation(streakResult.newStreakCount, { showPrompt: true, figureId, figureName });
        }

        toast({ title: '¡Pensamiento publicado!' });
        form.reset();
        setInstaImageUrl(null);
    } catch (error: any) {
        console.error(error);
        toast({ title: 'Error al publicar', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className={cn((theme === 'dark' || theme === 'army') && 'bg-black')}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="text-primary h-5 w-5" />
            ¿Qué estás pensando?
          </CardTitle>
          <CardDescription>Comparte tus pensamientos rápidos sobre {figureName}.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="text"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Escribe aquí tu pensamiento..."
                        className="resize-none min-h-[100px]"
                        maxLength={250}
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center pt-1">
                        <FormMessage />
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", textValue.length > 200 ? "text-orange-500" : "text-muted-foreground")}>
                            {textValue.length} / 250
                        </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    Imagen de Instagram (opcional)
                </FormLabel>
                {instaImageUrl ? (
                    <div className="relative group w-full max-w-[200px] h-[200px] rounded-xl overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                        <Image src={instaImageUrl} alt="Preview" fill className="object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button type="button" variant="destructive" size="sm" onClick={() => setInstaImageUrl(null)}>Quitar</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Input value={instaUrl} onChange={(e) => setInstaUrl(e.target.value)} placeholder="Link de Instagram..." className="h-9 text-sm" />
                        <Button type="button" variant="secondary" size="sm" disabled={isFetchingInsta || !instaUrl.trim()} onClick={handleFetchInstaImage}>
                            {isFetchingInsta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver"}
                        </Button>
                    </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting} className="rounded-full px-6">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Publicar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoadingThoughts ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : thoughts.length > 0 ? (
            thoughts.map((t) => (
                <Card key={t.id} className={cn("overflow-hidden border-border/40", (theme === 'dark' || theme === 'army') && 'bg-black')}>
                    <CardContent className="p-4 flex gap-4">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={t.userPhotoURL || undefined} />
                            <AvatarFallback>{t.userDisplayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-bold text-sm">{t.userDisplayName}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{formatDateDistance(t.createdAt?.toDate() || new Date(), language)}</span>
                            </div>
                            <p className="text-sm text-foreground/90 whitespace-pre-wrap">{t.text}</p>
                            {t.instagramImageUrl && (
                                <div className="relative w-full max-h-[400px] aspect-square rounded-xl overflow-hidden border mt-3 bg-muted/30">
                                    <Image src={t.instagramImageUrl} alt="Thought image" fill className="object-contain" />
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))
        ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/20 mb-2" />
                <p className="text-muted-foreground text-sm font-medium">No hay pensamientos todavía.</p>
                <p className="text-xs text-muted-foreground/60">¡Sé el primero en compartir qué piensas!</p>
            </div>
        )}
      </div>
    </div>
  );
}