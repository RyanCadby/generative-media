# Generative Media

A web app for generating and upscaling images and videos using multiple AI providers. Organize work into projects, generate media from text prompts or reference images, upscale with fine-grained controls, and browse results in a gallery with a full-resolution lightbox.

## What It Does

- **Text to Image** — Generate images from prompts using Google Imagen, OpenAI GPT Image, or Runway Gen-4.
- **Text to Video** — Create videos from prompts with Google Veo, OpenAI Sora, ByteDance Seedance, or Wan.
- **Image to Video** — Animate a reference image into video using any of the video models plus Runway Gen-4 Turbo, Kling, and Wan I2V.
- **Image Upscale** — Enhance image resolution with Topaz Labs models (Standard, High Fidelity, CGI, Recovery, and more) with per-model controls for sharpening, denoising, face enhancement, and creativity.

All generated media is stored in Cloudflare R2. Thumbnails are automatically generated for fast gallery browsing, and full-resolution files are served in the lightbox viewer.

## Providers & Models

| Provider | Capabilities | Models |
|----------|-------------|--------|
| **Google Gemini** | Image, Video | Imagen 4.0 / 4.0 Fast / 4.0 Ultra / 3.0, Veo 3.1 / 3.1 Fast / 2.0 |
| **OpenAI** | Image, Video | GPT Image 1, Sora 2 / 2 Pro |
| **Runway** | Image, Video | Gen-4 Image / Image Turbo / Turbo |
| **Together AI** | Video | Seedance 1.0 Pro / Lite, Kling 2.1 Master / Pro / Standard, Wan 2.2 T2V / I2V |
| **Topaz Labs** | Upscale | Standard V2, High Fidelity V2, Low Resolution V2, CGI, Text Refine, Standard MAX, Recovery V2, Redefine, Wonder |

## Tech Stack

- **Framework** — Next.js 16 (App Router, Server Actions, Turbopack)
- **Language** — TypeScript
- **Database** — PostgreSQL with Drizzle ORM
- **Storage** — Cloudflare R2 (S3-compatible)
- **Image Processing** — Sharp (thumbnail generation)
- **UI** — Tailwind CSS 4, Radix UI, Lucide icons

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Cloudflare R2 bucket with public access
- API keys for the providers you want to use

### Setup

1. Clone the repo and install dependencies:

```bash
pnpm install
```

2. Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

The required environment variables:

```
DATABASE_URL=postgresql://localhost:5432/generative_media

# AI Providers (add keys for the ones you want to use)
GOOGLE_GENAI_API_KEY=
OPENAI_API_KEY=
RUNWAYML_API_SECRET=
TOGETHER_API_KEY=
TOPAZ_API_KEY=

# Cloudflare R2 Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

3. Run database migrations:

```bash
pnpm db:migrate
```

4. Start the dev server:

```bash
pnpm dev
```

The app runs at [http://localhost:4000](http://localhost:4000).

## How It Works

### Generation Flow

1. You create a project (or one is created automatically on first generation).
2. Pick a generation type, model, and write a prompt. Optionally attach a reference image.
3. The app routes the request to the appropriate provider.
   - **Synchronous** (text-to-image): The provider returns the result immediately. It's saved to R2 and a thumbnail is generated.
   - **Asynchronous** (video, upscale): The provider returns a job ID. The client polls `/api/jobs/[id]` every 5 seconds until the job completes (30-minute timeout). On completion, the result is downloaded, saved to R2, and a thumbnail is generated for image assets.
4. Results appear in the project's generation feed as thumbnails. Click any to open the full-resolution lightbox.

### Project Structure

```
src/
├── app/
│   ├── api/                # API routes (job polling, upload, media proxy)
│   ├── create/             # Project creation and editing pages
│   └── settings/           # Provider and model reference page
├── components/
│   ├── create/             # Generation UI (input, feed, grid, lightbox)
│   ├── sidebar/            # Navigation sidebar
│   └── ui/                 # Shared UI components (button, badge, dialog, etc.)
├── hooks/                  # Client hooks (job polling)
└── lib/
    ├── db/                 # Database client and Drizzle schema
    ├── providers/          # Provider implementations (gemini, openai, runway, together, topaz)
    ├── actions.ts          # Server actions (generate, project CRUD)
    ├── models.ts           # Model definitions and lookup
    ├── media-storage.ts    # R2 upload/URL generation
    └── thumbnail.ts        # Sharp-based thumbnail generation
```

### Database

Four tables managed by Drizzle ORM:

- **projects** — Title, timestamps. Top-level organizer.
- **generations** — Prompt, provider, model, generation type, reference image. Belongs to a project.
- **media_assets** — The output file (image or video) stored in R2 with dimensions, thumbnail path, and metadata. Belongs to a generation.
- **generation_jobs** — Tracks async job status, provider job ID, errors, and timeout. Belongs to a generation.

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server on port 4000 with Turbopack |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm backfill:thumbnails` | Generate thumbnails for existing image assets |
