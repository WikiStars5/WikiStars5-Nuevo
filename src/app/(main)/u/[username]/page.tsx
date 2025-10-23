
import { getSdks } from '@/firebase/server';
import PublicProfileClientPage from './client-page';
import { notFound } from 'next/navigation';
import { normalizeText } from '@/lib/keywords';
import { doc, getDoc } from 'firebase/firestore';


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
    const usernameRef = firestore.collection('usernames');
    const usernameQuery = usernameRef.where('__name__', '==', usernameLower).limit(1);
    const usernameSnapshot = await usernameQuery.get();

    if (usernameSnapshot.empty) {
      notFound();
    }
    
    const userId = usernameSnapshot.docs[0].data().userId;

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
        // CRITICAL: DO NOT pass email or other private fields
    };

    return <PublicProfileClientPage userProfile={publicUserData} />;

  } catch (error) {
    console.error("Error fetching public profile:", error);
    notFound();
  }
}
