import { GoogleGenAI } from '@google/genai';

// SUMMARY KEYS
export const getSummaryKeys = () => {
    return [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1,
        process.env.GEMINI_API_KEY_2,
    ].filter(Boolean) as string[];
};

export let summaryKeyIndex = 0;

export const getSummaryClient = () => {
    const keys = getSummaryKeys();
    if (keys.length === 0) return null;
    return new GoogleGenAI({ apiKey: keys[summaryKeyIndex], apiVersion: 'v1' });
};

export const rotateSummaryKey = () => {
    const keys = getSummaryKeys();
    if (keys.length > 1) {
        summaryKeyIndex = (summaryKeyIndex + 1) % keys.length;
        console.warn(`[Gemini Auth] Quota exhausted! Rotated SUMMARY key to index ${summaryKeyIndex + 1}/${keys.length}`);
        return true;
    }
    return false;
};

// CHAT KEYS
export const getChatKeys = () => {
    return [
        process.env.GEMINI_API_KEY_3,
        process.env.GEMINI_API_KEY_4,
        process.env.GEMINI_API_KEY_5
    ].filter(Boolean) as string[];
};

export let chatKeyIndex = 0;

export const getChatClient = () => {
    const keys = getChatKeys();
    if (keys.length === 0) {
        // Fallback to summary keys if no chat keys are explicitly set
        return getSummaryClient();
    }
    return new GoogleGenAI({ apiKey: keys[chatKeyIndex], apiVersion: 'v1' });
};

export const rotateChatKey = () => {
    const keys = getChatKeys();
    if (keys.length > 1) {
        chatKeyIndex = (chatKeyIndex + 1) % keys.length;
        console.warn(`[Gemini Auth] Quota exhausted! Rotated CHAT key to index ${chatKeyIndex + 1}/${keys.length}`);
        return true;
    }
    // If falling back to summary keys, we should rotate those
    if (keys.length === 0) {
        return rotateSummaryKey();
    }
    return false;
};
