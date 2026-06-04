import pdfParse from 'pdf-parse';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface DocumentChunkResult {
    content: string;
    pageNumber: number;
}

export const processPDF = async (pdfBuffer: Buffer): Promise<DocumentChunkResult[]> => {
    // Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // Use Langchain's RecursiveCharacterTextSplitter to create optimal chunks
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 4000,
        chunkOverlap: 400,
    });

    const chunks = await splitter.createDocuments([text]);

    // Format output
    return chunks.map((chunk: any, index: number) => ({
        content: chunk.pageContent,
        pageNumber: 1
    }));
};
