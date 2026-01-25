
"use client";

import { useState, useEffect, useContext } from 'react';
import { doc, updateDoc, increment } from "firebase/firestore";
import { useFirestore, useUser, useAuth, signInAnonymously } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Share2, Link as LinkIcon, Facebook, Twitter, Linkedin, MessageCircle, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateStreak } from '@/firebase/streaks';
import { StreakAnimationContext } from '@/context/StreakAnimationContext';
import type { Figure } from '@/lib/types';


// Simple inline SVG component for Reddit Icon
const RedditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props} // Allows passing className, size, etc.
  >
    <title>Reddit</title>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-.5-5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5zm-3 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5zm-1.79-4.71L10.5 6h3l3.79 3.79c.2.2.2.51 0 .71l-1.06 1.06c-.2.2-.51.2-.71 0L14.41 10H9.59l-1.12 1.56c-.2.2-.51.2-.71 0l-1.06-1.06c-.2-.2-.2-.51 0-.71z" fill="currentColor"/>
  </svg>
);


interface ShareButtonProps {
  figureName: string;
  figureId: string;
  showText?: boolean;
  isGoatShare?: boolean;
  goatVote?: 'messi' | 'ronaldo';
  isRatingShare?: boolean;
  rating?: number;
  isAttitudeShare?: boolean;
  attitude?: string;
  isEmotionShare?: boolean;
  emotion?: string;
  className?: string;
}

interface SocialShareOption {
  name: string;
  icon: React.ElementType;
  url: string;
  isMailto?: boolean;
}

