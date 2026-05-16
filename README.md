# Vendora

AI-powered omnichannel marketing media and e-commerce listing generator.

## Tech Stack

- **Next.js 15** (App Router, TypeScript, React Server Components)
- **Supabase** (Postgres, Auth, Storage)
- **Tailwind CSS**

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a Supabase project at [https://supabase.com](https://supabase.com) and copy your project URL and anon key into `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Run the database migration

Apply the schema in `supabase/migrations/0001_campaigns.sql` to your Supabase project (via the SQL Editor or `supabase db push`).

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   └── dashboard/
├── lib/
│   ├── supabase/
│   └── actions/
└── middleware.ts
```
