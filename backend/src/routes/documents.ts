import "dotenv/config";
import { Hono } from 'hono';
import { auth } from '../auth.js';
import { uploadDocument } from '../lib/cloudinary.js';
import { PrismaClient, Prisma } from '@prisma/client';
import { generateEmbedding } from '../lib/embeddings.js';
import { getSummaryClient, rotateSummaryKey } from '../lib/geminiAuth.js';
import { v2 as cloudinary } from 'cloudinary';
import crypto from 'crypto';

const documentsRouter = new Hono<{ Variables: { user: any } }>();
const prisma = new PrismaClient();

// Middleware to ensure user is authenticated
documentsRouter.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session || !session.user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', session.user);
    await next();
});

// Upload Document Endpoint
documentsRouter.post('/upload', async (c) => {
    const user = c.get('user');
    
    try {
        const body = await c.req.parseBody();
        const file = body['file'] as File;

        if (!file || file.type !== 'application/pdf') {
            return c.json({ error: 'Please upload a valid PDF file.' }, 400);
        }

        if (file.size > 50 * 1024 * 1024) {
             return c.json({ error: 'File size exceeds 50MB limit.' }, 400);
        }

        // Convert File to Buffer for Cloudinary stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Hash file to prevent duplicates
        const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

        // Check if exact file already exists for this user
        const existingDoc = await prisma.document.findFirst({
            where: { userId: user.id, fileHash: fileHash }
        });

        if (existingDoc) {
             return c.json({ error: 'You have already uploaded this exact document.' }, 409);
        }

        // Upload to Cloudinary
        const uploadResult: any = await uploadDocument(buffer, file.name, user.id);

        // Save to Database
        const document = await prisma.document.create({
            data: {
                userId: user.id,
                title: file.name.replace('.pdf', ''),
                originalName: file.name,
                fileHash: fileHash,
                cloudinaryId: uploadResult.public_id,
                cloudinaryUrl: uploadResult.secure_url,
                fileSizeBytes: BigInt(file.size),
                status: 'processing', // Set to processing while we chunk and embed
            }
        });

        // ---------------------------------------------------------
        // RAG PIPELINE: Extract text, chunk, embed, and save to DB
        // ---------------------------------------------------------
        // We run this asynchronously so the user gets an instant upload response!
        (async () => {
            try {
                const { processPDF } = await import('../lib/pdf-processor.js');
                const { generateEmbedding } = await import('../lib/embeddings.js');
                const crypto = await import('crypto');

                // Extract and chunk
                const chunks = await processPDF(buffer);

                const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

                // Generate embeddings and save to pgvector sequentially to respect API rate limits
                for (const chunk of chunks) {
                    // Sanitize null bytes from PDF extraction which crash PostgreSQL
                    const sanitizedContent = chunk.content.replace(/\0/g, '');
                    
                    let embedding;
                    let retries = 3;
                    while (retries > 0) {
                        try {
                            embedding = await generateEmbedding(sanitizedContent);
                            // 15 RPM limit = 1 request every 4 seconds.
                            await sleep(4000);
                            break;
                        } catch (err: any) {
                            const errMsg = err?.message?.toLowerCase() || '';
                            if (err.status === 429 || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate limit')) {
                                console.warn("Gemini API Rate limit hit! Pausing for 35 seconds...");
                                await sleep(35000);
                                retries--;
                            } else {
                                throw err;
                            }
                        }
                    }
                    if (!embedding) throw new Error("Failed to generate embedding after retries");
                    
                    // Format the embedding as a string for pgvector: "[1.2, 3.4, ...]"
                    const embeddingString = `[${embedding.join(',')}]`;
                    
                    // Prisma requires $executeRaw for pgvector insertions
                    await prisma.$executeRaw`
                      INSERT INTO "document_chunks" (id, "document_id", "user_id", "chunk_index", content, "content_length", "page_number", embedding)
                      VALUES (
                        ${crypto.randomUUID()}, 
                        ${document.id}, 
                        ${user.id},
                        1,
                        ${chunk.content}, 
                        ${chunk.content.length},
                        ${chunk.pageNumber}, 
                        ${embeddingString}::vector
                      )
                    `;
                }

                // Mark document as ready (Summarization is now lazy and on-demand)
                await prisma.document.update({
                    where: { id: document.id },
                    data: { 
                        status: 'ready'
                    }
                });

            } catch (ragError) {
                console.error("RAG Pipeline Error:", ragError);
                // Mark as failed
                await prisma.document.update({
                    where: { id: document.id },
                    data: { status: 'error' }
                });
            }
        })().catch(console.error);

        // Return immediately while the RAG pipeline runs in the background
        return c.json({ 
            success: true, 
            document: {
                ...document,
                fileSizeBytes: Number(document.fileSizeBytes)
            } 
        });

    } catch (error) {
        console.error('Upload error:', error);
        return c.json({ error: 'Failed to process document upload.' }, 500);
    }
});

