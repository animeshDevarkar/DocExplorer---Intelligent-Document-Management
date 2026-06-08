import "dotenv/config";
import { Hono } from 'hono';
import { auth } from '../auth.js';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

const userRouter = new Hono<{ Variables: { user: any } }>();
const prisma = new PrismaClient();

// Middleware to ensure user is authenticated
userRouter.use('*', async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session || !session.user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', session.user);
    await next();
});

// Upload Avatar
userRouter.post('/avatar', async (c) => {
    const user = c.get('user');
    
    try {
        const body = await c.req.parseBody();
        const file = body['file'] as File;

        if (!file || !file.type.startsWith('image/')) {
            return c.json({ error: 'Please upload a valid image file.' }, 400);
        }

        // Convert File to Buffer for Cloudinary stream
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Upload to Cloudinary (image)
        const uploadResult: any = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { 
                    folder: `docexplorer/users/${user.id}/avatar`,
                    resource_type: 'image'
                },
                (error: any, result: any) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        // Update database
        await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl: uploadResult.secure_url }
        });

        // Also try to update better-auth image column if it exists just in case
        try {
            await prisma.$executeRaw`UPDATE users SET image = ${uploadResult.secure_url} WHERE id = ${user.id}`;
        } catch (e) {
            // Ignore if 'image' column doesn't exist
        }

        return c.json({ success: true, avatarUrl: uploadResult.secure_url });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return c.json({ error: 'Failed to upload avatar.' }, 500);
    }
});

// Get current user profile (with DB avatar)
userRouter.get('/me', async (c) => {
    const user = c.get('user');
    try {
        const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
        return c.json({ user: dbUser });
    } catch (error) {
        return c.json({ error: 'Failed to fetch user' }, 500);
    }
});

export { userRouter };
