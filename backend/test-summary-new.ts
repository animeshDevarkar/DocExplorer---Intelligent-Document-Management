import { GoogleGenAI } from '@google/genai';
import { getSummaryClient } from './src/lib/geminiAuth.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        const ai = getSummaryClient();
        if(!ai) throw new Error("No AI");
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: "Please provide a very brief 2-sentence TL;DR summary and 3 key bullet points for this document based on the following extracted text: hello",
            config: { 
                temperature: 0.3,
                maxOutputTokens: 2000 
            }
        });
        console.log("Response:", response.text);
    } catch (e) {
        console.error("Caught error:", e);
    }
}
test();
