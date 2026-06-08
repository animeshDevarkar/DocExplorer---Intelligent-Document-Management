import { GoogleGenAI } from '@google/genai';
import { getGeminiClient, rotateGeminiKey } from './geminiAuth';

// Initialize Gemini API client
// Use dynamic client
let ai: GoogleGenAI | null = null;

try {
    ai = getGeminiClient();
} catch (e) {
    console.warn("Gemini API Key not found. Vector embeddings will fail until configured.");
}

/**
 * Generate a 768-dimensional vector embedding for a given text chunk
 * using Google's text-embedding-004 model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const currentAi = getGeminiClient();
    if (!currentAi) {
        throw new Error("Gemini API Client not initialized. Check GEMINI_API_KEY.");
    }
    
    // 3072 is standard for gemini-embedding-001 but we must slice it later
    let response;
    try {
        response = await currentAi.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text
        });
    } catch (e) {
        console.warn("Embedding failed, rotating key and retrying...");
        rotateGeminiKey();
        const retryAi = getGeminiClient();
        response = await retryAi.models.embedContent({
            model: 'gemini-embedding-001',
            contents: text
        });
    }

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
