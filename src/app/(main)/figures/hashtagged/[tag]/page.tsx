import HashtagClientPage from './client-page';

export const dynamic = 'force-dynamic';

// This is now a Server Component. It can be async.
export default async function HashtagPage({ params }: { params: { tag: string } }) {
  // It safely accesses the param and passes it down to the Client Component.
  const tag = decodeURIComponent(params.tag);
  
  return <HashtagClientPage tag={tag} />;
}
