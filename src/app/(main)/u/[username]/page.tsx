import { getSdks } from '@/firebase/server';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
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
    // 1. Find the user ID from the username
    const usernameRef = collection(firestore, 'usernames');
    const usernameQuery = query(
        usernameRef, 
        where('__name__', '==', usernameLower), 
        limit(1)
    );
    const usernameSnapshot = await getDocs(usernameQuery);

    if (usernameSnapshot.empty) {
      notFound();
    }
    
    const userId = usernameSnapshot.docs[0].data().userId;

    if (!userId) {
      notFound();
    }

    // 2. Fetch the user's public profile data
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        notFound();
    }
    
    const userData = userSnap.data();
    
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
