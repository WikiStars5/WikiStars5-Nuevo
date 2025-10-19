import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-related-figures.ts';
import '@/ai/flows/analyze-comment-sentiment.ts';
import '@/ai/flows/verify-wikipedia-character.ts';
import '@/ai/flows/verify-famous-birthdays-character.ts';
import '@/ai/flows/verify-domain.ts';
