import { v2 as cloudinary } from 'cloudinary';
import { env } from 'process';

// Cloudinary connection relies on the CLOUDINARY_URL environment variable 
// which is automatically loaded from the .env file.
cloudinary.config({
  secure: true,
});

export const uploadDocument = async (fileBuffer: Buffer, originalName: string, userId: string) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image', // Use 'image' for PDFs so they render inline!
                format: 'pdf',
                folder: `docexplorer/users/${userId}`,
                public_id: `${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary Upload Error:", error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        uploadStream.end(fileBuffer);
    });
};

export const deleteDocument = async (publicId: string) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
             if (error) reject(error);
             else resolve(result);
        });
    });
};

export default cloudinary;
