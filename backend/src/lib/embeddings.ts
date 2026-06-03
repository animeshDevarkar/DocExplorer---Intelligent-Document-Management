import { GoogleGenAI } from '@google/genai';
import { env } from 'process';

// Initialize Gemini API client
// It will automatically pick up GEMINI_API_KEY from environment variables
let ai: GoogleGenAI | null = null;

try {
    if (process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
} catch (e) {
    console.warn("Gemini API Key not found. Vector embeddings will fail until configured.");
}

/**
 * Generate a 768-dimensional vector embedding for a given text chunk
 * using Google's text-embedding-004 model.
 */
export const generateEmbedding = async (text: string): Promise<number[]> => {
    if (!ai) {
        throw new Error("Gemini API is not configured. Missing GEMINI_API_KEY.");
    }

    const response = await ai.models.embedContent({
        model: 'gemini-embedding-2',
        contents: text,
        config: { outputDimensionality: 1536 }
    });

    if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
        throw new Error("Failed to generate embedding from Gemini API.");
    }

    return response.embeddings[0].values;
};
