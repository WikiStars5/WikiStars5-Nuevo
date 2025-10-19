'use server';

/**
 * @fileOverview Sentiment analysis flow for analyzing comments on a figure's profile.
 *
 * - analyzeCommentSentiment - Analyzes the sentiment of a given comment.
 * - AnalyzeCommentSentimentInput - The input type for the analyzeCommentSentiment function.
 * - AnalyzeCommentSentimentOutput - The return type for the analyzeCommentSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeCommentSentimentInputSchema = z.object({
  comment: z
    .string()
    .describe('The comment to analyze for sentiment.'),
});
export type AnalyzeCommentSentimentInput = z.infer<typeof AnalyzeCommentSentimentInputSchema>;

const AnalyzeCommentSentimentOutputSchema = z.object({
  sentiment: z
    .enum(['joy', 'envy', 'sadness', 'anger', 'neutral'])
    .describe('The sentiment expressed in the comment.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence level of the sentiment analysis.'),
});
export type AnalyzeCommentSentimentOutput = z.infer<typeof AnalyzeCommentSentimentOutputSchema>;

export async function analyzeCommentSentiment(input: AnalyzeCommentSentimentInput): Promise<AnalyzeCommentSentimentOutput> {
  return analyzeCommentSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeCommentSentimentPrompt',
  input: {schema: AnalyzeCommentSentimentInputSchema},
  output: {schema: AnalyzeCommentSentimentOutputSchema},
  prompt: `Analyze the sentiment of the following comment and classify it as joy, envy, sadness, anger, or neutral.\n\nComment: {{{comment}}}\n\nReturn the sentiment and a confidence score between 0 and 1.
\nOutput format: {"sentiment": "(joy|envy|sadness|anger|neutral)", "confidence": number between 0 and 1}`,
});

const analyzeCommentSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeCommentSentimentFlow',
    inputSchema: AnalyzeCommentSentimentInputSchema,
    outputSchema: AnalyzeCommentSentimentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
