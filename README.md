# CV AI Validator

A full-stack application for validating CV information against uploaded PDF documents using **real AI-powered validation** with Anthropic's Claude API. Built with the T3 Stack (Next.js, tRPC, Prisma, TypeScript) and PostgreSQL.

## 🚀 Features

- **CV Data Entry**: Form-based CV information collection with validation
- **PDF Upload**: Secure file upload with drag-and-drop support and progress tracking
- **Real AI Validation**: **Anthropic Claude integration** for intelligent CV comparison
- **PDF Text Extraction**: Automatic text extraction from uploaded PDFs
- **Validation History**: Complete audit trail of all validation attempts
- **Responsive UI**: Modern interface with Tailwind CSS
- **Type Safety**: Full TypeScript support with tRPC
- **File Storage**: MinIO S3-compatible object storage
- **Production Ready**: Docker deployment with health checks

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (tRPC API)    │◄──►│   (PostgreSQL)  │
│                 │    │                 │    │                 │
│ • CV Form       │    │ • CV Routes     │    │ • CV Table      │
│ • File Upload   │    │ • File Upload   │    │ • Validation    │
│ • Results       │    │ • Validation    │    │   Results Table │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Storage  │    │   AI Service    │    │   Validation    │
│   (MinIO)       │    │   (Anthropic)   │    │   Engine        │
│                 │    │                 │    │                 │
│ • PDF Storage   │    │ • Text Analysis │    │ • Field Compare │
│ • Presigned URLs│    │ • Content Match │    │ • Mismatch      │
│ • File Management│   │ • Claude API    │    │   Detection     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: tRPC, Node.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: MinIO (S3-compatible)
- **AI Service**: **Anthropic Claude 3.5 Sonnet** (real AI validation)
- **PDF Processing**: pdf-parse library with Claude fallback
- **Deployment**: Docker, Docker Compose
- **Package Manager**: pnpm

## 🔧 AI Integration

### Anthropic Claude Setup

The application uses **real AI validation** with Anthropic's Claude API:

1. **Get API Key**: Sign up at [console.anthropic.com](https://console.anthropic.com)
2. **Add to .env**: `ANTHROPIC_API_KEY="sk-ant-your-key-here"`
3. **Restart**: `pnpm dev`
4. **Test**: Upload a PDF and validate!

### How AI Validation Works

1. **PDF Text Extraction**: Uses pdf-parse library to extract text from uploaded PDFs
2. **Intelligent Comparison**: Claude analyzes form data vs PDF content
3. **Field-by-Field Check**: Name, email, phone, skills, experience
4. **Detailed Results**: Specific mismatches with confidence scores
5. **Graceful Fallback**: Claude handles PDF extraction if pdf-parse fails


## 📋 Prerequisites

- Node.js 18+
- pnpm
- Docker & Docker Compose
- PostgreSQL (for development)
- Anthropic API key (for AI validation)

## 🚀 Quick Start

### Development Setup

1. **Clone the repository**
   ```bash
   git clone git@github.com:xhadix/cv-ai-validator.git
   cd cv-ai-validator
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   # Add your ANTHROPIC_API_KEY
   ```

4. **Start development database**
   ```bash
   ./start-database.sh
   ```

5. **Start MinIO for file storage**
   ```bash
   docker compose -f docker-compose.dev.yml up -d minio
   ```

6. **Run database migrations**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

7. **Start development server**
   ```bash
   pnpm dev
   ```

8. **Open the application**
   - Frontend: http://localhost:3000
   - MinIO Console: http://localhost:9001

### Production Deployment

1. **Configure production environment**
   ```bash
   cp env.production.example .env
   # Edit .env with production values
   # Add your ANTHROPIC_API_KEY
   ```

2. **Test Docker build**
   ```bash
   ./test-docker-build.sh
   ```

3. **Deploy with Docker**
   ```bash
   ./deploy.sh
   ```

4. **Access the application**
   - Application: http://localhost:3000
   - MinIO Console: http://localhost:9001

## 📚 API Documentation

### CV Endpoints

- `POST /api/trpc/cv.submit` - Submit CV data
- `GET /api/trpc/cv.getAll` - Get all CVs
- `GET /api/trpc/cv.getById` - Get CV by ID
- `POST /api/trpc/cv.validate` - **Validate CV against PDF using AI**
- `GET /api/trpc/cv.getValidationHistory` - Get validation history

### File Upload Endpoints

- `POST /api/trpc/fileUpload.getUploadUrl` - Get presigned upload URL
- `GET /api/trpc/fileUpload.getDownloadUrl` - Get presigned download URL
- `POST /api/trpc/fileUpload.extractPdfText` - **Extract text from PDF**
- `DELETE /api/trpc/fileUpload.deleteFile` - Delete file
- `GET /api/trpc/fileUpload.listFiles` - List files
- `GET /api/trpc/fileUpload.fileExists` - Check if file exists

### Health Check

- `GET /api/health` - Application health status

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | - | ✅ |
| `ANTHROPIC_API_KEY` | **Anthropic Claude API key** | - | ✅ |
| `MINIO_ENDPOINT` | MinIO server endpoint | `localhost` | - |
| `MINIO_PORT` | MinIO server port | `9000` | - |
| `MINIO_ACCESS_KEY` | MinIO access key | `minioadmin` | - |
| `MINIO_SECRET_KEY` | MinIO secret key | `minioadmin` | - |
| `MINIO_BUCKET_NAME` | MinIO bucket name | `cv-uploads` | - |
| `NEXTAUTH_SECRET` | NextAuth secret | - | ✅ |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` | - |




## 🚀 Deployment

### Docker Deployment

The application includes a complete Docker setup for production with **fixed Prisma integration**:

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```


### Logs and Debugging

```bash
# View application logs
docker compose logs app

# View database logs
docker compose logs postgres

# View MinIO logs
docker compose logs minio

# Check application health
curl http://localhost:3000/api/health

# Debug file upload issues
./debug-upload.sh

# Test file upload functionality
./test-upload.sh
```

### File Upload Troubleshooting

If you encounter file upload issues in production:

1. **Run the debug script:**
   ```bash
   ./debug-upload.sh
   ```

2. **Test upload functionality:**
   ```bash
   ./test-upload.sh
   ```

3. **Common issues:**
   - MinIO connection problems (check networking)
   - Bucket creation failures (check MinIO logs)
   - File size limits (configured for 10MB max)
   - SSL/TLS issues (set `MINIO_USE_SSL=false` for development)

4. **Check container status:**
   ```bash
   docker ps
   docker logs cv-validator-minio-prod
   docker logs cv-validator-app
   ```

## 📁 Project Structure

```
cv-ai-validator/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── _components/        # React components
│   │   │   ├── cv-validator.tsx
│   │   │   ├── cv-form.tsx
│   │   │   ├── file-upload.tsx
│   │   │   └── validation-results.tsx
│   │   ├── api/                # API routes
│   │   └── page.tsx
│   ├── server/
│   │   ├── api/                # tRPC routers
│   │   ├── services/           # AI services
│   │   │   └── anthropic.ts    # Claude integration
│   │   └── db.ts
│   └── trpc/                   # tRPC client setup
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── seed.ts                 # Database seeding
├── docker-compose.yml          # Production deployment
├── docker-compose.dev.yml      # Development environment
├── Dockerfile                  # Fixed Docker build
├── deploy.sh                   # Deployment script
├── test-docker-build.sh        # Docker testing
└── DOCKER_TROUBLESHOOTING.md   # Troubleshooting guide
```


## 📄 License

This project is licensed under the MIT License.

