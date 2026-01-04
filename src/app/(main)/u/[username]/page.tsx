
import { getSdks } from '@/firebase/server';
import PublicProfileClientPage from './client-page';
import { notFound } from 'next/navigation';
import { normalizeText } from '@/lib/keywords';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';


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
    
    // First, find the user ID from the username
    const usernameQuery = query(
      collection(firestore, 'usernames'),
      where('__name__', '==', usernameLower),
      limit(1)
    );

    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (usernameSnapshot.empty) {
      notFound(); // If the username doesn't exist, trigger a 404
    }
    
    // Pass the already-decoded and found username to the client component.
    // The client component will handle fetching the full profile based on this.
    // This balances SEO-friendly URLs with client-side data fetching.
    return <PublicProfileClientPage username={username} />;

  } catch (error) {
    console.error("Error on public profile page (server-side check):", error);
    // In case of a server error during the check, we can still attempt to render
    // on the client, or just show a 404. Let's be safe and show 404.
    notFound();
  }
}
