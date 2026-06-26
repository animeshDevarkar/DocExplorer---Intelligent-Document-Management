import { generateEmbedding } from './src/lib/embeddings.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { getChatClient } from './src/lib/geminiAuth.js';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function test() {
    try {
        const message = "what is interconnection in IoT";
        
        // Find ANY document ID that exists
        const doc = await prisma.document.findFirst();
        if (!doc) throw new Error("No docs in DB");
        const targetIds = [doc.id];
        
        console.log("Generating embedding...");
        const queryEmbedding = await generateEmbedding(message);
        const embeddingString = `[${queryEmbedding.join(',')}]`;
        
        console.log("Running vector search...");
        const similarChunks = await prisma.$queryRaw<Array<{ content: string }>>`
            SELECT content
            FROM "document_chunks"
            WHERE "document_id" IN (${Prisma.join(targetIds)})
            ORDER BY embedding <-> ${embeddingString}::vector
            LIMIT ${targetIds.length > 1 ? 6 : 4};
        `;
        
        console.log(`Found ${similarChunks.length} chunks.`);
        const contextText = similarChunks.map(chunk => chunk.content).join('\n\n---\n\n');
        
        console.log("Generating response...");
        const ai = getChatClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: message,
            config: {
                systemInstruction: "test",
                temperature: 0.2,
                maxOutputTokens: 2000
            }
        });
        
        console.log("Response:", response.text);
    } catch (e) {
        console.error("Caught error:", e);
    }
}
test();
