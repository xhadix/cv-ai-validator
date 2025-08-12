import { z } from "zod";
import { Client } from "minio";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

// Initialize MinIO client
const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

// Ensure bucket exists
async function ensureBucketExists() {
  try {
    const exists = await minioClient.bucketExists(env.MINIO_BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(env.MINIO_BUCKET_NAME);
      console.log(`Bucket '${env.MINIO_BUCKET_NAME}' created successfully`);
    }
  } catch (error) {
    console.error("Error ensuring bucket exists:", error);
    throw new Error("Failed to initialize file storage");
  }
}

// Initialize bucket on startup
ensureBucketExists().catch(console.error);

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
        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${input.fileName}`;
        
        // Generate presigned URL for upload
        const uploadUrl = await minioClient.presignedPutObject(
          env.MINIO_BUCKET_NAME,
          uniqueFileName,
          24 * 60 * 60 // 24 hours expiry
        );

        return {
          success: true,
          uploadUrl,
          fileName: uniqueFileName,
          message: "Upload URL generated successfully",
        };
      } catch (error) {
        console.error("Error generating upload URL:", error);
        throw new Error("Failed to generate upload URL");
      }
    }),

  // Get file download URL
  getDownloadUrl: publicProcedure
    .input(z.object({
      fileName: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const downloadUrl = await minioClient.presignedGetObject(
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
        await minioClient.removeObject(env.MINIO_BUCKET_NAME, input.fileName);

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

        const stream = minioClient.listObjects(
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
        await minioClient.statObject(env.MINIO_BUCKET_NAME, input.fileName);
        return { exists: true };
      } catch (error) {
        return { exists: false };
      }
    }),
});
