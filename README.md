Indus Dashboard (Next.js + Tailwind + React Query)

Getting started
- Prereqs: Node 20+, npm 10+
- Configure environment
  - create `.env.local` with:
    - `NEXT_PUBLIC_API_URL=http://3.111.133.92:8010`
- Install and run
  - `npm install`
  - `npm run dev`
  - open `http://localhost:3000`

Key commands
- `npm run dev` start dev server
- `npm run lint` lint

Auth
- Register at `/register`, then login at `/login`.
- JWT stored in `localStorage` as `access_token` and attached as `Authorization: Bearer <token>` for protected endpoints.

APIs used
- Natural language query: `POST /process_query`
- Poll results: `GET /query_results/poll`
- Dashboard graphs: `GET/POST /dashboard/graphs`, `POST /dashboard/graphs/query`
- Transcripts: `GET/POST /transcripts`, `GET/PATCH/DELETE /transcripts/{id}`

Generated types
- From `openapi.json` → `src/types/api.d.ts` using `openapi-typescript`.
