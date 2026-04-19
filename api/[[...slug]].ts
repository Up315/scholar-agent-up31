import 'dotenv/config';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../server/routers';
import { createContext } from '../server/_core/context';

console.log('[API] Serverless function module loaded');

const handler = async (req: Request) => {
  console.log('[API] Request received:', req.method, req.url);
  
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createContext({ req }),
    onError({ error, path }) {
      console.error(`[tRPC] Error on '${path}':`, error);
    },
  });
};

export { handler as GET, handler as POST };
