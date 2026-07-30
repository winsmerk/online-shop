# Repository Guidelines

- Use TypeScript for application and test code.
- Never expose `OPENAI_API_KEY` to client components or logs.
- Keep user assets and generated artifacts under `storage/products/{productId}`.
- Validate all external input and AI output with Zod.
- Pass FFmpeg arguments as arrays to `spawn`; never interpolate untrusted user input into a shell command.
- Preserve intermediate workflow artifacts so failed stages can resume.
- New dashboard data belongs in Supabase; never persist new production jobs or uploads to the local filesystem.
- Vidnoz credentials and Supabase service-role credentials are server-only.
- Authorize every product/job read through the local Supabase ownership mapping.
- Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` before handoff.
