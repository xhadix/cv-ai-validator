#!/bin/bash

# CV AI Validator Production Deployment Script

set -e

echo "🚀 Starting CV AI Validator deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please copy env.production.example to .env and configure your environment variables."
    exit 1
fi

# Load environment variables
source .env

echo "📦 Building and starting services..."

# Build and start all services
docker compose up -d --build

echo "⏳ Waiting for services to be healthy..."

# Wait for database to be ready
echo "Waiting for PostgreSQL..."
until docker compose exec -T postgres pg_isready -U $POSTGRES_USER; do
    echo "PostgreSQL is not ready yet..."
    sleep 2
done

# Wait for MinIO to be ready
echo "Waiting for MinIO..."
until curl -f http://localhost:9000/minio/health/live; do
    echo "MinIO is not ready yet..."
    sleep 2
done

# Wait for app to be ready
echo "Waiting for application..."
until curl -f http://localhost:3000/api/health; do
    echo "Application is not ready yet..."
    sleep 2
done

echo "✅ All services are healthy!"

# Run database migrations
echo "🗄️ Running database migrations..."
docker compose exec app pnpm prisma migrate deploy

# Seed database if needed
if [ "$SEED_DATABASE" = "true" ]; then
    echo "🌱 Seeding database..."
    docker compose exec app pnpm run db:seed
fi

echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service Status:"
echo "  - Application: http://localhost:3000"
echo "  - MinIO Console: http://localhost:9001"
echo "  - Database: localhost:5432"
echo ""
echo "🔧 Useful commands:"
echo "  - View logs: docker compose logs -f"
echo "  - Stop services: docker compose down"
echo "  - Restart services: docker compose restart"
echo "  - Update application: ./deploy.sh"
