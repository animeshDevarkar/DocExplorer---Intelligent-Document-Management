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
        model: 'gemini-embedding-001',
        contents: text
    });

    if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
        throw new Error("Failed to generate embedding from Gemini API.");
    }

    const values = response.embeddings[0].values;
    
    // The database column is strictly vector(1536).
    // gemini-embedding-001 natively produces 3072-d vectors. 
    // We must slice them down to 1536 dimensions so they fit perfectly in the database.
    // (Google's models support Matryoshka Representation Learning, making slicing mathematically safe).
    if (values.length > 1536) {
        return values.slice(0, 1536);
    } else if (values.length < 1536) {
        return [...values, ...new Array(1536 - values.length).fill(0)];
    }

    return values;
};
