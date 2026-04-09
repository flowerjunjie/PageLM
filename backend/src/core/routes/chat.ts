import { handleAsk } from "../../lib/ai/ask";
import { parseMultipart, handleUpload } from "../../lib/parser/upload";
import {
  mkChat,
  getChat,
  addMsg,
  listChats,
  getMsgs,
} from "../../utils/chat/chat";
import { emitToAll } from "../../utils/chat/ws";
import { config } from "../../config/env";
import { createWebSocketAuth, createWebSocketRateLimiter } from "../middleware/websocket";
import { requireAuth } from "../middleware/auth";

// Initialize WebSocket auth middleware if JWT secret is configured
const wsAuth = config.jwtSecret
  ? createWebSocketAuth({ secret: config.jwtSecret })
  : null;

const connectionLimiter = createWebSocketRateLimiter(5, 60000);

type UpFile = { path: string; filename: string; mimeType: string };

const chatSockets = new Map<string, Set<any>>();

export function chatRoutes(app: any) {
  app.ws("/ws/chat", (ws: any, req: any) => {
    // Apply connection rate limiting
    if (!connectionLimiter(ws, req)) {
      return;
    }

    // Apply authentication if configured
    if (wsAuth && !wsAuth(ws, req)) {
      console.warn('[chat] WebSocket auth failed for connection');
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const chatId = url.searchParams.get("chatId");
    if (!chatId) {
      return ws.close(1008, "chatId required");
    }

    let set = chatSockets.get(chatId);
    if (!set) {
      set = new Set();
      chatSockets.set(chatId, set);
    }
    set.add(ws);

    // Heartbeat to detect dead connections
    const iv = setInterval(() => {
      try {
        if (ws.readyState === 1) {
          ws.send(JSON.stringify({ type: "ping", t: Date.now() }));
        }
      } catch {}
    }, 15000);

    ws.on("close", (code: number, reason: string) => {
      clearInterval(iv);
      set!.delete(ws);
      if (set!.size === 0) chatSockets.delete(chatId);
    });

    ws.send(JSON.stringify({ type: "ready", chatId }));
  });

  app.post("/chat", requireAuth, async (req: any, res: any, next: any) => {
    try {
      const ct = String(req.headers["content-type"] || "");
      const isMp = ct.includes("multipart/form-data");

      // Input validation constants (aligned with ask.ts MAX_QUESTION_LENGTH)
      const MAX_QUESTION_LENGTH = 2000;
      const CHAT_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

      let q = "";
      let chatId: string | undefined;
      let files: UpFile[] = [];

      if (isMp) {
        const { q: mq, chatId: mcid, files: mf } = await parseMultipart(req);
        q = mq;
        chatId = mcid;
        files = mf || [];
        if (!q)
          return res.status(400).send({ error: "q required for file uploads" });
      } else {
        q = req.body?.q || "";
        chatId = req.body?.chatId;
        if (!q) return res.status(400).send({ error: "q required" });
      }

      // Input validation
      if (q.length > MAX_QUESTION_LENGTH) {
        return res.status(400).send({
          error: "Question too long",
          message: `Maximum length is ${MAX_QUESTION_LENGTH} characters`
        });
      }

      if (chatId && !CHAT_ID_PATTERN.test(chatId)) {
        return res.status(400).send({
          error: "Invalid chatId format",
          message: "chatId must be 1-64 alphanumeric characters, underscores, or hyphens"
        });
      }

      let chat = chatId ? await getChat(chatId) : undefined;
      if (!chat) chat = await mkChat(q);
      const id = chat.id;
      const ns = `chat:${id}`;

      res
        .status(202)
        .send({ ok: true, chatId: id, stream: `/ws/chat?chatId=${id}` });
      (async () => {
        try {
          if (isMp) {
            emitToAll(chatSockets.get(id), {
              type: "phase",
              value: "upload_start",
            });
            for (const f of files) {
              emitToAll(chatSockets.get(id), {
                type: "file",
                filename: f.filename,
                mime: f.mimeType,
              });
              await handleUpload({
                filePath: f.path,
                filename: f.filename,
                contentType: f.mimeType,
                namespace: ns,
              });
            }
            emitToAll(chatSockets.get(id), {
              type: "phase",
              value: "upload_done",
            });
          }

          await addMsg(id, { role: "user", content: q, at: Date.now() });
          emitToAll(chatSockets.get(id), {
            type: "phase",
            value: "generating",
          });

          let answer: any = "";

          const msgHistory = await getMsgs(id);
          const relevantHistory = msgHistory.slice(-20);

          answer = await handleAsk({
            q,
            namespace: ns,
            history: relevantHistory,
          });

          console.log('[chat] Answer received, sending to frontend via WebSocket');
          await addMsg(id, {
            role: "assistant",
            content: answer,
            at: Date.now(),
          });
          emitToAll(chatSockets.get(id), { type: "answer", answer });

          // Emit materials if generated
          if (answer?.materials) {
            console.log('[chat] Emitting generated materials');
            emitToAll(chatSockets.get(id), {
              type: "materials",
              materials: answer.materials
            });
          }

          emitToAll(chatSockets.get(id), { type: "done" });
          console.log('[chat] WebSocket messages sent');
        } catch (err: any) {
          const msg = err?.message || "failed";
          const stack = err?.stack || String(err);
          console.error("[chat] err inner", { chatId: id, msg, stack });
          emitToAll(chatSockets.get(id), { type: "error", error: msg });
        }
      })().catch((e: any) => {
        console.error("[chat] err runner", e?.message || e);
      });
    } catch (e: any) {
      console.error("[chat] err outer", e?.message || e);
      next(e);
    }
  });

  app.get("/chats", requireAuth, async (_: any, res: any) => {
    const chats = await listChats();
    res.send({ ok: true, chats });
  });

  app.get("/chats/:id", requireAuth, async (req: any, res: any) => {
    const id = req.params.id;
    const chat = await getChat(id);
    if (!chat) {
      return res.status(404).send({ error: "not found" });
    }
    const messages = await getMsgs(id);
    res.send({ ok: true, chat, messages });
  });
}
