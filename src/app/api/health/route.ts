import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET() {
  try {
    // Test database connection
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json(
      { 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
          api: "running"
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        error: "Database connection failed"
      },
      { status: 503 }
    );
  }
}
