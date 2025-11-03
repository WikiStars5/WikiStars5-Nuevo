
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline">Política de Privacidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Introducción</h2>
            <p>
              Bienvenido a WikiStars5. Tu privacidad es de suma importancia para nosotros. Esta Política de Privacidad explica qué datos recopilamos, por qué los recopilamos y cómo puedes ver y gestionar tu información.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Qué Información Recopilamos</h2>
            <div className="space-y-3">
              <p>Recopilamos información para proporcionar y mejorar nuestros servicios. Esto incluye:</p>
              <ul className="list-disc list-inside space-y-2 pl-4">
                <li>
                  <strong>Información que nos proporcionas:</strong> Al registrarte con Google, nos proporcionas tu nombre, dirección de correo electrónico y foto de perfil. También puedes añadir voluntariamente en tu perfil un nombre de usuario, país, sexo y una breve descripción.
                </li>
                <li>
                  <strong>Contenido que generas:</strong> Recopilamos el contenido que creas en nuestra plataforma, como los comentarios que publicas, los votos de actitud y emoción que emites y las rachas que generas. Esta información es pública por naturaleza.
                </li>
                <li>
                  <strong>Información de Actividad:</strong> Recopilamos información sobre tu actividad en nuestro servicio, como tu estado en línea (online/offline), para mejorar la experiencia de la comunidad.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Por Qué Recopilamos Datos</h2>
            <p>
              Utilizamos la información que recopilamos para los siguientes propósitos:
            </p>
             <ul className="list-disc list-inside space-y-2 pl-4 mt-3">
                <li>
                  <strong>Proporcionar nuestros servicios:</strong> Para operar las funciones principales de WikiStars5, como mostrar tu perfil público, tus comentarios, votos y rachas.
                </li>
                <li>
                  <strong>Mantener y mejorar nuestros servicios:</strong> Para entender cómo se utiliza nuestra plataforma y poder mejorarla.
                </li>
                <li>
                  <strong>Comunicarnos contigo:</strong> Para enviarte notificaciones importantes, como respuestas a tus comentarios.
                </li>
                 <li>
                  <strong>Proteger nuestra plataforma y a nuestros usuarios:</strong> Usamos la información para ayudar a mejorar la seguridad y fiabilidad de nuestros servicios.
                </li>
              </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Compartir tu Información</h2>
             <div className="space-y-3">
                <p>
                    No compartimos tu información personal con empresas, organizaciones o individuos fuera de WikiStars5, excepto en los siguientes casos:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                    <li>
                    <strong>Contenido público:</strong> Tu nombre de usuario, tu foto de perfil (si la tienes) y todo el contenido que generas (comentarios, votos, etc.) son visibles públicamente para otros usuarios de la plataforma.
                    </li>
                    <li>
                    <strong>Proveedores de servicios:</strong> Utilizamos Google Firebase para la autenticación, base de datos y alojamiento. Google tiene sus propias políticas de privacidad que rigen cómo procesan los datos.
                    </li>
                    <li>
                    <strong>Por razones legales:</strong> Compartiremos información personal si creemos de buena fe que el acceso, uso, preservación o divulgación de la información es razonablemente necesario para cumplir con la ley aplicable, regulación, proceso legal o solicitud gubernamental exigible.
                    </li>
                </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Tus Controles de Privacidad</h2>
            <p>
              Tienes control sobre la información que proporcionas y tu actividad. Desde tu página de perfil, puedes:
            </p>
             <ul className="list-disc list-inside space-y-2 pl-4 mt-3">
                <li>
                  Ver y editar la información de tu perfil, como tu nombre de usuario, país, sexo y descripción.
                </li>
                <li>
                  Ver un resumen de tu actividad, incluyendo tus votos y rachas.
                </li>
              </ul>
              <p>Si deseas eliminar tu cuenta y toda la información asociada, por favor, contáctanos.</p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
