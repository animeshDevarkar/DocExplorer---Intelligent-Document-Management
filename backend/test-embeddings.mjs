import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function testModel(modelName) {
    try {
        const response = await ai.models.embedContent({
            model: modelName,
            contents: 'Hello world',
            config: {
                outputDimensionality: 768
            }
        });
        console.log(`✅ ${modelName} SUCCESS:`, response.embeddings[0].values.length, 'dimensions');
    } catch (e) {
        console.log(`❌ ${modelName} FAILED:`, e.message);
    }
}

async function main() {
    await testModel('gemini-embedding-2');
}
main();
