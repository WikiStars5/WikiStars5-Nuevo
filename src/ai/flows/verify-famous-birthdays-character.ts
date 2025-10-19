'use server';
/**
 * @fileOverview A flow to verify if a character exists on es.famousbirthdays.com.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  verifyWikipediaCharacter,
  VerifyWikipediaCharacterOutputSchema,
} from './verify-wikipedia-character';

const VerifyFamousBirthdaysInputSchema = z.object({
  url: z.string().url().describe('The URL of the character on es.famousbirthdays.com.'),
});
export type VerifyFamousBirthdaysInput = z.infer<typeof VerifyFamousBirthdaysInputSchema>;

export const VerifyFamousBirthdaysOutputSchema = z.object({
  found: z.boolean().describe('Whether the character was found.'),
  title: z.string().nullable().describe('The name of the character.'),
  imageUrl: z.string().nullable().describe('The URL of the main image for the character.'),
  verificationError: z.string().nullable().describe('The reason for verification failure.'),
  source: z.literal('Famous Birthdays').describe('The source of the verification.'),
});
export type VerifyFamousBirthdaysOutput = z.infer<typeof VerifyFamousBirthdaysOutputSchema>;

export async function verifyFamousBirthdaysCharacter(
  input: VerifyFamousBirthdaysInput
): Promise<VerifyFamousBirthdaysOutput> {
  return verifyFamousBirthdaysCharacterFlow(input);
}

const verifyFamousBirthdaysCharacterFlow = ai.defineFlow(
  {
    name: 'verifyFamousBirthdaysCharacterFlow',
    inputSchema: VerifyFamousBirthdaysInputSchema,
    outputSchema: VerifyFamousBirthdaysOutputSchema,
  },
  async ({ url }) => {
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) {
        return {
          found: false,
          title: null,
          imageUrl: null,
          verificationError: 'No se pudo acceder a la URL proporcionada.',
          source: 'Famous Birthdays',
        };
      }
      const html = await response.text();

      // Extract name from <title> tag
      const titleMatch = html.match(/<title>(.*?) - Edad, Familia, Biografía<\/title>/);
      let name = titleMatch ? titleMatch[1].trim() : null;

      if (!name) {
         const h1Match = html.match(/<h1 class="bio-title">(.*?)<\/h1>/);
         name = h1Match ? h1Match[1].trim() : null;
      }
      
      if (!name) {
        return {
          found: false,
          title: null,
          imageUrl: null,
          verificationError: 'No se pudo extraer el nombre de la página.',
          source: 'Famous Birthdays',
        };
      }
      
      // Extract image from meta property
      const imageMatch = html.match(/<meta property="og:image" content="(.*?)"/);
      let imageUrl = imageMatch ? imageMatch[1] : null;

      // As a fallback, try to get a better image from Wikipedia
      if (name) {
        const wikipediaResult = await verifyWikipediaCharacter({ name });
        if (wikipediaResult.found && wikipediaResult.imageUrl) {
          imageUrl = wikipediaResult.imageUrl;
        }
      }

      if (!imageUrl) {
         return {
          found: false,
          title: name,
          imageUrl: null,
          verificationError: 'No se pudo extraer la imagen de la página.',
          source: 'Famous Birthdays',
        };
      }

      return {
        found: true,
        title: name,
        imageUrl,
        verificationError: null,
        source: 'Famous Birthdays',
      };
    } catch (error: any) {
      console.error('Error in verifyFamousBirthdaysCharacterFlow:', error);
      return {
        found: false,
        title: null,
        imageUrl: null,
        verificationError: error.message || 'Error inesperado del servidor.',
        source: 'Famous Birthdays',
      };
    }
  }
);
