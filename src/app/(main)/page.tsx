'use client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Lightbulb,
  MessageSquare,
  Share2,
  Users,
} from 'lucide-react';
import SearchBar from '@/components/shared/search-bar';

const features = [
  {
    icon: Lightbulb,
    title: 'Descubre Figuras',
    description:
      'Busca o navega a través de perfiles de figuras públicas de diversos campos.',
  },
  {
    icon: Users,
    title: 'Expresa tu Percepción',
    description:
      'Vota por la emoción que te provoca una figura y mira los resultados globales.',
  },
  {
    icon: MessageSquare,
    title: 'Únete a las Discusiones',
    description:
      'Comparte tus opiniones en las secciones de comentarios y reacciona a los demás.',
  },
  {
    icon: Share2,
    title: 'Comparte Perfiles',
    description:
      'Comparte fácilmente perfiles con tus amigos en redes sociales.',
  },
];

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <section className="text-center mb-16 md:mb-24">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 font-headline">
          Bienvenido a <span className="text-primary">WikiStars5</span>
        </h1>
        <div className="mt-8">
          <SearchBar className="max-w-lg mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">
            Escribe un nombre y presiona enter o haz clic en buscar.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold tracking-tight mb-8 font-headline text-center">
          Cómo Funciona WikiStars5
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-card/80 border-border/60 text-center">
              <CardHeader>
                <div className="mx-auto bg-card p-3 rounded-full w-fit">
                    <feature.icon className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-start gap-2">
                <CardTitle className='text-lg'>{feature.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
