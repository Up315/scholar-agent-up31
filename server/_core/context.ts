import { sdk } from "./sdk.js";
import { ENV } from "./env.js";
import * as db from "../db.js";

type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  createdAt: Date;
  lastSignedIn: Date;
};

let devUser: User | null = null;

async function getOrCreateDevUser(): Promise<User> {
  if (devUser) return devUser;
  
  devUser = await db.upsertUser({
    openId: "dev-user-001",
    name: "用户",
    email: "dev@example.com",
    loginMethod: "dev",
    lastSignedIn: new Date(),
  });
  
  return devUser;
}

export type TrpcContext = {
  req?: Request | any;
  res?: any;
  user: User | null;
};

export async function createContext(opts?: { req?: Request | any; res?: any }): Promise<TrpcContext> {
  let user: User | null = null;

  if (!ENV.isProduction && !ENV.oAuthServerUrl) {
    user = await getOrCreateDevUser();
  } else {
    try {
      if (opts?.req) {
        user = await sdk.authenticateRequest(opts.req);
      }
    } catch (error) {
      user = null;
    }
  }

  return {
    req: opts?.req,
    res: opts?.res,
    user,
  };
}
