import type { VercelRequest, VercelResponse } from '@vercel/node';
import 'dotenv/config';
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { registerOAuthRoutes } from '../server/_core/oauth';
import { appRouter } from '../server/routers';
import { createContext } from '../server/_core/context';

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

registerOAuthRoutes(app);

app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await new Promise<void>((resolve, reject) => {
    app(req as any, res as any, (err: any) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
