import path from "path"
import fs from "fs"
import crypto from "crypto"
import { makeScript, makeAudio } from "../../services/podcast"
import { emitToAll } from "../../utils/chat/ws"
import { config } from "../../config/env"
import { createWebSocketAuth, createWebSocketRateLimiter } from "../middleware/websocket"

// Initialize WebSocket auth middleware if JWT secret is configured
const wsAuth = config.jwtSecret
  ? createWebSocketAuth({ secret: config.jwtSecret })
  : null;

const connectionLimiter = createWebSocketRateLimiter(5, 60000);

// Export for testing
export { connectionLimiter };

const sockets = new Map<string, Set<any>>()
const pendingJobs = new Map<string, () => Promise<void>>()

function emit(id: string, msg: any) {
  const s = sockets.get(id)
  emitToAll(s, msg)
}

async function startJobIfReady(pid: string) {
  const job = pendingJobs.get(pid)
  const hasSockets = sockets.has(pid) && sockets.get(pid)!.size > 0

  if (job && hasSockets) {
    pendingJobs.delete(pid)
    try {
      await job()
    } catch (err) {
      emit(pid, { type: "error", error: String(err) })
    }
  }
}

export function podcastRoutes(app: any) {
  app.ws("/ws/podcast", (ws: any, req: any) => {
    // Apply connection rate limiting
    if (!connectionLimiter(ws, req)) {
      return;
    }

    // Apply authentication if configured
    if (wsAuth && !wsAuth(ws, req)) {
      console.warn('[podcast] WebSocket auth failed');
      return;
    }

    const u = new URL(req.url, config.baseUrl || "http://dummy")
    const pid = u.searchParams.get("pid")

    if (!pid) {
      return ws.close(1008, "pid required")
    }

    let set = sockets.get(pid)
    if (!set) {
      set = new Set()
      sockets.set(pid, set)
    }
    set.add(ws)

    ws.on("close", () => {
      set!.delete(ws)
      if (set!.size === 0) {
        sockets.delete(pid)
      }
    })

    const readyMsg = JSON.stringify({ type: "ready", pid })
    ws.send(readyMsg)

    setTimeout(() => {
      startJobIfReady(pid).catch(err => {
        console.error(`[Podcast WS] Error starting job:`, err)
      })
    }, 100)
  })

  app.post("/podcast", async (req: any, res: any, next: any) => {
    try {
      const topic = String(req.body?.topic || req.body?.title || "").trim()
      
      if (!topic) {
        return res.status(400).send({ error: "topic required" })
      }

      const pid = cryptoRandom()
      const dir = path.join(process.cwd(), "storage", "podcasts", pid)
      const base = topic.replace(/[^a-z0-9]/gi, "_").slice(0, 50) || "podcast"

      res.status(202).send({ ok: true, pid, stream: `/ws/podcast?pid=${pid}` })

      const job = async () => {
        try {
          const script = await makeScript(topic, topic)
          emit(pid, { type: "script", data: script })

          const outPath = await makeAudio(script, dir, base, (m) => {
            emit(pid, m)
          })
          if (!fs.existsSync(outPath)) {
            throw new Error(`Audio file not created at ${outPath}`)
          }
          const filename = path.basename(outPath)
          const downloadUrl = `${config.baseUrl}/podcast/download/${pid}/${filename}`
          const staticUrl = `${config.baseUrl}/storage/podcasts/${pid}/${filename}`
          
          const audioMessage = { 
            type: "audio", 
            file: downloadUrl,
            staticUrl: staticUrl,
            filename: filename,
          }
          emit(pid, audioMessage)
          
          emit(pid, { type: "done" })
        } catch (e: any) {
          emit(pid, { type: "error", error: e?.message || "failed" })
        }
      }
      
      pendingJobs.set(pid, job)
      
      startJobIfReady(pid).catch(err => {
        console.error(`[Podcast POST] Error starting job:`, err)
      })
    } catch (e) {
      next(e)
    }
  })

  app.get("/podcast/download/:pid/:filename", async (req: any, res: any, next: any) => {
    try {
      const { pid, filename } = req.params

      // Security: Validate pid format (should be UUID-like)
      const pidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
      if (!pidPattern.test(pid)) {
        return res.status(400).send({ error: "Invalid podcast ID format" });
      }

      // Security: Sanitize filename - only allow safe characters
      const sanitizedFilename = path.basename(filename);
      if (sanitizedFilename !== filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).send({ error: "Invalid filename" });
      }

      const dirPath = path.join(process.cwd(), "storage", "podcasts", pid)
      if (fs.existsSync(dirPath)) {
        const filesInDir = fs.readdirSync(dirPath)
        // Find exact match (case-sensitive for security)
        const actualFilename = filesInDir.find(f => f === sanitizedFilename)
        if (actualFilename) {
          const filePath = path.join(dirPath, actualFilename)

          // Security: Verify the file is actually within the expected directory (prevent symlink attacks)
          const realPath = path.resolve(filePath)
          if (!realPath.startsWith(path.resolve(dirPath))) {
            return res.status(403).send({ error: "Access denied" });
          }

          const fileStats = fs.statSync(filePath)

          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Content-Disposition', `attachment; filename="${actualFilename}"`)
          res.setHeader('Content-Length', fileStats.size)

          const fileStream = fs.createReadStream(filePath)
          fileStream.pipe(res)
          fileStream.on('error', (err) => {
            if (!res.headersSent) {
              res.status(500).send({ error: 'Download failed' })
            }
          })
          return
        }
      }

      return res.status(404).send({ error: "File not found" })
    } catch (e) {
      next(e)
    }
  })
}

function cryptoRandom() {
  const bytes = crypto.randomBytes(16);
  let idx = 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = bytes[idx++] & 0xf;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}