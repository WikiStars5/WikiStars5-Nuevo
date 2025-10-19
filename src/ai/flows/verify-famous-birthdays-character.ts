'use server';
/**
 * @fileOverview A flow to verify if a character exists on es.famousbirthdays.com.
 * This flow now also attempts to fetch a better image from Wikipedia.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  verifyWikipediaCharacter,
} from './verify-wikipedia-character';

const VerifyFamousBirthdaysInputSchema = z.object({
  url: z.string().url().describe('The URL of the character on es.famousbirthdays.com.'),
  name: z.string().describe('The name of the public figure to verify.'),
});
export type VerifyFamousBirthdaysInput = z.infer<typeof VerifyFamousBirthdaysInputSchema>;

const VerifyFamousBirthdaysOutputSchema = z.object({
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
  async ({ url, name }) => {
    try {
        if (!url.startsWith('https://es.famousbirthdays.com/people/')) {
            return {
                found: false,
                title: null,
                imageUrl: null,
                verificationError: "La URL debe ser de 'es.famousbirthdays.com/people/'.",
                source: 'Famous Birthdays',
            };
        }

      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) {
         return {
          found: false,
          title: null,
          imageUrl: null,
          verificationError: `La página no se pudo encontrar (código: ${response.status}). Verifica la URL.`,
          source: 'Famous Birthdays',
        };
      }
      const html = await response.text();
      
      const normalizedHtml = html.toLowerCase();
      const normalizedName = name.toLowerCase();
      if (!normalizedHtml.includes(normalizedName)) {
        return {
          found: false,
          title: null,
          imageUrl: null,
          verificationError: `El nombre "${name}" no se encontró en el contenido de la página.`,
          source: 'Famous Birthdays',
        };
      }

      // Extract name from <title> tag
      const titleMatch = html.match(/<title>(.*?) - Edad, Familia, Biografía<\/title>/);
      let characterName = titleMatch ? titleMatch[1].trim() : null;

      if (!characterName) {
         const h1Match = html.match(/<h1 class="bio-title">(.*?)<\/h1>/);
         characterName = h1Match ? h1Match[1].trim() : name; // Fallback to input name
      }
      
      if (!characterName) {
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
      let famousBirthdaysImageUrl = imageMatch ? imageMatch[1] : null;

      // As a fallback, try to get a better image from Wikipedia
      const wikipediaResult = await verifyWikipediaCharacter({ name: characterName });
      const finalImageUrl = wikipediaResult.imageUrl || famousBirthdaysImageUrl;

      if (!finalImageUrl) {
         return {
          found: true, // Found the name, but not the image
          title: characterName,
          imageUrl: null,
          verificationError: 'Se encontró el nombre pero no se pudo extraer la imagen.',
          source: 'Famous Birthdays',
        };
      }

      return {
        found: true,
        title: characterName,
        imageUrl: finalImageUrl,
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
