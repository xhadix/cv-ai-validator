# CV AI Validator

A full-stack application for validating CV/resume data against uploaded PDF files using AI.

## Features

- 📝 CV data entry form (name, email, phone, skills, experience)
- 📄 PDF file upload and storage
- 🤖 AI-powered validation (comparing form data with PDF content)
- ✅ Success/error feedback with specific field mismatches
- 🐳 Docker development environment

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: tRPC, Prisma ORM
- **Database**: PostgreSQL
- **File Storage**: MinIO (S3-compatible)
- **Package Manager**: pnpm

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template
cp env.example .env

# Install dependencies
pnpm install
```

### 2. Start Development Environment

```bash
# Start PostgreSQL and MinIO
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

### 3. Access Services

- **Application**: http://localhost:3000
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)
- **Database**: localhost:5432

## Development

### Database Commands

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes
pnpm db:push

# Open Prisma Studio
pnpm db:studio
```

### Code Quality

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Formatting
pnpm format:write
```

## Project Structure

```
src/
├── app/              # Next.js app router
├── server/           # tRPC API routes
├── trpc/             # tRPC client setup
└── styles/           # Global styles
```

## Environment Variables

See `env.example` for all required environment variables.

## License

MIT
