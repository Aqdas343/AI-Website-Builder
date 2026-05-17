# AI Website Builder

An intelligent platform that generates complete, production-ready websites from natural language prompts. Built with Next.js, Node.js, and OpenAI.

## Prerequisites
- Node 18+
- MongoDB
- Redis (Optional, used for generation queue)

## Setup Steps
1. Clone the repository
2. Set up environment variables:
   ```bash
   cp client/.env.example client/.env
   cp server/.env.example server/.env
   ```
3. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   cd ../server && npm install
   ```
4. Run development servers:
   ```bash
   npm run dev
   ```

## Folder Structure
- `client/`: Next.js frontend, visual builder, and theme engine.
- `server/`: Express backend, AI generation services, and export engine.
