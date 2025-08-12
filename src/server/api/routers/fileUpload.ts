import { z } from "zod";
import { Client } from "minio";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";
import { extractTextFromPDF } from "~/server/services/anthropic";

// Lazy MinIO client initialization
let minioClient: Client | null = null;

function getMinioClient(): Client {
  if (!minioClient) {
    // Force SSL to false for local development
    const useSSL = false;
    
    console.log("Initializing MinIO client with config:", {
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: useSSL,
      accessKey: env.MINIO_ACCESS_KEY,
      // Don't log secret key for security
    });

    minioClient = new Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: useSSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

// Ensure bucket exists with retry logic
async function ensureBucketExists() {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = getMinioClient();
      const exists = await client.bucketExists(env.MINIO_BUCKET_NAME);
      
      if (!exists) {
        console.log(`Creating bucket '${env.MINIO_BUCKET_NAME}' (attempt ${attempt})`);
        await client.makeBucket(env.MINIO_BUCKET_NAME);
        console.log(`Bucket '${env.MINIO_BUCKET_NAME}' created successfully`);
      } else {
        console.log(`Bucket '${env.MINIO_BUCKET_NAME}' already exists`);
      }
      return; // Success, exit retry loop
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Bucket creation attempt ${attempt} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  throw new Error(`Failed to initialize file storage after ${maxRetries} attempts: ${lastError?.message}`);
}

// Initialize bucket on startup
let bucketInitialized = false;
async function initializeBucket() {
  if (!bucketInitialized) {
    await ensureBucketExists();
    bucketInitialized = true;
  }
}

export const fileUploadRouter = createTRPCRouter({
  // Get presigned URL for file upload
  getUploadUrl: publicProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string().refine(
        (type) => type === "application/pdf",
        "Only PDF files are allowed"
      ),
    }))
    .mutation(async ({ input }) => {
      try {
        // Ensure bucket exists before generating URL
        await initializeBucket();
        
        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${input.fileName}`;
        
        // Generate presigned URL for upload
        const uploadUrl = await getMinioClient().presignedPutObject(
          env.MINIO_BUCKET_NAME,
          uniqueFileName,
          24 * 60 * 60 // 24 hours expiry
        );

        console.log(`Generated upload URL for file: ${uniqueFileName}`);

        return {
          success: true,
          uploadUrl,
          fileName: uniqueFileName,
          message: "Upload URL generated successfully",
        };
      } catch (error) {
        console.error("Error generating upload URL:", error);
        throw new Error(`Failed to generate upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get file download URL
  getDownloadUrl: publicProcedure
    .input(z.object({
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const downloadUrl = await getMinioClient().presignedGetObject(
          env.MINIO_BUCKET_NAME,
          input.fileName,
          24 * 60 * 60 // 24 hours expiry
        );

        return {
          success: true,
          downloadUrl,
          message: "Download URL generated successfully",
        };
      } catch (error) {
        console.error("Error generating download URL:", error);
        throw new Error("Failed to generate download URL");
      }
    }),

  // Delete file
  deleteFile: publicProcedure
    .input(z.object({
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        await getMinioClient().removeObject(env.MINIO_BUCKET_NAME, input.fileName);

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting file:", error);
        throw new Error("Failed to delete file");
      }
    }),

  // List files in bucket
  listFiles: publicProcedure
    .input(z.object({
      prefix: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const files: Array<{
          name: string;
          size: number;
          lastModified: Date;
        }> = [];

        const stream = getMinioClient().listObjects(
          env.MINIO_BUCKET_NAME,
          input.prefix,
          true
        );

        return new Promise((resolve, reject) => {
          const results: typeof files = [];
          
          stream.on("data", (obj) => {
            if (obj.name && obj.lastModified) {
              results.push({
                name: obj.name,
                size: obj.size,
                lastModified: obj.lastModified,
              });
            }
          });

          stream.on("end", () => {
            resolve(results.slice(0, input.limit));
          });

          stream.on("error", (error) => {
            reject(new Error(`Failed to list files: ${error.message}`));
          });
        });
      } catch (error) {
        console.error("Error listing files:", error);
        throw new Error("Failed to list files");
      }
    }),

  // Check if file exists
  fileExists: publicProcedure
    .input(z.object({
      fileName: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        await getMinioClient().statObject(env.MINIO_BUCKET_NAME, input.fileName);
        return { exists: true };
      } catch (error) {
        return { exists: false };
      }
    }),

  // Extract text from PDF file
  extractPdfText: publicProcedure
    .input(z.object({
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Get the file from MinIO
        const fileStream = await getMinioClient().getObject(env.MINIO_BUCKET_NAME, input.fileName);
        
        // Convert stream to buffer
        const chunks: Buffer[] = [];
        return new Promise((resolve, reject) => {
          fileStream.on('data', (chunk) => {
            chunks.push(chunk);
          });
          
          fileStream.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              
              // Extract text using the Anthropic service
              const text = await extractTextFromPDF(buffer);
              
              resolve({
                success: true,
                text,
                message: "PDF text extracted successfully",
              });
            } catch (error) {
              reject(new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          });
          
          fileStream.on('error', (error) => {
            reject(new Error(`Failed to read file: ${error.message}`));
          });
        });
      } catch (error) {
        console.error("Error extracting PDF text:", error);
        throw new Error("Failed to extract PDF text");
      }
    }),
});
