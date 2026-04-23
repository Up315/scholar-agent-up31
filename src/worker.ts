import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { trpcServer } from '@hono/trpc-server';
import { serveStatic } from 'hono/cloudflare-workers';
import { appRouter } from '../server/routers.js';
import { createContext } from '../server/_core/context.js';
import { COOKIE_NAME, ONE_YEAR_MS } from '../shared/const.js';
import * as db from '../server/db.js';
import { sdk } from '../server/_core/sdk.js';
import { initEnv } from '../server/_core/env.js';

type Bindings = {
  NODE_ENV: string;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_API_URL: string;
  AMAP_API_KEY: string;
  JWT_SECRET: string;
  VITE_APP_ID: string;
  DATABASE_URL: string;
  OAUTH_SERVER_URL: string;
  OWNER_OPEN_ID: string;
  BUILT_IN_FORGE_API_URL: string;
  BUILT_IN_FORGE_API_KEY: string;
  ASSETS: Fetcher;
  RATE_LIMIT_MAX?: string;
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_DEFAULT = 30;

function getRateLimitKey(c: any): string {
  const ip = c.req.header('CF-Connecting-IP') || 
             c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
             'unknown';
  return `rate:${ip}`;
}

function checkRateLimit(c: any, maxRequests: number): { allowed: boolean; remaining: number; resetIn: number } {
  const key = getRateLimitKey(c);
  const now = Date.now();
  
  for (const [k, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(k);
    }
  }
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetAt - now };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetIn: record.resetAt - now };
}

const ALLOWED_ORIGINS = [
  'https://scholar-agent.3300709163.workers.dev',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.endsWith('.workers.dev')) return true;
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  return false;
}

function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('API key') || 
        error.message.includes('token') ||
        error.message.includes('secret') ||
        error.message.includes('password')) {
      return '服务暂时不可用，请稍后再试';
    }
    return '操作失败，请稍后再试';
  }
  return '服务暂时不可用';
}

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', async (c, next) => {
  initEnv({
    NODE_ENV: c.env.NODE_ENV || 'production',
    VITE_APP_ID: c.env.VITE_APP_ID || 'scholar-agent',
    JWT_SECRET: c.env.JWT_SECRET || 'scholar-agent-jwt-secret-key-2024',
    DATABASE_URL: c.env.DATABASE_URL || '',
    OAUTH_SERVER_URL: c.env.OAUTH_SERVER_URL || '',
    OWNER_OPEN_ID: c.env.OWNER_OPEN_ID || '',
    BUILT_IN_FORGE_API_URL: c.env.BUILT_IN_FORGE_API_URL || '',
    BUILT_IN_FORGE_API_KEY: c.env.BUILT_IN_FORGE_API_KEY || '',
    DEEPSEEK_API_KEY: c.env.DEEPSEEK_API_KEY || '',
    DEEPSEEK_API_URL: c.env.DEEPSEEK_API_URL || 'https://api.deepseek.com',
    AMAP_API_KEY: c.env.AMAP_API_KEY || '',
  });
  await next();
});

app.use('/assets/*', serveStatic({ root: './' }));
app.use('/__manus__/*', serveStatic({ root: './' }));
app.use('/index.html', serveStatic({ root: './' }));

const api = app.basePath('/api');

api.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  
  if (!isAllowedOrigin(origin)) {
    console.log('[Security] Blocked request from unauthorized origin:', origin);
    return c.json({ error: '访问被拒绝' }, 403);
  }
  
  await next();
});

