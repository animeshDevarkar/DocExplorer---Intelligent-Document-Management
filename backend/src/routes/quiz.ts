import "dotenv/config";
import { Hono } from 'hono';
import { auth } from '../auth.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateEmbedding } from '../lib/embeddings.js';
import { GoogleGenAI } from '@google/genai';
import { getChatClient, rotateChatKey } from '../lib/geminiAuth.js';

const quizRouter = new Hono<{ Variables: { user: any } }>();
const prisma = new PrismaClient();

quizRouter.use('*', async (c, next) => {
    const spoofedHeaders = new Headers(c.req.raw.headers);
    spoofedHeaders.set("host", "docexplorer.vercel.app");
    spoofedHeaders.set("origin", "https://docexplorer.vercel.app");
    
    const session = await auth.api.getSession({ headers: spoofedHeaders });
    if (!session || !session.user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', session.user);
    await next();
});

// Generate Quiz
quizRouter.post('/generate', async (c) => {
    const user = c.get('user');
    
    try {
        const { documentId, topic, numQuestions = 5 } = await c.req.json();
        
        if (!documentId) {
            return c.json({ error: 'Document ID is required' }, 400);
        }

        const document = await prisma.document.findUnique({
            where: { id: documentId, userId: user.id }
        });

        if (!document) {
            return c.json({ error: 'Document not found' }, 404);
        }

        let contextText = "";

        if (topic) {
            // Generate embedding for the topic and search chunks
            const topicEmbedding = await generateEmbedding(topic);
            const embeddingString = `[${topicEmbedding.join(',')}]`;

            const similarChunks = await prisma.$queryRaw<Array<{ content: string }>>`
                SELECT content
                FROM "document_chunks"
                WHERE "document_id" = ${documentId}
                ORDER BY embedding <-> ${embeddingString}::vector
                LIMIT 5;
            `;
            contextText = similarChunks.map(chunk => chunk.content).join('\n\n---\n\n');
        } else {
            // No topic? Fetch first 5 chunks or summary
            const firstChunks = await prisma.documentChunk.findMany({
                where: { documentId: documentId },
                orderBy: { chunkIndex: 'asc' },
                take: 5
            });
            if (firstChunks.length > 0) {
                contextText = firstChunks.map(c => c.content).join('\n\n---\n\n');
            } else if (document.summary) {
                contextText = document.summary;
            } else {
                return c.json({ error: 'Document has no content to generate a quiz from.' }, 400);
            }
        }

        const ai = getChatClient();
        if (!ai) {
            return c.json({ error: 'AI is not configured.' }, 500);
        }

        const prompt = `You are an expert educator. Based on the following document context, generate a multiple-choice quiz with exactly ${numQuestions} questions.
        ${topic ? `The quiz MUST focus specifically on the topic: "${topic}".` : `The quiz should cover the general concepts in the text.`}
        
        Your response MUST be a valid JSON array of objects. Do not include markdown code blocks like \`\`\`json.
        Each object must have the following structure:
        {
            "question": "The question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0, // Integer index (0-3) of the correct option
            "explanation": "A brief explanation of why this answer is correct"
        }

        DOCUMENT CONTEXT:
        ${contextText}`;

        let response;
        let retries = 3;
        while (retries > 0) {
            try {
                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: {
                        temperature: 0.3,
                        responseMimeType: "application/json"
                    }
                });
                break;
            } catch (error: any) {
                const status = error.status || (error.error && error.error.code);
                const errMsg = (error.message || '').toLowerCase();
                const isRateLimit = status === 429 || status === 'RESOURCE_EXHAUSTED' || errMsg.includes('429') || errMsg.includes('quota');
                
                if (isRateLimit && retries > 1) {
                    rotateChatKey();
                    retries--;
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw error;
                }
            }
        }

        if (!response || !response.text) {
            throw new Error("Failed to generate quiz.");
        }

        const questionsJson = JSON.parse(response.text);

        // Save the quiz to the database
        const quiz = await prisma.quiz.create({
            data: {
                userId: user.id,
                documentId: document.id,
                topic: topic || null,
                questions: questionsJson
            }
        });

        return c.json({ quiz });
    } catch (error: any) {
        console.error("Quiz generation error:", error);
        return c.json({ error: 'Failed to generate quiz' }, 500);
    }
});

// Get all quizzes for user
quizRouter.get('/', async (c) => {
    const user = c.get('user');
    
    try {
        const quizzes = await prisma.quiz.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            include: {
                document: {
                    select: {
                        title: true
                    }
                }
            }
        });
        
        return c.json({ quizzes });
    } catch (error) {
        console.error("Fetch all quizzes error:", error);
        return c.json({ error: 'Failed to fetch quizzes' }, 500);
    }
});

// Get specific quiz
quizRouter.get('/:id', async (c) => {
    const user = c.get('user');
    const quizId = c.req.param('id');
    
    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId, userId: user.id },
            include: {
                document: {
                    select: {
                        title: true
                    }
                }
            }
        });
        
        if (!quiz) {
            return c.json({ error: 'Quiz not found' }, 404);
        }
        
        return c.json({ quiz });
    } catch (error) {
        console.error("Fetch quiz error:", error);
        return c.json({ error: 'Failed to fetch quiz' }, 500);
    }
});

// Submit quiz score
quizRouter.put('/:id/submit', async (c) => {
    const user = c.get('user');
    const quizId = c.req.param('id');
    
    try {
        const { score } = await c.req.json();
        
        if (score === undefined || typeof score !== 'number') {
            return c.json({ error: 'Score is required' }, 400);
        }
        
        const quiz = await prisma.quiz.update({
            where: { id: quizId, userId: user.id },
            data: { score }
        });
        
        return c.json({ success: true, quiz });
    } catch (error) {
        console.error("Submit quiz error:", error);
        return c.json({ error: 'Failed to submit quiz score' }, 500);
    }
});

// Delete quiz
quizRouter.delete('/:id', async (c) => {
    const user = c.get('user');
    const quizId = c.req.param('id');
    
    try {
        await prisma.quiz.delete({
            where: { id: quizId, userId: user.id }
        });
        
        return c.json({ success: true });
    } catch (error) {
        console.error("Delete quiz error:", error);
        return c.json({ error: 'Failed to delete quiz' }, 500);
    }
});

export { quizRouter };
