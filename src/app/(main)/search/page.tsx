import SearchResultsClient from './client-page';

export const dynamic = 'force-dynamic';

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const query = searchParams?.q ?? '';

  // We are decoding here on the server to pass a clean string to the client.
  const decodedQuery = Array.isArray(query) ? decodeURIComponent(query[0] || '') : decodeURIComponent(query);
  
  return <SearchResultsClient query={decodedQuery} />;
}
