'use client';
/**
 * @fileOverview A client-side function to verify a character on a specific Fandom.com wiki and extract their main image.
 */

import { z } from 'zod';

const FandomVerificationInputSchema = z.object({
  name: z.string().describe('The name of the character to verify.'),
  fandomDomain: z.string().url().describe('The base URL of the Fandom wiki (e.g., https://onepiece.fandom.com).'),
});
export type FandomVerificationInput = z.infer<typeof FandomVerificationInputSchema>;

const FandomVerificationOutputSchema = z.object({
  found: z.boolean().describe('Whether a Fandom page was found for the character.'),
  title: z.string().nullable().describe('The exact title of the Fandom page found.'),
  imageUrl: z.string().nullable().describe('The URL of the main image from the Fandom page, if found.'),
  verificationError: z.string().nullable().describe('Reason why verification failed.'),
  source: z.literal('Fandom').describe('The source of the verification.'),
});
export type FandomVerificationOutput = z.infer<typeof FandomVerificationOutputSchema>;


async function callFandomApi(domain: string, params: Record<string, string>): Promise<any> {
    const endpoint = `${domain}/api.php`;
    const url = new URL(endpoint);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('format', 'json');
    url.searchParams.append('origin', '*'); // CORS

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`Fandom API responded with status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error calling Fandom API:", error);
        throw new Error("Could not connect to Fandom API.");
    }
}


export async function verifyFandomCharacter(
  input: FandomVerificationInput
): Promise<FandomVerificationOutput> {
  try {
    // 1. Search for the page to get the exact title
    const searchResult = await callFandomApi(input.fandomDomain, {
      action: 'query',
      list: 'search',
      srsearch: input.name,
      srlimit: '1',
      srprop: '',
    });

    if (!searchResult.query || !searchResult.query.search.length) {
      return { found: false, title: null, imageUrl: null, verificationError: `No se encontró ninguna página para "${input.name}" en este wiki de Fandom.`, source: 'Fandom' };
    }

    const pageTitle = searchResult.query.search[0].title;
    
    // 2. Fetch the main image from the page
    const imageResult = await callFandomApi(input.fandomDomain, {
        action: 'query',
        titles: pageTitle,
        prop: 'pageimages',
        pithumbsize: '500',
        piprop: 'thumbnail|original'
    });
    
    const pages = imageResult.query.pages;
    const pageId = Object.keys(pages)[0];

    if (pageId === '-1') {
       return { found: false, title: pageTitle, imageUrl: null, verificationError: 'La página encontrada no existe o fue eliminada.', source: 'Fandom' };
    }

    const page = pages[pageId];

    let imageUrl: string | null = null;
    if (page.thumbnail) {
      imageUrl = page.original ? page.original.source : page.thumbnail.source;
    }
    
    // 3. Fetch image from parsed HTML as a fallback (more reliable for infoboxes)
    if (!imageUrl) {
        const parseResult = await callFandomApi(input.fandomDomain, {
            action: 'parse',
            page: pageTitle,
            prop: 'images',
        });
        if (parseResult.parse && parseResult.parse.images.length > 0) {
            // This gets all images, we need a better way to find the main one.
            // Often the infobox image is one of the first.
            const firstImageFile = parseResult.parse.images[0];
             const firstImageInfo = await callFandomApi(input.fandomDomain, {
                action: 'query',
                titles: `File:${firstImageFile}`,
                prop: 'imageinfo',
                iiprop: 'url'
            });
            const imagePages = firstImageInfo.query.pages;
            const imagePageId = Object.keys(imagePages)[0];
            if (imagePageId !== '-1' && imagePages[imagePageId].imageinfo) {
                 imageUrl = imagePages[imagePageId].imageinfo[0].url;
            }
        }
    }


    return {
      found: true,
      title: pageTitle,
      imageUrl: imageUrl,
      verificationError: null,
      source: 'Fandom'
    };

  } catch (error: any) {
    console.error(`Fandom character verification failed for name "${input.name}":`, error);
    return {
      found: false,
      title: null,
      imageUrl: null,
      verificationError: error.message || "Ocurrió un error inesperado durante la verificación en Fandom.",
      source: 'Fandom'
    };
  }
}
