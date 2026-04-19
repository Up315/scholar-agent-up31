import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { handle } from 'hono/vercel';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from '../server/routers.js';
import { createContext } from '../server/_core/context.js';
import { COOKIE_NAME, ONE_YEAR_MS } from '../shared/const.js';
import * as db from '../server/db.js';
import { sdk } from '../server/_core/sdk.js';
import { ENV } from '../server/_core/env.js';

console.log('[API] Server starting...');
console.log('[API] NODE_ENV:', process.env.NODE_ENV);
console.log('[API] ENV.isProduction:', ENV.isProduction);

const app = new Hono().basePath('/api');

app.use('*', async (c, next) => {
  console.log('[API] Request:', c.req.method, c.req.path);
  await next();
});

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposeHeaders: ['Set-Cookie'],
  credentials: true,
  maxAge: 86400,
}));

app.use('*', secureHeaders());

app.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: async (opts) => {
    console.log('[tRPC] Creating context for:', opts.req.url);
    try {
      const ctx = await createContext({ req: opts.req });
      console.log('[tRPC] Context created, user:', ctx.user?.id);
      return ctx;
    } catch (error) {
      console.error('[tRPC] Context error:', error);
      throw error;
    }
  },
}));

app.onError((err, c) => {
  console.error('[API] Error:', err);
  return c.json({ error: err.message || 'Internal Server Error' }, 500);
});

app.notFound((c) => {
  console.log('[API] Not found:', c.req.path);
  return c.json({ error: 'Not Found' }, 404);
});

app.post('/login', async (c) => {
  console.log('[API] Login request');
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }

  try {
    const user = await db.authenticateUser(username, password);
    
    if (!user) {
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || username,
      expiresInMs: ONE_YEAR_MS,
    });

    c.header('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${ONE_YEAR_MS / 1000}`);
    
    return c.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error('[Login] Failed', error);
    return c.json({ error: '登录失败' }, 500);
  }
});

app.post('/register', async (c) => {
  console.log('[API] Register request');
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }

  if (password.length < 6) {
    return c.json({ error: '密码长度至少6位' }, 400);
  }

  try {
    const openId = `local:${username}`;
    const existingUser = await db.getUserByOpenId(openId);
    
    if (existingUser) {
      return c.json({ error: '该用户名已被注册' }, 400);
    }

    const user = await db.registerUser(username, password);
    
    if (!user) {
      return c.json({ error: '注册失败' }, 500);
    }

    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || username,
      expiresInMs: ONE_YEAR_MS,
    });

    c.header('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${ONE_YEAR_MS / 1000}`);
    
    return c.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error('[Register] Failed', error);
    return c.json({ error: '注册失败' }, 500);
  }
});

app.post('/logout', async (c) => {
  c.header('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`);
  return c.json({ success: true });
});

app.get('/me', async (c) => {
  try {
    const cookieHeader = c.req.header('Cookie');
    const cookies = new Map(
      (cookieHeader || '').split(';').map(s => s.trim().split('=') as [string, string])
    );
    const sessionCookie = cookies.get(COOKIE_NAME);
    
    if (!sessionCookie) {
      return c.json({ user: null });
    }

    const session = await sdk.verifySession(sessionCookie);
    if (!session) {
      return c.json({ user: null });
    }

    const user = await db.getUserByOpenId(session.openId);
    return c.json({ user: user ? { id: user.id, name: user.name } : null });
  } catch {
    return c.json({ user: null });
  }
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

console.log('[API] Hono app configured, routes:');
console.log('[API] - POST /api/login');
console.log('[API] - POST /api/register');
console.log('[API] - POST /api/logout');
console.log('[API] - GET /api/me');
console.log('[API] - GET /api/health');
console.log('[API] - * /api/trpc/*');

const handler = handle(app);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
