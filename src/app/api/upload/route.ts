import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'minio';
import { env } from '~/env';

// Initialize MinIO client for backend operations
function getMinioClient(): Client {
  const endPoint = process.env.NODE_ENV === 'production' ? 'minio' : 'localhost';
  
  return new Client({
    endPoint: endPoint,
    port: 9000,
    useSSL: false,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
}

// Ensure bucket exists
async function ensureBucketExists() {
  const client = getMinioClient();
  const exists = await client.bucketExists(env.MINIO_BUCKET_NAME);
  
  if (!exists) {
    console.log(`Creating bucket '${env.MINIO_BUCKET_NAME}'`);
    await client.makeBucket(env.MINIO_BUCKET_NAME);
    console.log(`Bucket '${env.MINIO_BUCKET_NAME}' created successfully`);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure bucket exists
    await ensureBucketExists();

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${file.name}`;

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload to MinIO through backend
    const client = getMinioClient();
    await client.putObject(
      env.MINIO_BUCKET_NAME,
      uniqueFileName,
      fileBuffer
    );

    console.log(`File uploaded through API route: ${uniqueFileName}`);

    return NextResponse.json({
      success: true,
      fileName: uniqueFileName,
      originalName: file.name,
      fileSize: file.size,
      message: 'File uploaded successfully through backend API',
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check if upload endpoint is working
export async function GET() {
  return NextResponse.json({
    message: 'File upload endpoint is ready',
    maxFileSize: '10MB',
    allowedTypes: ['application/pdf'],
  });
}