api.use('*', async (c, next) => {
  const maxRequests = parseInt(c.env.RATE_LIMIT_MAX || String(RATE_LIMIT_MAX_DEFAULT));
  const { allowed, remaining, resetIn } = checkRateLimit(c, maxRequests);
  
  c.header('X-RateLimit-Limit', String(maxRequests));
  c.header('X-RateLimit-Remaining', String(remaining));
  c.header('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));
  
  if (!allowed) {
    console.log('[Security] Rate limit exceeded for:', getRateLimitKey(c));
    return c.json({ 
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil(resetIn / 1000)
    }, 429);
  }
  
  await next();
});

api.use('*', async (c, next) => {
  console.log('[API] Request:', c.req.method, c.req.path, 'from:', getRateLimitKey(c));
  await next();
});

api.use('*', cors({
  origin: (origin) => {
    if (isAllowedOrigin(origin)) {
      return origin;
    }
    return ALLOWED_ORIGINS[0];
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposeHeaders: ['Set-Cookie', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400,
}));

api.use('*', secureHeaders({
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  xXssProtection: '1; mode=block',
}));

api.use('/trpc/*', trpcServer({
  router: appRouter,
  createContext: async (opts) => {
    console.log('[tRPC] Creating context');
    try {
      const ctx = await createContext({ req: opts.req });
      return ctx;
    } catch (error) {
      console.error('[tRPC] Context error:', error);
      throw new Error('认证失败');
    }
  },
}));

api.onError((err, c) => {
  console.error('[API] Error:', err.message);
  return c.json({ error: sanitizeError(err) }, 500);
});

api.notFound((c) => {
  return c.json({ error: '资源不存在' }, 404);
});

api.post('/login', async (c) => {
  console.log('[API] Login request');
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return c.json({ error: '无效的输入格式' }, 400);
  }

  if (username.length > 50 || password.length > 100) {
    return c.json({ error: '输入超出长度限制' }, 400);
  }

  try {
    const result = await db.authenticateUser(username, password);
    
    if (result.locked) {
      return c.json({ error: '账户已被锁定，请15分钟后再试' }, 423);
    }
    
    if (!result.user) {
      const remaining = result.remainingAttempts;
      if (remaining <= 2) {
        return c.json({ 
          error: `用户名或密码错误，还剩 ${remaining} 次尝试机会` 
        }, 401);
      }
      return c.json({ error: '用户名或密码错误' }, 401);
    }

    const sessionToken = await sdk.createSessionToken(result.user.openId, {
      name: result.user.name || username,
      expiresInMs: ONE_YEAR_MS,
    });

    c.header('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${ONE_YEAR_MS / 1000}`);
    
    return c.json({ success: true, user: { id: result.user.id, name: result.user.name } });
  } catch (error) {
    console.error('[Login] Failed', error);
    return c.json({ error: '登录失败，请稍后再试' }, 500);
  }
});

api.post('/register', async (c) => {
  console.log('[API] Register request');
  const body = await c.req.json();
  const { username, password } = body;

  if (!username || !password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return c.json({ error: '无效的输入格式' }, 400);
  }

  if (username.length < 2 || username.length > 50) {
    return c.json({ error: '用户名长度需在2-50字符之间' }, 400);
  }

  if (password.length < 6 || password.length > 100) {
    return c.json({ error: '密码长度需在6-100字符之间' }, 400);
  }

  if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
    return c.json({ error: '用户名只能包含字母、数字、下划线和中文' }, 400);
  }

  try {
    const user = await db.registerUser(username, password);
    
    if (!user) {
      return c.json({ error: '该用户名已被注册' }, 400);
    }

    const sessionToken = await sdk.createSessionToken(user.openId, {
      name: user.name || username,
      expiresInMs: ONE_YEAR_MS,
    });

    c.header('Set-Cookie', `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${ONE_YEAR_MS / 1000}`);
    
    return c.json({ success: true, user: { id: user.id, name: user.name } });
  } catch (error) {
    console.error('[Register] Failed', error);
    return c.json({ error: '注册失败，请稍后再试' }, 500);
  }
});

api.post('/logout', async (c) => {
  c.header('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0`);
  return c.json({ success: true });
});

api.get('/me', async (c) => {
  try {
    const cookieHeader = c.req.header('Cookie');
    if (!cookieHeader) {
      return c.json({ user: null });
    }
    
    const cookies = new Map(
      cookieHeader.split(';').map(s => s.trim().split('=') as [string, string])
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

api.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('*', async (c) => {
  return await c.env.ASSETS.fetch(c.req.raw);
});

export default app;
