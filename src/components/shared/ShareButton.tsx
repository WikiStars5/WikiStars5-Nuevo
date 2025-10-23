'use client';

import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2, Link as LinkIcon, Copy } from 'lucide-react';

// Define the type for the props
interface ShareButtonProps {
  figureId: string;
  figureName: string;
}

// A simple SVG for WhatsApp
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M16.75 13.96c.25.5.12 1.04-.25 1.5l-1.25.88c-.62.38-1.5.25-2.12-.38-.88-.88-1.63-1.88-2.25-2.88-.62-1-1.12-2.12-1.38-3.25-.12-.62.12-1.25.62-1.62l1-1.12c.5-.5 1.25-.62 1.75-.25l1.38 1c.5.38.62 1.12.25 1.62l-.5 1.12-1.25 1.5.5 1.12 1.38 1.12.5-1zM12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"></path>
  </svg>
);

// A simple SVG for Facebook
const FacebookIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3v9h4v-9z"></path>
    </svg>
);

// A simple SVG for Twitter/X
const XIcon = () => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
);


export default function ShareButton({ figureId, figureName }: ShareButtonProps) {
  const { toast } = useToast();
  const [isWebShareSupported, setIsWebShareSupported] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    // Check for Web Share API support on the client
    if (navigator.share) {
      setIsWebShareSupported(true);
    }
    // Construct the full URL on the client
    setShareUrl(`${window.location.origin}/figures/${figureId}`);
  }, [figureId]);

  const handleNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `¡Mira a ${figureName} en WikiStars5!`,
        text: `¡Echa un vistazo al perfil, opiniones y calificaciones de ${figureName} en WikiStars5!`,
        url: shareUrl,
      });
    } catch (error: any) {
      // Ignore abort errors which happen when the user cancels the share sheet
      if (error.name === 'AbortError') {
        return;
      }
      console.error('Error sharing natively', error);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: '¡Enlace Copiado!',
        description: 'El enlace al perfil ha sido copiado a tu portapapeles.',
      });
    });
  };

  // Social share URLs
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`¡Mira a ${figureName} en WikiStars5!`);
  
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedText}`;


  if (isWebShareSupported) {
    return (
      <Button variant="ghost" size="icon" onClick={handleNativeShare}>
        <Share2 className="h-5 w-5 text-muted-foreground" />
        <span className="sr-only">Compartir</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">Compartir</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={copyToClipboard}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copiar Enlace</span>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer">
            <XIcon /> <span className="ml-2">Compartir en X</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer">
            <FacebookIcon /> <span className="ml-2">Compartir en Facebook</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={whatsappShareUrl} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> <span className="ml-2">Compartir en WhatsApp</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={telegramShareUrl} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" className="mr-2"><path d="M9.78 18.65l.28-4.23l7.02-6.64c.38-.34.22-.99-.33-1.15l-11.59-3.3c-.56-.16-1.13.29-1.02.88l1.84 9.38c.11.54.6.93 1.15.93l3.66.01z"></path></svg>
            <span>Compartir en Telegram</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
