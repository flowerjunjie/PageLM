import { randomUUID } from "crypto";
import db from "../database/keyv";

export type ChatMeta = { id: string; userId: string; title: string; at: number };
export type ChatMsg = { role: "user" | "assistant"; content: any; at: number };

export async function mkChat(t: string, userId: string) {
  const id = randomUUID();
  const c: ChatMeta = { id, userId, title: t.slice(0, 60), at: Date.now() };
  await db.set(`chat:${id}`, c);
  await db.set(`msgs:${id}`, [] as ChatMsg[]);
  const idx = ((await db.get("chat:index")) as string[]) || [];
  idx.unshift(id);
  await db.set("chat:index", idx.slice(0, 1000));
  return c;
}

export async function getChat(id: string, userId?: string): Promise<ChatMeta | null | undefined> {
  const a = await db.get(`chat:${id}`) as ChatMeta | null | undefined;
  if (!a) return a;  // returns null or undefined as-is
  // IDOR protection
  if (userId && a.userId !== userId) {
    console.warn(`[chat] IDOR attempt: user ${userId} tried to access chat ${id} owned by ${a.userId}`);
    return undefined;
  }
  return a;
}

export async function addMsg(id: string, m: ChatMsg, userId?: string) {
  // Verify ownership before adding message
  const chat = await getChat(id, userId);
  if (!chat) return;
  const a = ((await db.get(`msgs:${id}`)) as ChatMsg[]) || [];
  a.push(m);
  await db.set(`msgs:${id}`, a);
  const c = (await db.get(`chat:${id}`)) as ChatMeta;
  if (c) {
    c.at = Date.now();
    await db.set(`chat:${id}`, c);
  }
}

export async function listChats(userId?: string, n = 50) {
  const idx = ((await db.get("chat:index")) as string[]) || [];
  const out: ChatMeta[] = [];
  for (const id of idx.slice(0, n)) {
    const c = (await db.get(`chat:${id}`)) as ChatMeta | undefined;
    if (c && (!userId || c.userId === userId)) out.push(c);
  }
  return out.sort((x, y) => y.at - x.at);
}

export async function getMsgs(id: string, userId?: string) {
  // Verify ownership before getting messages
  const chat = await getChat(id, userId);
  if (!chat) return [];
  const a = ((await db.get(`msgs:${id}`)) as ChatMsg[]) || [];
  return a;
}
