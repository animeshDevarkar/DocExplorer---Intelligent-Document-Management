import { GoogleGenAI } from '@google/genai';
import { getSummaryClient, rotateSummaryKey } from './geminiAuth.js';

// Initialize Gemini API client
let ai: GoogleGenAI | null = null;

try {
    ai = getSummaryClient();
} catch (e) {
    console.warn("Gemini API Key not found. Vector embeddings will fail until configured.");
}

/**
 * Generate a 768-dimensional vector embedding for a given text chunk
 * using Google's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const currentAi = getSummaryClient();
    if (!currentAi) {
        throw new Error("Gemini API Client not initialized. Check GEMINI_API_KEY.");
    }
    
    let response;
    try {
        response = await currentAi.models.embedContent({
            model: 'gemini-embedding-2',
            contents: text,
            config: { outputDimensionality: 768 }
        });
    } catch (e) {
        console.warn("Embedding failed, rotating key and retrying...");
        rotateSummaryKey();
        const retryAi = getSummaryClient();
        if (!retryAi) {
            throw new Error("Gemini API Client not initialized after rotation.");
        }
        response = await retryAi.models.embedContent({
            model: 'gemini-embedding-2',
            contents: text,
            config: { outputDimensionality: 768 }
        });
    }

    if (!response.embeddings || response.embeddings.length === 0 || !response.embeddings[0].values) {
        throw new Error("Failed to generate embedding from Gemini API.");
    }

    const values = response.embeddings[0].values;
    
    // The database column is strictly vector(1536).
    // text-embedding-004 produces 768-d vectors. 
    // We pad them with zeros to 1536 dimensions so they fit perfectly in the database.
    if (values.length < 1536) {
        return [...values, ...new Array(1536 - values.length).fill(0)];
    }

    return values;
};
