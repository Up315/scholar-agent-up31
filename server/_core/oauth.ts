import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const.js";
import { ENV } from "./env.js";
import type { Express, Request, Response } from "express";
import * as db from "../db.js";
import { getSessionCookieOptions } from "./cookies.js";
import { sdk } from "./sdk.js";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  app.post("/api/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "用户名和密码不能为空" });
      return;
    }

    try {
      const user = await db.authenticateUser(username, password);
      
      if (!user) {
        res.status(401).json({ error: "用户名或密码错误" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { id: user.id, name: user.name } });
    } catch (error) {
      console.error("[Login] Failed", error);
      res.status(500).json({ error: "登录失败" });
    }
  });

  app.post("/api/register", async (req: Request, res: Response) => {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: "用户名和密码不能为空" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "密码长度至少6位" });
      return;
    }

    try {
      const openId = `local:${username}`;
      const existingUser = await db.getUserByOpenId(openId);
      
      if (existingUser) {
        res.status(400).json({ error: "该用户名已被注册" });
        return;
      }

      const user = await db.registerUser(username, password);
      
      if (!user) {
        res.status(500).json({ error: "注册失败" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(user.openId, {
        name: user.name || username,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      res.json({ success: true, user: { id: user.id, name: user.name } });
    } catch (error) {
      console.error("[Register] Failed", error);
      res.status(500).json({ error: "注册失败" });
    }
  });

  app.post("/api/logout", async (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });

  app.get("/api/me", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      res.json({ user: user ? { id: user.id, name: user.name } : null });
    } catch {
      res.json({ user: null });
    }
  });

  if (!ENV.isProduction && !ENV.oAuthServerUrl) {
    console.log("[OAuth] Development mode: enabling dev login at /api/dev-login");
    
    app.get("/api/dev-login", async (req: Request, res: Response) => {
      try {
        const devUserOpenId = "dev-user-001";
        const devUserName = (req.query.name as string) || "开发者";
        
        console.log("[Dev Login] Creating session for:", devUserName);
        
        const user = await db.upsertUser({
          openId: devUserOpenId,
          name: devUserName,
          email: "dev@example.com",
          loginMethod: "dev",
          lastSignedIn: new Date(),
        });

        console.log("[Dev Login] User created/found:", user.id);

        const sessionToken = await sdk.createSessionToken(devUserOpenId, {
          name: devUserName,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(req);
        res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        console.log("[Dev Login] Session created, redirecting to /chat");
        res.redirect(302, "/chat");
      } catch (error) {
        console.error("[Dev Login] Failed", error);
        res.status(500).send("Dev login failed: " + (error instanceof Error ? error.message : String(error)));
      }
    });
  }
}
