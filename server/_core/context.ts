import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as db from "../db";

let devUser: User & { id: number } | null = null;

async function getOrCreateDevUser(): Promise<User & { id: number }> {
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
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  if (!ENV.isProduction && !ENV.oAuthServerUrl) {
    user = await getOrCreateDevUser();
  } else {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
