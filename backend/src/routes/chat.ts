import "dotenv/config";
import { Hono } from 'hono';
import { auth } from '../auth';
import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../lib/embeddings';
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
        const { message, documentId } = await c.req.json();

        if (!message || !documentId) {
            return c.json({ error: 'Message and documentId are required' }, 400);
        }

        if (!ai) {
            return c.json({ error: 'AI is not configured.' }, 500);
        }

        // 1. Verify user owns the document
        const document = await prisma.document.findUnique({
            where: { id: documentId, userId: user.id }
        });

        if (!document) {
            return c.json({ error: 'Document not found' }, 404);
        }

        // 2. Generate vector embedding for the user's query
        const queryEmbedding = await generateEmbedding(message);

        // 3. Perform Vector Similarity Search (pgvector) to find top 3 most relevant chunks
        const similarChunks = await prisma.$queryRaw<Array<{ content: string }>>`
            SELECT content
            FROM "document_chunks"
            WHERE "document_id" = ${document.id}
            ORDER BY embedding <-> ${queryEmbedding}::vector
            LIMIT 4;
        `;

        // 4. Construct the prompt context
        const contextText = similarChunks.map(chunk => chunk.content).join('\n\n---\n\n');
        
        const systemInstruction = `You are DocExplorer AI, an intelligent assistant helping a user understand their PDF document titled "${document.title}".
Always base your answers strictly on the provided DOCUMENT CONTEXT. If the answer cannot be found in the context, politely state that you do not have enough information from the document to answer.

DOCUMENT CONTEXT:
${contextText}`;

        // 5. Query Gemini LLM to generate the answer
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.2 // low temp for factual QA
            }
        });

        // Save message to chat history
        let session = await prisma.chatSession.findFirst({
            where: { documentId: document.id, userId: user.id }
        });

        if (!session) {
            session = await prisma.chatSession.create({
                data: {
                    userId: user.id,
                    documentId: document.id,
                    title: "Chat for " + document.title
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

        return c.json({ answer: response.text });

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
        const session = await prisma.chatSession.findFirst({
            where: { documentId: documentId, userId: user.id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!session) {
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
