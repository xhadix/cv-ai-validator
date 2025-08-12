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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await params;
  try {

    if (!fileName) {
      return NextResponse.json(
        { error: 'File name is required' },
        { status: 400 }
      );
    }

    // Get file from MinIO through backend
    const client = getMinioClient();
    const fileStream = await client.getObject(
      env.MINIO_BUCKET_NAME,
      fileName
    );

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of fileStream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);

    console.log(`File downloaded through API route: ${fileName}`);

    // Return file as response with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading file:', error);
    
    // Check if file doesn't exist
    if (error instanceof Error && error.message.includes('NoSuchKey')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to download file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
