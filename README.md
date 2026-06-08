# DocExplorer - Intelligent Document Management

DocExplorer is an intelligent, full-stack document management platform that leverages AI to help you understand, summarize, and chat with your PDFs. It uses an advanced Retrieval-Augmented Generation (RAG) pipeline to instantly find answers to your questions from within your own uploaded documents.

## 🚀 Key Features

- **Lightning-Fast Authentication:** Secure, native Next.js authentication powered by Better Auth.
- **Smart PDF Uploads:** Securely upload and store your PDF documents in the cloud.
- **Auto-Summarization:** Instantly generates a TL;DR summary and key bullet points for every uploaded document using Gemini 2.5 Flash.
- **Interactive AI Chat (RAG):** Ask questions about a specific document or compare multiple documents simultaneously. The AI reads the documents and provides highly accurate answers based *strictly* on the document context.
- **Real-Time Dashboard Search:** Instantly filter through your documents by title or by AI-generated summaries.
- **High-Performance Architecture:** Built as a Turborepo Monorepo, separating the lightning-fast Next.js frontend from the heavy-lifting Node.js AI worker.

---

## 🛠️ Tech Stack & Architecture

This project is structured as a **Turborepo Monorepo** using npm workspaces. It is divided into an ultra-fast frontend and a dedicated background AI worker to bypass serverless execution timeouts.

### 🌐 Frontend (Next.js - Hosted on Vercel)
The frontend is responsible for the user interface, routing, and handling authentication natively.
- **Framework:** Next.js (App Router) & React
- **Styling:** Tailwind CSS
- **Components:** Radix UI Primitives & Lucide Icons
- **Authentication:** Better Auth (Server-side rendering & API Routes)
- **Deployment:** Vercel

### ⚙️ Backend AI Worker (Node.js/Hono - Hosted on Render)
A lightweight background server responsible solely for the heavy lifting: PDF chunking, embedding generation, and vector similarity search.
- **Framework:** Node.js with Hono (Ultra-fast web framework)
- **PDF Processing:** `pdf-parse`
- **AI/RAG Pipeline:** LangChain (RecursiveCharacterTextSplitter)
- **AI Models:** Google GenAI SDK (`gemini-2.5-flash` for chat/summaries, `gemini-embedding-2` for vector embeddings)
- **File Storage:** Cloudinary (Secure PDF cloud storage)
- **Deployment:** Render (Kept awake via a `/api/ping` cron job)

### 🗄️ Shared Packages & Database
Shared code used by both the Frontend and the Backend.
- **Database:** Neon (Serverless PostgreSQL)
- **Vector Search:** `pgvector` extension for lightning-fast similarity search
- **ORM:** Prisma
- **Monorepo Tooling:** Turborepo

---

## 📂 Project Structure

```text
DocExplorer/
├── apps/
│   ├── frontend/        # Next.js Application (UI, Auth Routes, Proxy)
│   └── backend/         # Hono Node.js Server (Document Uploads, RAG Pipeline, Chat)
├── packages/
│   ├── auth/            # Shared Better Auth Configuration
│   └── database/        # Shared Prisma Schema and Client
├── turbo.json           # Turborepo build pipeline configuration
└── package.json         # Root workspace configuration
```

---

## 🧠 How the AI Pipeline Works (RAG)

1. **Ingestion:** When a user uploads a PDF, the Node.js backend instantly streams the file to Cloudinary for safe storage.
2. **Processing:** The PDF text is extracted using `pdf-parse` and broken down into overlapping 4000-character chunks using LangChain.
3. **Embedding:** Each chunk is sent to the Google Gemini Embedding API, converting the text into a 1536-dimensional vector array.
4. **Storage:** The vectors are stored in the Neon PostgreSQL database using the `pgvector` extension.
5. **Retrieval (Chat):** When a user asks a question, their query is converted into a vector. `pgvector` performs a mathematical similarity search to find the most relevant document chunks.
6. **Generation:** The most relevant chunks are injected into a prompt alongside the user's question and sent to Gemini 2.5 Flash, which generates a highly accurate, context-aware answer.

---

## 💻 Local Development

### Prerequisites
- Node.js v20+
- npm v10+
- A PostgreSQL database (Neon recommended)
- API Keys for: Google Gemini, Cloudinary

### Setup

1. **Clone the repository and install dependencies:**
   ```bash
   git clone <repo-url>
   cd DocExplorer
   npm install
   ```

2. **Set up Environment Variables:**
   Create a `.env` file in `frontend/`, `backend/`, and `packages/auth/` containing the necessary keys for Prisma, Better Auth, Cloudinary, and Gemini.

3. **Initialize the Database:**
   ```bash
   npm run db:push --workspace=@docexplorer/database
   npm run generate --workspace=@docexplorer/database
   ```

4. **Start the Development Servers:**
   ```bash
   npm run dev
   ```
   Turborepo will automatically boot up both the Next.js frontend (http://localhost:3000) and the Hono backend (http://localhost:3001) concurrently.
