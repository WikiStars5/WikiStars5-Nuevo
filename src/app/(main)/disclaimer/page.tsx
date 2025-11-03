
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DisclaimerPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Descargo de Responsabilidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>
            <strong>Naturaleza del Sitio:</strong> WikiStars5 es una plataforma de opinión y entretenimiento. Creemos firmemente en la libertad de expresión y nuestro propósito es permitir que los usuarios expresen y discutan libremente sus percepciones sobre figuras públicas. El contenido de este sitio, incluyendo las calificaciones, votos, y comentarios, representa las opiniones subjetivas de nuestros usuarios y no debe ser interpretado como una declaración de hechos.
          </p>
          <p>
            <strong>Sin Afiliación ni Respaldo:</strong> Este sitio web no está afiliado, asociado, autorizado, respaldado por, ni de ninguna manera conectado oficialmente con ninguna de las figuras públicas mencionadas en él, ni con ninguna de sus subsidiarias o afiliadas.
          </p>
          <p>
            Los nombres, así como cualquier imagen, marca registrada y derecho de autor relacionados, son propiedad de sus respectivos dueños. El uso de estos nombres e imágenes tiene fines de identificación, comentario y crítica, en el marco del derecho a la libertad de expresión.
          </p>
          <p>
            <strong>Contenido Generado por el Usuario:</strong> Todo el contenido generado por los usuarios, como comentarios y votos, es responsabilidad exclusiva de la persona que lo publica. WikiStars5 no se hace responsable de la exactitud, veracidad o legalidad de dicho contenido. Nos reservamos el derecho de moderar o eliminar contenido que viole nuestras políticas, pero no tenemos la obligación de hacerlo.
          </p>
          <p>
            <strong>Sin Fines de Lucro Directo con la Imagen:</strong> La plataforma no utiliza la imagen o el nombre de las figuras públicas para la venta directa de productos o servicios. El propósito es fomentar la discusión y el debate público.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
