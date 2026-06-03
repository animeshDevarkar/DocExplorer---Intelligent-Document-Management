import "dotenv/config";
import { Hono } from 'hono';
import { auth } from '../auth';
import { uploadDocument } from '../lib/cloudinary';
import { PrismaClient } from '@prisma/client';
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
        // We run this synchronously for the MVP so the user knows if it fails,
        // but in production this should be a background queue worker.
        try {
            const { processPDF } = await import('../lib/pdf-processor');
            const { generateEmbedding } = await import('../lib/embeddings');
            const crypto = await import('crypto');

            // Extract and chunk
            const chunks = await processPDF(buffer);

            // Generate embeddings and save to pgvector sequentially to respect API rate limits
            for (const chunk of chunks) {
                const embedding = await generateEmbedding(chunk.content);
                
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
                    ${embedding}::vector
                  )
                `;
            }

            // Mark document as ready
            await prisma.document.update({
                where: { id: document.id },
                data: { status: 'ready' }
            });

            // Re-fetch to return the ready document
            const finalDoc = await prisma.document.findUnique({ where: { id: document.id } });
            
            return c.json({ 
                success: true, 
                document: {
                    ...finalDoc,
                    fileSizeBytes: Number(finalDoc?.fileSizeBytes)
                } 
            });

        } catch (ragError) {
            console.error("RAG Pipeline Error:", ragError);
            // Mark as failed
            await prisma.document.update({
                where: { id: document.id },
                data: { status: 'error' }
            });
            return c.json({ error: 'Document uploaded, but failed to process AI embeddings.' }, 500);
        }

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

export { documentsRouter };
