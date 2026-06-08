import { GoogleGenAI } from '@google/genai';

export const getGeminiKeys = () => {
    return [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5
    ].filter(Boolean) as string[];
};

export let currentKeyIndex = 0;

export const getGeminiClient = () => {
    const keys = getGeminiKeys();
    if (keys.length === 0) return null;
    return new GoogleGenAI({ apiKey: keys[currentKeyIndex], apiVersion: 'v1' });
};

export const rotateGeminiKey = () => {
    const keys = getGeminiKeys();
    if (keys.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % keys.length;
        console.warn(`[Gemini Auth] Quota exhausted! Rotated to API key index ${currentKeyIndex + 1}/${keys.length}`);
        return true;
    }
    console.warn(`[Gemini Auth] Quota exhausted, but no backup keys available in environment.`);
    return false;
};
