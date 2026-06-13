# GMinsta — Share moments, beautifully

GMinsta is a premium social media app for sharing photos, following creators, chatting in real-time, and discovering content via hashtags. Built with React + TypeScript on the frontend, with two interchangeable backend options: **Supabase (Lovable Cloud)** for the hosted preview, and a **self-hosted Express + MongoDB + Socket.io** server for local development.

## ✨ Features

- 🔐 Email/password authentication
- 🖼️ Photo posts with captions and auto-extracted `#hashtags`
- ❤️ Likes and 💬 comments with notifications
- 👥 Follow / unfollow, suggested users
- 💬 Real-time direct messaging (Socket.io) with sent/delivered/read status
- 🔔 Notifications feed (likes, comments, follows)
- 🔎 Search users and hashtags
- 🧭 Explore grid of latest posts
- 🌗 Dark, glassmorphism + gradient UI design system

## 🧱 Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui (Radix UI primitives)
- TanStack React Query
- React Router
- Recharts, Embla Carousel, Sonner (toasts)

**Backend (choose one)**
1. **Lovable Cloud / Supabase** — Postgres with RLS, Auth, Storage, Realtime (see `supabase/`)
2. **Local Express server** — Node.js, Express, MongoDB (Mongoose), JWT auth, Socket.io (see `server/`)

## 📁 Project Structure

```
.
├── src/                  # React frontend
│   ├── components/       # UI components (incl. shadcn/ui in components/ui)
│   ├── pages/             # Route pages (Feed, Profile, Messages, etc.)
│   ├── providers/         # Auth context/provider
│   ├── integrations/      # Supabase client + generated types
│   ├── lib/                # API client, socket client, utils
│   └── hooks/              # Custom hooks
├── server/                # Standalone Express + MongoDB backend
│   └── src/
│       ├── config/         # DB connection
│       ├── models/         # Mongoose schemas
│       ├── controllers/    # Route handlers
│       ├── routes/          # Express routers
│       ├── middleware/      # Auth, error handling, uploads
│       └── socket/           # Socket.io handlers
├── supabase/              # Supabase config + SQL migrations
└── public/                # Static assets
```

## 🚀 Getting Started (Frontend)

```bash
npm install
npm run dev
```

The app runs at `http://localhost:8080`.

### Environment variables

By default the frontend is configured to use Lovable Cloud / Supabase (see `.env`). To use the local Express backend instead, set:

```
VITE_API_URL=http://localhost:5000
```

## 🖥️ Running the Local Backend (Express + MongoDB)

```bash
cd server
cp .env.example .env   # edit JWT_SECRET, etc.
npm install
npm run dev
```

This starts the API + WebSocket server at `http://localhost:5000`. See [`server/README.md`](server/README.md) for full API reference, Socket.io events, and data models.

Requires a local MongoDB instance (default URI: `mongodb://127.0.0.1:27017/gminsta`).

## 🗄️ Supabase Setup

The `supabase/migrations` folder contains the full schema (profiles, posts, likes, comments, follows, messages, notifications) with Row Level Security policies and storage buckets for post images and avatars. Apply migrations via the Supabase CLI or Lovable Cloud's built-in database tooling.

## 🧪 Testing

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

Uses Vitest + Testing Library with jsdom.

## 🛠️ Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run build:dev` | Development-mode build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests with Vitest |

## 📄 License

This project is for educational/portfolio purposes.

Aditya Basavaraj | CSE Department | GM University Davangere
