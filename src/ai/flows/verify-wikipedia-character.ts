'use server';
/**
 * @fileOverview A flow to verify if a character exists on Wikipedia.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Jaro-Winkler distance function for string similarity
function jaroWinkler(s1: string, s2: string): number {
  let m = 0;
  if (s1.length === 0 || s2.length === 0) {
    return 0;
  }
  if (s1 === s2) {
    return 1;
  }
  const range = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - range);
    const end = Math.min(i + range + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      m++;
      break;
    }
  }
  if (m === 0) {
    return 0;
  }
  let t = 0;
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) {
      k++;
    }
    if (s1[i] !== s2[k]) {
      t++;
    }
    k++;
  }
  t /= 2;
  const jaro = (m / s1.length + m / s2.length + (m - t) / m) / 3;
  let p = 0;
  const l = Math.min(4, Math.min(s1.length, s2.length));
  for (let i = 0; i < l; i++) {
    if (s1[i] === s2[i]) {
      p++;
    }
  }
  return jaro + p * 0.1 * (1 - jaro);
}

async function fetchFromWikipedia(params: Record<string, string>) {
  const url = new URL('https://es.wikipedia.org/w/api.php');
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  url.searchParams.append('format', 'json');
  url.searchParams.append('origin', '*'); // Required for CORS
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Wikipedia API request failed: ${response.statusText}`);
  }
  return response.json();
}

const VerifyWikipediaCharacterInputSchema = z.object({
  name: z.string().describe('The name of the character to verify.'),
});
export type VerifyWikipediaCharacterInput = z.infer<typeof VerifyWikipediaCharacterInputSchema>;

const VerifyWikipediaCharacterOutputSchema = z.object({
  found: z.boolean().describe('Whether the character was found.'),
  title: z.string().nullable().describe('The exact title of the Wikipedia page.'),
  imageUrl: z.string().nullable().describe('The URL of the main image for the character.'),
  verificationError: z.string().nullable().describe('The reason for verification failure.'),
  source: z.literal('Wikipedia').describe('The source of the verification.'),
});
export type VerifyWikipediaCharacterOutput = z.infer<typeof VerifyWikipediaCharacterOutputSchema>;

export async function verifyWikipediaCharacter(
  input: VerifyWikipediaCharacterInput
): Promise<VerifyWikipediaCharacterOutput> {
  return verifyWikipediaCharacterFlow(input);
}

const verifyWikipediaCharacterFlow = ai.defineFlow(
  {
    name: 'verifyWikipediaCharacterFlow',
    inputSchema: VerifyWikipediaCharacterInputSchema,
    outputSchema: VerifyWikipediaCharacterOutputSchema,
  },
  async ({ name }) => {
    try {
      // 1. Search for the character to get the exact page title
      const searchData = await fetchFromWikipedia({
        action: 'query',
        list: 'search',
        srsearch: name,
        srlimit: '1',
      });

      if (!searchData.query?.search?.[0]) {
        return {
          found: false,
          title: null,
          imageUrl: null,
          verificationError: 'No se encontraron resultados en Wikipedia para este nombre.',
          source: 'Wikipedia',
        };
      }
      const pageTitle = searchData.query.search[0].title;
      const similarity = jaroWinkler(name.toLowerCase(), pageTitle.toLowerCase());

      if (similarity < 0.7) {
        return {
          found: false,
          title: null,
          imageUrl: null,
          verificationError: `El resultado más cercano ("${pageTitle}") no es lo suficientemente similar.`,
          source: 'Wikipedia',
        };
      }

      // 2. Get the wikitext of the page to check for infobox
      const pageContentData = await fetchFromWikipedia({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        titles: pageTitle,
        rvslots: 'main',
      });

      const pages = pageContentData.query?.pages;
      const page = pages?.[Object.keys(pages)[0]];
      const wikitext = page?.revisions?.[0]?.slots?.main?.['*'];

      if (!wikitext) {
        return {
          found: false,
          title: pageTitle,
          imageUrl: null,
          verificationError: 'No se pudo obtener el contenido de la página de Wikipedia.',
          source: 'Wikipedia',
        };
      }

      const hasInfobox = /{{\s*(ficha de persona|infobox)/i.test(wikitext);
      if (!hasInfobox) {
        return {
          found: false,
          title: pageTitle,
          imageUrl: null,
          verificationError:
            'El artículo de Wikipedia no contiene un cuadro de información (infobox) de persona.',
          source: 'Wikipedia',
        };
      }

      const hasCharacterData =
        /\|\s*nombre\s*=|\|\s*nacimiento\s*=|\|\s*información personal\s*=/i.test(wikitext);
      if (!hasCharacterData) {
        return {
          found: false,
          title: pageTitle,
          imageUrl: null,
          verificationError: 'El cuadro de información no parece contener datos de un personaje.',
          source: 'Wikipedia',
        };
      }

      // 3. Get the main image URL
      const imageData = await fetchFromWikipedia({
        action: 'query',
        prop: 'pageimages',
        titles: pageTitle,
        pithumbsize: '400', // Get a reasonably sized thumbnail
      });

      const imagePages = imageData.query?.pages;
      const imagePage = imagePages?.[Object.keys(imagePages)[0]];
      const imageUrl = imagePage?.thumbnail?.source || null;

      return {
        found: true,
        title: pageTitle,
        imageUrl: imageUrl,
        verificationError: null,
        source: 'Wikipedia',
      };
    } catch (error: any) {
      console.error('Error in verifyWikipediaCharacterFlow:', error);
      return {
        found: false,
        title: null,
        imageUrl: null,
        verificationError: error.message || 'Error inesperado del servidor.',
        source: 'Wikipedia',
      };
    }
  }
);
