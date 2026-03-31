'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

/**
 * Error boundary component for the (main) route group.
 * Handles runtime errors and specifically ChunkLoadErrors.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to the console for debugging
    console.error('Runtime Error:', error);
  }, [error]);

  const isChunkError = error.name === 'ChunkLoadError' || error.message.includes('Loading chunk');

  return (
    <div className="container mx-auto flex min-h-[400px] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 rounded-full bg-destructive/10 p-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
      </div>
      
      <h2 className="mb-3 text-2xl font-bold font-headline">
        {isChunkError ? 'Error de Sincronización' : 'Algo no salió como esperábamos'}
      </h2>
      
      <p className="mb-8 max-w-md text-muted-foreground leading-relaxed">
        {isChunkError 
          ? 'Hubo un problema al cargar una parte de la aplicación. Esto suele suceder por una conexión inestable o una actualización reciente.'
          : 'Ocurrió un error inesperado al cargar esta sección. No te preocupes, tus datos están seguros.'}
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs sm:max-w-none justify-center">
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline"
          className="rounded-full"
        >
          Refrescar Página
        </Button>
        <Button 
          onClick={() => reset()}
          className="rounded-full"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Intentar de nuevo
        </Button>
      </div>
      
      <p className="mt-8 text-[10px] text-muted-foreground uppercase tracking-widest font-mono">
        Digest: {error.digest || 'N/A'}
      </p>
    </div>
  );
}
