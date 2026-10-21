// Prisma 7 reads connection settings from this file, not from schema.prisma.
// The CLI (migrate) uses DIRECT_URL, a non-pooled Supabase connection on port 5432.
// At runtime the app uses DATABASE_URL (pooled) through the pg driver adapter.
// See src/prisma/prisma.service.ts.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
