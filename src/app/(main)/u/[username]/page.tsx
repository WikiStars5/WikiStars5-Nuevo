
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
  const { firestore } = getSdks();
  const username = decodeURIComponent(params.username);
  const usernameLower = normalizeText(username);

  try {
    // 1. Find the user ID from the username using Admin SDK methods
    const usernameRef = firestore.collection('usernames').doc(usernameLower);
    const usernameDoc = await usernameRef.get();

    if (!usernameDoc.exists) {
      notFound();
    }
    
    const userId = usernameDoc.data()?.userId;

    if (!userId) {
      notFound();
    }

    // 2. Fetch the user's public profile data using Admin SDK
    const userRef = firestore.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        notFound();
    }
    
    const userData = userSnap.data()!;
    
    // 3. Select ONLY the data that is safe to be public
    const publicUserData = {
        id: userSnap.id,
        username: userData.username || 'Usuario',
        country: userData.country || null,
        gender: userData.gender || null,
        description: userData.description || null,
        profilePhotoUrl: userData.profilePhotoUrl || null,
        coverPhotoUrl: userData.coverPhotoUrl || null,
        // CRITICAL: DO NOT pass email or other private fields
    };

    return <PublicProfileClientPage userProfile={publicUserData} />;

  } catch (error) {
    console.error("Error fetching public profile:", error);
    notFound();
  }
}

    