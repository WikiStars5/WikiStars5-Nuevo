
import { getSdks } from '@/firebase/server';
import PublicProfileClientPage from './client-page';
import { notFound } from 'next/navigation';
import { normalizeText } from '@/lib/keywords';

interface PublicProfilePageProps {
  params: {
    username: string;
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const username = decodeURIComponent(params.username);
  
  try {
    const { firestore } = getSdks();
    const usernameLower = normalizeText(username);
    
    // Usar sintaxis correcta de Admin SDK para buscar por ID de documento (nombre de usuario)
    const usernameDoc = await firestore.collection('usernames').doc(usernameLower).get();
    
    if (!usernameDoc.exists) {
      notFound();
    }
    
    return <PublicProfileClientPage username={username} />;

  } catch (error) {
    console.error("Error on public profile page (server-side check):", error);
    notFound();
  }
}
