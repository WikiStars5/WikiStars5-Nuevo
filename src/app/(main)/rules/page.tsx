
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

const rules = [
    "Sé respetuoso. No se tolerarán ataques personales, acoso, discurso de odio ni amenazas.",
    "Mantén el debate centrado en la figura pública. Las discusiones deben ser sobre sus acciones, carrera y percepción pública, no sobre otros usuarios.",
    "No publiques información privada (doxing) de ninguna persona, ya sea una figura pública o un usuario.",
    "Evita el spam y la autopromoción. Los comentarios deben aportar valor a la discusión.",
    "No manipules las votaciones. No se permite el uso de bots, scripts o múltiples cuentas para alterar los resultados.",
    "El contenido sexualmente explícito, violento o ilegal está estrictamente prohibido.",
    "Respeta los derechos de autor. No publiques contenido que no te pertenezca sin la debida atribución.",
];

export default function RulesPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Reglas de la Comunidad</CardTitle>
          <p className="text-muted-foreground pt-2">Para mantener un ambiente constructivo y respetuoso, todos los miembros deben seguir estas reglas.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            {rules.map((rule, index) => (
                <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <span>{rule}</span>
                </li>
            ))}
          </ul>
           <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                    El incumplimiento de estas reglas puede resultar en la eliminación de comentarios, la suspensión temporal o la expulsión permanente de la plataforma. Nos reservamos el derecho de moderar el contenido para garantizar la seguridad y el bienestar de nuestra comunidad.
                </p>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
