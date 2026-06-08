import "dotenv/config";
import { Hono } from 'hono';
import { auth } from '../auth.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateEmbedding } from '../lib/embeddings.js';
import { GoogleGenAI } from '@google/genai';

const chatRouter = new Hono<{ Variables: { user: any } }>();
const prisma = new PrismaClient();
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Middleware to ensure user is authenticated
chatRouter.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session || !session.user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', session.user);
    await next();
});

chatRouter.post('/', async (c) => {
    const user = c.get('user');
    
    try {
        const { message, documentId, documentIds, sessionId, language } = await c.req.json();

        if (!message || (!documentId && (!documentIds || documentIds.length === 0))) {
            return c.json({ error: 'Message and document ID(s) are required' }, 400);
        }

        if (!ai) {
            return c.json({ error: 'AI is not configured.' }, 500);
        }

        // 1. Verify user owns the document(s)
        const targetIds = documentIds && documentIds.length > 0 ? documentIds : [documentId];
        const documents = await prisma.document.findMany({
            where: { id: { in: targetIds }, userId: user.id }
        });

        if (documents.length !== targetIds.length) {
            return c.json({ error: 'One or more documents not found' }, 404);
        }

        // 2. Generate vector embedding for the user's query
        const queryEmbedding = await generateEmbedding(message);

        // Format the embedding as a string for pgvector: "[1.2, 3.4, ...]"
        const embeddingString = `[${queryEmbedding.join(',')}]`;

        // 3. Perform Vector Similarity Search across all selected documents
        const similarChunks = await prisma.$queryRaw<Array<{ content: string }>>`
            SELECT content
            FROM "document_chunks"
            WHERE "document_id" IN (${Prisma.join(targetIds)})
            ORDER BY embedding <-> ${embeddingString}::vector
            LIMIT ${targetIds.length > 1 ? 6 : 4};
        `;

        // 4. Construct the prompt context
        const contextText = similarChunks.map(chunk => chunk.content).join('\n\n---\n\n');
        
        const systemInstruction = `You are DocExplorer AI, an intelligent assistant helping a user understand their documents.
Always base your answers strictly on the provided DOCUMENT CONTEXT. If the answer cannot be found in the context, politely state that you do not have enough information from the document to answer.

CRITICAL REQUIREMENT: You MUST reply entirely in the following language: ${language || 'English'}. No matter what language the document is in or what language the prompt is in, your response MUST be in ${language || 'English'}.

DOCUMENT CONTEXT:
${contextText}`;

        // 5. Query Gemini LLM to generate the answer
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: message,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2 // low temp for factual QA
            }
        });

        // Save message to chat history
        let session;
        if (sessionId) {
            session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
        } else if (targetIds.length === 1) {
            session = await prisma.chatSession.findFirst({
                where: { documentId: targetIds[0], userId: user.id }
            });
        }
        
        if (!session) {
            session = await prisma.chatSession.create({
                data: {
                    userId: user.id,
                    documentId: targetIds.length === 1 ? targetIds[0] : null,
                    documentIds: targetIds.length > 1 ? targetIds : [],
                    title: targetIds.length > 1 ? "Comparing Multiple Documents" : "Chat for " + documents[0].title
                }
            });
        }

        await prisma.message.create({
            data: {
                sessionId: session.id,
                userId: user.id,
                role: 'user',
                content: message
            }
        });

        const aiMessage = await prisma.message.create({
            data: {
                sessionId: session.id,
                userId: user.id,
                role: 'assistant',
                content: response.text || "I'm sorry, I couldn't generate a response."
            }
        });

        return c.json({ answer: response.text, sessionId: session.id });

    } catch (error: any) {
        console.error("Chat error:", error);
        return c.json({ error: 'Failed to process chat message.' }, 500);
    }
});

// Get chat history for a document
chatRouter.get('/:documentId', async (c) => {
    const user = c.get('user');
    const documentId = c.req.param('documentId');
    
    try {
        // If documentId is a sessionId (for multi-doc), fetch by ID. 
        // We can just query by either documentId or sessionId.
        let session = await prisma.chatSession.findFirst({
            where: { 
                OR: [
                    { documentId: documentId },
                    { id: documentId } // in case frontend passes sessionId
                ],
                userId: user.id 
            },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!session || session.messages.length === 0) {
            // Fetch the document to get the summary
            const doc = await prisma.document.findUnique({
                where: { id: documentId, userId: user.id }
            });

            if (doc && doc.summary) {
                return c.json({ 
                    messages: [
                        { 
                            id: "intro", 
                            role: "assistant", 
                            content: `Here is a summary of the document to get us started:\n\n${doc.summary}\n\nWhat else would you like to know?` 
                        }
                    ] 
                });
            }

            return c.json({ messages: [] });
        }

        return c.json({ messages: session.messages });
    } catch (error) {
        console.error("Fetch history error:", error);
        return c.json({ error: 'Failed to fetch chat history' }, 500);
    }
});
// Get all chat sessions for user
chatRouter.get('/', async (c) => {
    const user = c.get('user');
    
    try {
        const sessions = await prisma.chatSession.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: 'desc' },
            include: {
                document: {
                    select: {
                        title: true
                    }
                }
            }
        });

        return c.json({ sessions });
    } catch (error) {
        console.error("Fetch all sessions error:", error);
        return c.json({ error: 'Failed to fetch chat sessions' }, 500);
    }
});

export { chatRouter };
