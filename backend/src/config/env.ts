import { z } from 'zod';

const optional = z.string().optional().transform((v) => (v ? v : undefined));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().default(4000),
    WEB_URL: z.string().url(),
    API_URL: z.string().url(),
    CORS_ORIGINS: z.string().transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean)),
    COOKIE_DOMAIN: optional,
    DATABASE_URL: z.string().min(1),
    JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().default(30),
    CURRENCY: z.string().length(3).default('GHS'),
    TIMEZONE: z.string().default('Africa/Accra'),
    STORE_NAME: z.string().default('Nadel Events'),
    PAYMENT_PROVIDER: z.enum(['mock', 'hubtel']).default('mock'),
    HUBTEL_CLIENT_ID: optional,
    HUBTEL_CLIENT_SECRET: optional,
    HUBTEL_MERCHANT_ACCOUNT: optional,
    HUBTEL_CALLBACK_SECRET: optional,
    /** Turn on only after HubtelGateway.refund/refundStatus are implemented and sandbox-tested. */
    HUBTEL_REFUNDS_ENABLED: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    RESEND_API_KEY: optional,
    EMAIL_FROM: optional,
    OWNER_EMAIL: optional,
    WHATSAPP_BUSINESS_NUMBER: optional,
    CLOUDINARY_CLOUD_NAME: optional,
    CLOUDINARY_API_KEY: optional,
    CLOUDINARY_API_SECRET: optional,
    CLOUDINARY_FOLDER: z.string().regex(/^[a-z0-9-]+$/).default('cake-kitchen'),
    EMAIL_REPLY_TO: optional,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (env.PAYMENT_PROVIDER === 'mock') {
      ctx.addIssue({ code: 'custom', path: ['PAYMENT_PROVIDER'], message: 'mock payments are not allowed in production' });
    }
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Resend is required in production' });
    }
    if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
      ctx.addIssue({ code: 'custom', path: ['CLOUDINARY_API_KEY'], message: 'Cloudinary is required in production (image uploads)' });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
