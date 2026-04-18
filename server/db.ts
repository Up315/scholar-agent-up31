import fs from 'fs';
import path from 'path';

type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  createdAt: Date;
  lastSignedIn: Date;
  password?: string;
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

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

const memoryUsers: Map<string, User> = new Map();
const memoryConversations: Map<number, Conversation> = new Map();
const memoryMessages: Map<number, Message> = new Map();
let userIdCounter = 1;
let conversationIdCounter = 1;
let messageIdCounter = 1;
let initialized = false;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn(`[FileStorage] Error loading ${filePath}:`, error);
  }
  return defaultValue;
}

function saveToFile<T>(filePath: string, data: T) {
  try {
    ensureDataDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`[FileStorage] Error saving ${filePath}:`, error);
  }
}

function loadAllFromFileStorage() {
  if (initialized) return;
  
  const usersData = loadFromFile<{ users: User[]; counter: number }>(USERS_FILE, { users: [], counter: 1 });
  const conversationsData = loadFromFile<{ conversations: Conversation[]; counter: number }>(CONVERSATIONS_FILE, { conversations: [], counter: 1 });
  const messagesData = loadFromFile<{ messages: Message[]; counter: number }>(MESSAGES_FILE, { messages: [], counter: 1 });

  usersData.users.forEach(u => memoryUsers.set(u.openId, u));
  conversationsData.conversations.forEach(c => memoryConversations.set(c.id, c));
  messagesData.messages.forEach(m => memoryMessages.set(m.id, m));

  userIdCounter = usersData.counter;
  conversationIdCounter = conversationsData.counter;
  messageIdCounter = messagesData.counter;
  initialized = true;

  console.log(`[FileStorage] Loaded ${memoryUsers.size} users, ${memoryConversations.size} conversations, ${memoryMessages.size} messages`);
}

function saveAllToFileStorage() {
  const usersData = {
    users: Array.from(memoryUsers.values()),
    counter: userIdCounter
  };
  const conversationsData = {
    conversations: Array.from(memoryConversations.values()),
    counter: conversationIdCounter
  };
  const messagesData = {
    messages: Array.from(memoryMessages.values()),
    counter: messageIdCounter
  };

  saveToFile(USERS_FILE, usersData);
  saveToFile(CONVERSATIONS_FILE, conversationsData);
  saveToFile(MESSAGES_FILE, messagesData);
}

loadAllFromFileStorage();

export async function upsertUser(user: InsertUser): Promise<User> {
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
    saveAllToFileStorage();
    return updated;
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
  saveAllToFileStorage();
  console.log("[FileStorage] Created user:", newUser.id, newUser.name);
  return newUser;
}

export async function getUserByOpenId(openId: string): Promise<User | null> {
  return memoryUsers.get(openId) || null;
}

export async function getUserById(id: number): Promise<User | null> {
  for (const user of memoryUsers.values()) {
    if (user.id === id) return user;
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
  saveAllToFileStorage();
  console.log("[FileStorage] Created conversation:", newConv.id);
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
  
  saveAllToFileStorage();
  console.log("[FileStorage] Added message:", newMsg.id, "to conversation:", conversationId);
}

export async function clearConversationMessages(conversationId: number): Promise<void> {
  for (const [id, msg] of memoryMessages) {
    if (msg.conversationId === conversationId) {
      memoryMessages.delete(id);
    }
  }
  saveAllToFileStorage();
}

export async function updateConversationTitle(conversationId: number, title: string): Promise<void> {
  const conv = memoryConversations.get(conversationId);
  if (conv) {
    conv.title = title;
    conv.updatedAt = new Date();
    saveAllToFileStorage();
  }
}

export async function deleteConversation(conversationId: number): Promise<void> {
  memoryConversations.delete(conversationId);
  for (const [id, msg] of memoryMessages) {
    if (msg.conversationId === conversationId) {
      memoryMessages.delete(id);
    }
  }
  saveAllToFileStorage();
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
  saveAllToFileStorage();
  console.log("[FileStorage] Created new conversation:", newConv.id);
  return newConv;
}

export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const openId = `local:${username}`;

  const existingUser = memoryUsers.get(openId);
  if (existingUser) {
    const storedPassword = existingUser.password;
    if (storedPassword === password) {
      const updated = { ...existingUser, lastSignedIn: new Date() };
      memoryUsers.set(openId, updated);
      saveAllToFileStorage();
      return updated;
    }
    return null;
  }

  const newUser: User = {
    id: userIdCounter++,
    openId,
    name: username,
    email: `${username}@local`,
    loginMethod: "local",
    createdAt: new Date(),
    lastSignedIn: new Date(),
    password,
  };
  
  memoryUsers.set(openId, newUser);
  saveAllToFileStorage();
  console.log("[FileStorage] Created new user:", newUser.id, newUser.name);
  return newUser;
}

export async function registerUser(username: string, password: string): Promise<User | null> {
  const openId = `local:${username}`;

  const existingUser = memoryUsers.get(openId);
  if (existingUser) {
    return null;
  }

  const newUser: User = {
    id: userIdCounter++,
    openId,
    name: username,
    email: `${username}@local`,
    loginMethod: "local",
    createdAt: new Date(),
    lastSignedIn: new Date(),
    password,
  };
  
  memoryUsers.set(openId, newUser);
  saveAllToFileStorage();
  console.log("[FileStorage] Registered new user:", newUser.id, newUser.name);
  return newUser;
}
