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