// Get all documents for user
documentsRouter.get('/', async (c) => {
    const user = c.get('user');
    
    const documents = await prisma.document.findMany({
        where: { userId: user.id, isArchived: false },
        orderBy: { createdAt: 'desc' }
    });

    // Serialize BigInt
    const serializedDocs = documents.map(doc => ({
        ...doc,
        fileSizeBytes: Number(doc.fileSizeBytes)
    }));

    return c.json({ documents: serializedDocs });
});

// Get single document
documentsRouter.get('/:id', async (c) => {
    const user = c.get('user');
    const documentId = c.req.param('id');
    
    const doc = await prisma.document.findUnique({
        where: { id: documentId, userId: user.id }
    });

    if (!doc) {
        return c.json({ error: 'Document not found' }, 404);
    }

    return c.json({
        document: {
            ...doc,
            fileSizeBytes: Number(doc.fileSizeBytes)
        }
    });
});

// We removed the proxy route completely. Frontend will use Cloudinary URL directly.

// Delete a document
documentsRouter.delete('/:id', async (c) => {
    const user = c.get('user');
    const documentId = c.req.param('id');
    
    try {
        const doc = await prisma.document.findUnique({
            where: { id: documentId, userId: user.id }
        });

        if (!doc) {
            return c.json({ error: 'Document not found' }, 404);
        }

        // Delete from Cloudinary if it exists
        if (doc.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(doc.cloudinaryId);
                console.log(`Deleted document from Cloudinary: ${doc.cloudinaryId}`);
            } catch (err) {
                console.error("Cloudinary delete error:", err);
                // Ignore Cloudinary errors and proceed with DB deletion
            }
        }

        // Delete from database (Cascade deletes chunks, chat sessions, etc.)
        await prisma.document.delete({
            where: { id: documentId, userId: user.id }
        });

        return c.json({ success: true });
    } catch (error) {
        console.error("Delete document error:", error);
        return c.json({ error: 'Failed to delete document' }, 500);
    }
});

documentsRouter.post('/:id/summarize', async (c) => {
    const user = c.get('user');
    const documentId = c.req.param('id');

    try {
        const document = await prisma.document.findUnique({
            where: { id: documentId, userId: user.id },
            include: { chunks: true }
        });

        if (!document) {
            return c.json({ error: 'Document not found' }, 404);
        }

        if (document.summary) {
            // Cache hit
            return c.json({ summary: document.summary });
        }

        const ai = getSummaryClient();
        if (!ai) {
            return c.json({ error: 'AI summary client not configured.' }, 500);
        }

        // Combine chunks and strictly truncate to ~500 words to save tokens
        const extractedText = document.chunks.map(c => c.content).join(' ');
        const truncatedText = extractedText
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .slice(0, 500)
            .join(' ');

        let documentSummary = "Summary could not be generated.";
        let summaryRetries = 3;
        while (summaryRetries > 0) {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: `Please provide a very brief 2-sentence TL;DR summary and 3 key bullet points for this document based on the following extracted text:\n\n${truncatedText}`,
                    config: { 
                        temperature: 0.3,
                        maxOutputTokens: 300 
                    }
                });
                
                if (response.text) {
                    documentSummary = response.text;
                }
                break;
            } catch (summaryError: any) {
                const status = summaryError.status || (summaryError.error && summaryError.error.code);
                const errMsg = (summaryError.message || '').toLowerCase();
                const isRateLimit = status === 429 || status === 'RESOURCE_EXHAUSTED' || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('exhausted');
                
                if (isRateLimit && summaryRetries > 1) {
                    if (rotateSummaryKey()) {
                        console.warn("Retrying summary generation with backup API key...");
                    } else {
                        console.warn("Summary generation rate limit hit! Pausing for 50 seconds...");
                        await new Promise(resolve => setTimeout(resolve, 50000));
                    }
                    summaryRetries--;
                } else {
                    console.error("Summary generation failed:", summaryError);
                    break;
                }
            }
        }

        // Cache the summary in the database
        await prisma.document.update({
            where: { id: document.id },
            data: { summary: documentSummary }
        });

        return c.json({ summary: documentSummary });

    } catch (error) {
        console.error("Summarization error:", error);
        return c.json({ error: 'Failed to generate summary' }, 500);
    }
});

export { documentsRouter };
