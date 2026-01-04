import { getSdks } from '@/firebase';
import PublicProfileClientPage from './client-page';
import { notFound } from 'next/navigation';
import { normalizeText } from '@/lib/keywords';


interface PublicProfilePageProps {
  params: {
    username: string;
  };
}

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  // This page remains a server component, but we can't use the admin SDK
  // if it's causing build failures. We will pass the username and let the 
  // client page fetch the data. This is a temporary workaround to unblock deployments.
  
  // The logic to fetch user data by username will need to be implemented on the client
  // as the server-side implementation is failing the build.
  const username = decodeURIComponent(params.username);
  
  // For now, we assume the user exists and pass the username to the client component.
  // The client component will handle the actual data fetching.
  // A proper implementation would fetch here and return notFound() if user doesn't exist.

  try {
    // We can't fetch the user here anymore without a working admin SDK setup.
    // We will let the client-page handle it.
    // This is not ideal for SEO but it unblocks the build.
    return <PublicProfileClientPage username={username} />;

  } catch (error) {
    console.error("Error on public profile page:", error);
    notFound();
  }
}
