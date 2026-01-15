# Relativit

AGI-powered autonomous software development system designed for complete automation of the software development lifecycle.

This repository contains two tightly connected parts:

- **AGI-oriented project structure** (requirements, specs, workflows, knowledge, etc.)
- **Relativit web application** (React frontend + Express/PostgreSQL backend) under `src/features/app/`

The goal is to let both humans and AGI agents collaborate around a structured SDLC while still being able to run a concrete application locally with minimal setup.

## Overview

Relativit is a next-generation project structure optimized for AGI (Artificial General Intelligence) agents to autonomously:

- Generate requirements from high-level ideas
- Design technical specifications
- Generate production-ready code
- Create comprehensive tests
- Validate quality continuously
- Learn and improve from experience

## Quick Start

### Prerequisites

- Node.js 20+ (LTS recommended)
- PostgreSQL (or Supabase account)
- npm or yarn

### Development Setup

詳細なセットアップ手順は [docs/LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) を参照してください。

**クイックスタート:**

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd relativit
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables:**
   ```bash
   cd src/features/app/server
   cp .env.example .env
   # Edit .env with your actual values
   ```

4. **Set up the database:**
   ```bash
   npm run db:push
   ```

5. **Start development servers:**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:3001`
   - Frontend app on `http://localhost:3000`

### Environment Configuration

See [docs/ENVIRONMENT_SETUP.md](./docs/ENVIRONMENT_SETUP.md) for detailed environment variable configuration.

**Key points:**
- `.env` files are **never committed** to Git
- Use `.env.example` as a template
- Development: Uses test email addresses automatically
- Production: Requires verified domain for email sending

## Directory Structure

### Core Systems

- **`.agent/`** - AI Agent control system
  - `config/` - Agent configuration, capabilities, and constraints
  - `prompts/` - System, task, and meta prompts
  - `memory/` - Short-term, long-term, and episodic memory
  - `reasoning/` - Chain-of-thought, decisions, and alternatives
  - `tools/` - Agent tool definitions

- **`.state/`** - State management
  - `current/` - Current project state, task queue, dependencies
  - `history/` - Historical state snapshots
  - `checkpoints/` - Rollback points

- **`.metadata/`** - Metadata and ontology
  - `schema/` - Data schemas and ontology definitions
  - `ontology/` - Concept relationships and taxonomy

- **`.learning/`** - Learning and improvement system
  - `feedback/` - Feedback data collection
  - `metrics/` - Performance metrics
  - `improvements/` - Improvement history
  - `patterns/` - Learned patterns

### Web Application

- **`src/features/app/`** - Relativit web application
  - `client/` - React frontend
  - `server/` - Express backend with PostgreSQL

## Environment Separation

### Development vs Production

The application uses environment variables to separate development and production configurations:

- **Development (`NODE_ENV=development`):**
  - Uses test email addresses automatically
  - Detailed error messages
  - Localhost CORS settings
  - Debug logging

- **Production (`NODE_ENV=production`):**
  - Requires verified email domain
  - User-friendly error messages
  - Production CORS settings
  - Production logging

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment guide.

### Production Deployment (Cloud Run + Firebase)

For deploying to Google Cloud Run and Firebase Hosting:

1. **Set up secrets:**
   ```bash
   npm run deploy:setup-secrets
   ```

2. **Deploy backend to Cloud Run:**
   ```bash
   npm run deploy:cloud-run
   ```

3. **Deploy frontend to Firebase Hosting:**
   ```bash
   npm run deploy:firebase <API_URL>
   # Example: npm run deploy:firebase https://relativit-api-xxxxx-xx.a.run.app
   ```

See [docs/DEPLOYMENT_CLOUD_RUN.md](./docs/DEPLOYMENT_CLOUD_RUN.md) for detailed instructions.

## Available Scripts

### Root Level

- `npm run install:all` - Install all dependencies (client + server)
- `npm run dev` - Start both client and server in development mode
- `npm run dev:server` - Start only the server
- `npm run dev:client` - Start only the client
- `npm run build:client` - Build the client for production
- `npm run db:push` - Push database schema changes
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

### Deployment Scripts

- `npm run deploy:setup-secrets` - Set up secrets in Secret Manager
- `npm run deploy:cloud-run` - Deploy backend to Cloud Run
- `npm run deploy:firebase <API_URL>` - Deploy frontend to Firebase Hosting

## Security

- **Never commit `.env` files** - They contain sensitive information
- **Use strong secrets in production** - Generate with `openssl rand -base64 64`
- **Rotate secrets regularly** - Especially if compromised
- **Limit access to production environment variables**

## Documentation

- [Local Development Guide](./docs/LOCAL_DEVELOPMENT.md) - **ローカル開発環境のセットアップと起動方法**
- [Environment Setup Guide](./docs/ENVIRONMENT_SETUP.md) - Detailed environment variable configuration
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions (Heroku, Vercel, Railway, etc.)
- [Cloud Run + Firebase Deployment](./docs/DEPLOYMENT_CLOUD_RUN.md) - Detailed guide for deploying to Google Cloud Run and Firebase Hosting
- [RLS Setup Guide](./docs/RLS_SETUP.md) - Supabase Row Level Security setup
- [Release Test Report](./RELEASE_TEST_REPORT.md) - Pre-release testing results

## Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## License

MIT