export function ShareButton({ 
    figureName,
    figureId,
    showText = true,
    isGoatShare = false,
    goatVote,
    isRatingShare = false,
    rating,
    isAttitudeShare = false,
    attitude,
    isEmotionShare = false,
    emotion,
    className,
}: ShareButtonProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { showStreakAnimation } = useContext(StreakAnimationContext);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isWebShareSupported, setIsWebShareSupported] = useState(false);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      let url = new URL(`${window.location.origin}/figures/${figureId}`);
      if (isGoatShare && goatVote) {
        url.searchParams.set('tab', 'goat');
        url.searchParams.set('vote', goatVote);
      }
      if (isEmotionShare && emotion) {
        url.searchParams.set('shareType', 'emotion');
        url.searchParams.set('emotion', emotion);
      }
      if (isAttitudeShare && attitude) {
        url.searchParams.set('shareType', 'attitude');
        url.searchParams.set('attitude', attitude);
      }
      if (isRatingShare && rating !== undefined) {
        url.searchParams.set('shareType', 'rating');
        url.searchParams.set('rating', String(rating));
      }
      setCurrentUrl(url.toString());

      if (navigator.share) {
        setIsWebShareSupported(true);
      }
    }
  }, [figureId, isGoatShare, goatVote, isEmotionShare, emotion, isAttitudeShare, attitude, isRatingShare, rating]);

  const buttonSize = showText ? "default" : "icon";
  
  const getShareCategory = (): keyof Figure['shareCounts'] | 'profile' => {
      if (isGoatShare) return 'goat';
      if (isAttitudeShare) return 'attitude';
      if (isEmotionShare) return 'emotion';
      if (isRatingShare) return 'rating';
      return 'profile';
  }

  const handleShareAction = async () => {
    if (!firestore || !auth) return;

    // Increment public share count on the figure
    const category = getShareCategory();
    const figureRef = doc(firestore, "figures", figureId);
    try {
        await updateDoc(figureRef, {
            [`shareCounts.${category}`]: increment(1)
        });
    } catch (error) {
        console.error("Failed to increment share count:", error);
    }
    
    // Check for user and update streak
    let currentUser = user;
    if (!currentUser) {
        try {
            const userCredential = await signInAnonymously(auth);
            currentUser = userCredential.user;
        } catch (error) {
            console.error("Failed to sign in anonymously for streak tracking:", error);
            return; // Exit if we can't get a user
        }
    }
    
    if (currentUser) {
        try {
            const streakResult = await updateStreak({
                firestore,
                figureId,
                figureName,
                userId: currentUser.uid,
                isAnonymous: currentUser.isAnonymous,
            });

            if (streakResult?.streakGained) {
                showStreakAnimation(streakResult.newStreakCount, { showPrompt: true });
            }
        } catch (error) {
            console.error("Failed to update streak on share:", error);
        }
    }
  };


  if (!currentUrl) {
    return (
      <Button variant="outline" size={buttonSize} aria-label="Cargando opciones para compartir" disabled>
        <Share2 className="h-5 w-5" />
        {showText && <span className="ml-2">Compartir</span>}
      </Button>
    );
  }

  const getShareText = () => {
    if (isEmotionShare && emotion) {
        const emotionText = emotion.charAt(0).toUpperCase() + emotion.slice(1);
        return `${figureName} me genera ${emotionText}. ¿Y a ti?`;
    }
    if (isAttitudeShare && attitude) {
      const attitudeText = attitude.charAt(0).toUpperCase() + attitude.slice(1);
      return `Soy ${attitudeText} de ${figureName}. Y ahora quiero saber tu actitud hacia él/ella, ¡vota ahora!`;
    }
    if (isRatingShare && rating !== undefined) {
      return `¡Califiqué a ${figureName} con ${rating} ${rating > 1 ? 'estrellas' : 'estrella'}! Ahora te reto a dar tu calificación.`;
    }
    if (isGoatShare) {
      if (goatVote) {
        const votedFor = goatVote === 'messi' ? 'Messi' : 'Cristiano Ronaldo';
        return `¡Ya voté por ${votedFor} en la Batalla del GOAT! Demostré mi lealtad, ahora te toca a ti.`;
      }
      return `Batalla del GOAT: Messi vs Ronaldo. Vota y decide.`;
    }
    return `¡Únete a la conversación sobre ${figureName} en WikiStars5! Vota, comenta y mira lo que otros piensan.`;
  };

  const getShareTitle = () => {
    if (isEmotionShare) {
        return `Mi Emoción sobre ${figureName} en WikiStars5`;
    }
    if (isAttitudeShare) {
        return `Mi Actitud hacia ${figureName} en WikiStars5`;
    }
    if (isRatingShare) {
      return `Mi calificación para ${figureName} en WikiStars5`;
    }
    if (isGoatShare) {
      return `Batalla del GOAT: Messi vs Ronaldo`;
    }
    return `¡Echa un vistazo a ${figureName} en WikiStars5!`;
  };


  const handleNativeShare = async () => {
    await handleShareAction();
    if (navigator.share) {
      try {
        await navigator.share({
          title: getShareTitle(),
          text: getShareText(),
          url: currentUrl,
        });
      } catch (error) {
        console.log("Web Share API was cancelled or failed:", error);
      }
    }
  };

  if (isWebShareSupported) {
    return (
      <Button
        variant="ghost"
        size={buttonSize}
        onClick={handleNativeShare}
        aria-label={`Compartir perfil de ${figureName}`}
        className={className || (showText ? '' : 'h-8 w-8')}
      >
        <Share2 className="h-4 w-4" />
        {showText && <span className="ml-2">Compartir</span>}
      </Button>
    );
  }

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(getShareText());
  const emailSubject = encodeURIComponent(getShareTitle());
  const emailBody = encodeURIComponent(`${getShareText()}\n\n`);


  const socialOptions: SocialShareOption[] = [
    {
      name: "Copiar Enlace",
      icon: LinkIcon,
      url: "#copy",
    },
    {
      name: "Facebook",
      icon: Facebook,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Twitter (X)",
      icon: Twitter,
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "WhatsApp",
      icon: MessageCircle,
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Reddit",
      icon: RedditIcon,
      url: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
    {
      name: "Correo Electrónico",
      icon: Mail,
      url: `mailto:?subject=${emailSubject}&body=${emailBody}${encodedUrl}`,
      isMailto: true,
    },
  ];

  const handleShareOptionClick = async (option: SocialShareOption) => {
    await handleShareAction();
    if (option.url === "#copy") {
      try {
        await navigator.clipboard.writeText(currentUrl);
        toast({ title: "¡Enlace Copiado!", description: "Enlace copiado al portapapeles." });
      } catch (error) {
        console.error("Error copying to clipboard:", error);
        toast({ title: "No se pudo copiar el enlace", variant: "destructive" });
      }
    } else if (option.isMailto) {
        window.location.href = option.url;
    }
    else {
      window.open(option.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={buttonSize} aria-label={`Compartir perfil de ${figureName}`} className={className || (!showText ? 'h-8 w-8' : '')}>
          <Share2 className="h-4 w-4" />
          {showText && <span className="ml-2">Compartir</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Compartir</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {socialOptions.map((option) => (
          <DropdownMenuItem key={option.name} onClick={() => handleShareOptionClick(option)} className="cursor-pointer">
            <option.icon className="mr-2 h-4 w-4" />
            <span>{option.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
