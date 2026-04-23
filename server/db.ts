type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  createdAt: Date;
  lastSignedIn: Date;
  passwordHash?: string;
  loginAttempts?: number;
  lockedUntil?: number;
};

type Conversation = {
  id: number;
  userId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type Message = {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  toolName: string | null;
  toolInput: string | null;
  toolOutput: string | null;
  createdAt: Date;
};

type InsertUser = {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
};

type SafeUser = Omit<User, 'passwordHash' | 'loginAttempts' | 'lockedUntil'>;

const memoryUsers: Map<string, User> = new Map();
const memoryConversations: Map<number, Conversation> = new Map();
const memoryMessages: Map<number, Message> = new Map();
let userIdCounter = 1;
let conversationIdCounter = 1;
let messageIdCounter = 1;

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('scholar-agent-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashPassword(password: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(password + 'scholar-agent-pepper')
  );
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(hashBuffer))));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

function toSafeUser(user: User): SafeUser {
  const { passwordHash, loginAttempts, lockedUntil, ...safeUser } = user;
  return safeUser;
}

console.log("[MemoryStorage] Initialized in-memory storage (Cloudflare Workers compatible)");

export async function upsertUser(user: InsertUser): Promise<SafeUser> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const existingUser = memoryUsers.get(user.openId);
  if (existingUser) {
    const updated: User = {
      ...existingUser,
      name: user.name ?? existingUser.name,
      email: user.email ?? existingUser.email,
      loginMethod: user.loginMethod ?? existingUser.loginMethod,
      lastSignedIn: user.lastSignedIn ?? new Date(),
    };
    memoryUsers.set(user.openId, updated);
    return toSafeUser(updated);
  }

  const newUser: User = {
    id: userIdCounter++,
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    createdAt: new Date(),
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  memoryUsers.set(user.openId, newUser);
  console.log("[MemoryStorage] Created user:", newUser.id, newUser.name);
  return toSafeUser(newUser);
}

export async function getUserByOpenId(openId: string): Promise<SafeUser | null> {
  const user = memoryUsers.get(openId);
  return user ? toSafeUser(user) : null;
}

export async function getUserById(id: number): Promise<SafeUser | null> {
  for (const user of Array.from(memoryUsers.values())) {
    if (user.id === id) return toSafeUser(user);
  }
  return null;
}

export async function getOrCreateConversation(
  userId: number,
  conversationId?: number
): Promise<Conversation | null> {
  if (conversationId) {
    return memoryConversations.get(conversationId) || null;
  }

  const newConv: Conversation = {
    id: conversationIdCounter++,
    userId,
    title: "New Conversation",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryConversations.set(newConv.id, newConv);
  console.log("[MemoryStorage] Created conversation:", newConv.id);
  return newConv;
}

export async function getUserConversations(userId: number): Promise<Conversation[]> {
  return Array.from(memoryConversations.values())
    .filter(c => c.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getConversationMessages(conversationId: number): Promise<Message[]> {
  return Array.from(memoryMessages.values())
    .filter(m => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function addMessage(
  conversationId: number,
  role: string,
  content: string,
  toolName?: string | null,
  toolInput?: string | null,
  toolOutput?: string | null
): Promise<void> {
  const newMsg: Message = {
    id: messageIdCounter++,
    conversationId,
    role,
    content,
    toolName: toolName || null,
    toolInput: toolInput || null,
    toolOutput: toolOutput || null,
    createdAt: new Date(),
  };
  memoryMessages.set(newMsg.id, newMsg);
  
  const conv = memoryConversations.get(conversationId);
  if (conv) {
    conv.updatedAt = new Date();
  }
  
  console.log("[MemoryStorage] Added message:", newMsg.id, "to conversation:", conversationId);
}

export async function clearConversationMessages(conversationId: number): Promise<void> {
  for (const [id, msg] of Array.from(memoryMessages)) {
    if (msg.conversationId === conversationId) {
      memoryMessages.delete(id);
    }
  }
}

export async function updateConversationTitle(conversationId: number, title: string): Promise<void> {
  const conv = memoryConversations.get(conversationId);
  if (conv) {
    conv.title = title;
    conv.updatedAt = new Date();
  }
}

export async function deleteConversation(conversationId: number): Promise<void> {
  memoryConversations.delete(conversationId);
  for (const [id, msg] of Array.from(memoryMessages)) {
    if (msg.conversationId === conversationId) {
      memoryMessages.delete(id);
    }
  }
}

export async function createNewConversation(userId: number, title?: string): Promise<Conversation> {
  const newConv: Conversation = {
    id: conversationIdCounter++,
    userId,
    title: title || "新对话",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  memoryConversations.set(newConv.id, newConv);
  console.log("[MemoryStorage] Created new conversation:", newConv.id);
  return newConv;
}

export async function authenticateUser(username: string, password: string): Promise<{ user: SafeUser | null; locked: boolean; remainingAttempts: number }> {
  const openId = `local:${username}`;
  const existingUser = memoryUsers.get(openId);
  
  if (existingUser) {
    if (existingUser.lockedUntil && Date.now() < existingUser.lockedUntil) {
      const remainingTime = Math.ceil((existingUser.lockedUntil - Date.now()) / 60000);
      console.log("[Security] Account locked:", username, "for", remainingTime, "minutes");
      return { user: null, locked: true, remainingAttempts: 0 };
    }
    
    const passwordHash = existingUser.passwordHash || '';
    const isValid = passwordHash ? await verifyPassword(password, passwordHash) : false;
    
    if (isValid) {
      const updated: User = {
        ...existingUser,
        lastSignedIn: new Date(),
        loginAttempts: 0,
        lockedUntil: undefined,
      };
      memoryUsers.set(openId, updated);
      return { user: toSafeUser(updated), locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
    }
    
    const attempts = (existingUser.loginAttempts || 0) + 1;
    const updated: User = {
      ...existingUser,
      loginAttempts: attempts,
      lockedUntil: attempts >= MAX_LOGIN_ATTEMPTS ? Date.now() + LOCK_TIME_MS : undefined,
    };
    memoryUsers.set(openId, updated);
    
    console.log("[Security] Failed login attempt:", username, "attempts:", attempts);
    return { 
      user: null, 
      locked: attempts >= MAX_LOGIN_ATTEMPTS, 
      remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts) 
    };
  }

  const hashedPassword = await hashPassword(password);
  const newUser: User = {
    id: userIdCounter++,
    openId,
    name: username,
    email: `${username}@local`,
    loginMethod: "local",
    createdAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: hashedPassword,
    loginAttempts: 0,
  };
  
  memoryUsers.set(openId, newUser);
  console.log("[MemoryStorage] Created new user:", newUser.id, newUser.name);
  return { user: toSafeUser(newUser), locked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
}

export async function registerUser(username: string, password: string): Promise<SafeUser | null> {
  const openId = `local:${username}`;

  const existingUser = memoryUsers.get(openId);
  if (existingUser) {
    return null;
  }

  const hashedPassword = await hashPassword(password);
  const newUser: User = {
    id: userIdCounter++,
    openId,
    name: username,
    email: `${username}@local`,
    loginMethod: "local",
    createdAt: new Date(),
    lastSignedIn: new Date(),
    passwordHash: hashedPassword,
    loginAttempts: 0,
  };
  
  memoryUsers.set(openId, newUser);
  console.log("[MemoryStorage] Registered new user:", newUser.id, newUser.name);
  return toSafeUser(newUser);
}
