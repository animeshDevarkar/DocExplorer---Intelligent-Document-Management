import { pipeline } from '@xenova/transformers';

class EmbeddingPipeline {
    static task = 'feature-extraction' as const;
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: any = null;

    static async getInstance(progress_callback: any = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

/**
 * Generate a vector embedding for a given text chunk
 * using a local HuggingFace model (all-MiniLM-L6-v2).
 * This runs 100% locally with zero API limits or costs.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const extractor = await EmbeddingPipeline.getInstance();
    
    // Compute embeddings
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    
    // Extract values as standard number array
    const values = Array.from(output.data) as number[];
    
    // The database column is strictly vector(1536).
    // MiniLM-L6-v2 natively produces 384-d vectors. 
    // We pad them with zeros to 1536 dimensions so they fit perfectly in the database.
    // Mathematically, zero-padding preserves the cosine similarity identically.
    if (values.length < 1536) {
        return [...values, ...new Array(1536 - values.length).fill(0)];
    }

    return values;
};
