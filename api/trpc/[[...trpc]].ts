import 'dotenv/config';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/routers';
import { createContext } from '../../server/_core/context';

console.log('[tRPC] Module loaded');

async function GET(req: Request) {
  console.log('[tRPC] GET request:', req.url);
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError({ error, path }) {
      console.error(`[tRPC] Error on '${path}':`, error);
    },
  });
}

async function POST(req: Request) {
  console.log('[tRPC] POST request:', req.url);
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError({ error, path }) {
      console.error(`[tRPC] Error on '${path}':`, error);
    },
  });
}

export { GET, POST };
