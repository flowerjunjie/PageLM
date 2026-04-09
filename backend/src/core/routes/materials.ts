import db from "../../utils/database/keyv"
import {
  generateAllMaterials,
  generateFlashcards,
  generateNotesSummary,
  generateQuizQuestions,
  type LearningMaterials,
  type FlashCard,
  type NoteSummary,
  type Quiz,
} from "../../lib/ai/learning-materials"
import { requireAuth } from "../middleware/auth"
import { getUserId } from "../middleware/auth-keyv"

// Storage keys - user isolated
const STORAGE_KEYS = {
  materialsIndex: (userId: string) => `user:${userId}:materials:index`,
  materialsByChat: (userId: string, chatId: string) => `user:${userId}:materials:chat:${chatId}`,
  materialById: (userId: string, id: string) => `user:${userId}:material:${id}`,
}

// Types for stored materials
export interface StoredMaterials {
  id: string
  userId: string
  chatId: string
  messageId?: string
  flashcards: FlashCard[]
  notes: NoteSummary
  quiz: Quiz
  createdAt: number
}

// Save learning materials to database
export async function saveLearningMaterials(
  userId: string,
  chatId: string,
  materials: LearningMaterials,
  messageId?: string
): Promise<StoredMaterials> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const stored: StoredMaterials = {
    id,
    userId,
    chatId,
    messageId,
    flashcards: materials.flashcards,
    notes: materials.notes,
    quiz: materials.quiz,
    createdAt: Date.now(),
  }

  // Save individual material (user-isolated key)
  await db.set(STORAGE_KEYS.materialById(userId, id), stored)

  // Update chat materials index (user-isolated)
  const chatMaterials = (await db.get(STORAGE_KEYS.materialsByChat(userId, chatId))) || []
  chatMaterials.push(id)
  await db.set(STORAGE_KEYS.materialsByChat(userId, chatId), chatMaterials)

  // Update user materials index
  const userIndex = (await db.get(STORAGE_KEYS.materialsIndex(userId))) || []
  userIndex.unshift(id)
  await db.set(STORAGE_KEYS.materialsIndex(userId), userIndex.slice(0, 10000))

  console.log(`[materials] Saved materials ${id} for user ${userId}, chat ${chatId}`)
  return stored
}

// Get materials by chat ID (user-isolated)
export async function getMaterialsByChat(userId: string, chatId: string): Promise<StoredMaterials[]> {
  const materialIds = (await db.get(STORAGE_KEYS.materialsByChat(userId, chatId))) || []

  const materials = await Promise.all(
    materialIds.map(id => db.get(STORAGE_KEYS.materialById(userId, id)))
  )

  return materials.filter(Boolean).sort((a: any, b: any) => b.createdAt - a.createdAt)
}

// Get single material by ID (with ownership verification)
export async function getMaterialById(userId: string, id: string): Promise<StoredMaterials | null> {
  const result = await db.get(STORAGE_KEYS.materialById(userId, id))
  if (!result) return null
  // IDOR protection: verify ownership
  if (result.userId !== userId) {
    console.warn(`[materials] IDOR attempt: user ${userId} tried to access material ${id} owned by ${result.userId}`)
    return null
  }
  return result
}

// Delete materials (with ownership verification)
export async function deleteMaterials(userId: string, id: string): Promise<boolean> {
  const material = await db.get(STORAGE_KEYS.materialById(userId, id))
  if (!material) return false

  // IDOR protection: verify ownership
  if (material.userId !== userId) {
    console.warn(`[materials] IDOR delete attempt: user ${userId} tried to delete material ${id} owned by ${material.userId}`)
    return false
  }

  // Remove from chat index
  const chatMaterials = (await db.get(STORAGE_KEYS.materialsByChat(userId, material.chatId))) || []
  const updatedChatMaterials = ((chatMaterials as string[]) || []).filter((mid: string) => mid !== id)

  // Remove from user index
  const userIndex = (await db.get(STORAGE_KEYS.materialsIndex(userId))) || []
  const updatedUserIndex = ((userIndex as string[]) || []).filter((mid: string) => mid !== id)

  // Parallel writes
  await Promise.all([
    db.set(STORAGE_KEYS.materialsByChat(userId, material.chatId), updatedChatMaterials),
    db.set(STORAGE_KEYS.materialsIndex(userId), updatedUserIndex),
    db.delete(STORAGE_KEYS.materialById(userId, id)),
  ])

  return true
}

// Routes setup
export function materialsRoutes(app: any) {
  // POST /api/materials/generate - Manually trigger materials generation
  app.post("/api/materials/generate", requireAuth, async (req: any, res: any) => {
    try {
      const { question, answer, chatId } = req.body || {}

      if (!question || !answer) {
        return res.status(400).send({
          ok: false,
          error: "question and answer are required",
        })
      }

      console.log("[materials] Manual generation requested for chat:", chatId)

      // Get authenticated userId
      const userId = getUserId(req)

      // Generate materials
      const materials = await generateAllMaterials(question, answer, userId)

      // Save if chatId provided
      let stored: StoredMaterials | undefined
      if (chatId) {
        stored = await saveLearningMaterials(userId, chatId, materials)
      }

      res.send({
        ok: true,
        materials,
        storedId: stored?.id,
      })
    } catch (e: any) {
      console.error("[materials] Generate error:", e?.message || e)
      res.status(500).send({
        ok: false,
        error: e?.message || "Failed to generate materials",
      })
    }
  })

  // GET /api/materials/by-chat/:chatId - Get materials for a chat
  app.get("/api/materials/by-chat/:chatId", requireAuth, async (req: any, res: any) => {
    try {
      const { chatId } = req.params
      if (!chatId) {
        return res.status(400).send({
          ok: false,
          error: "chatId is required",
        })
      }

      const userId = getUserId(req)
      const materials = await getMaterialsByChat(userId, chatId)

      res.send({
        ok: true,
        chatId,
        materials,
        count: materials.length,
      })
    } catch (e: any) {
      console.error("[materials] Get by chat error:", e?.message || e)
      res.status(500).send({
        ok: false,
        error: e?.message || "Failed to retrieve materials",
      })
    }
  })

  // GET /api/materials/:id - Get single material (with ownership verification)
  app.get("/api/materials/:id", requireAuth, async (req: any, res: any) => {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).send({
          ok: false,
          error: "id is required",
        })
      }

      const userId = getUserId(req)
      const material = await getMaterialById(userId, id)
      if (!material) {
        return res.status(404).send({
          ok: false,
          error: "Material not found",
        })
      }

      res.send({
        ok: true,
        material,
      })
    } catch (e: any) {
      console.error("[materials] Get by id error:", e?.message || e)
      res.status(500).send({
        ok: false,
        error: e?.message || "Failed to retrieve material",
      })
    }
  })

  // DELETE /api/materials/:id - Delete a material (with ownership verification)
  app.delete("/api/materials/:id", requireAuth, async (req: any, res: any) => {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).send({
          ok: false,
          error: "id is required",
        })
      }

      const userId = getUserId(req)
      const deleted = await deleteMaterials(userId, id)
      if (!deleted) {
        return res.status(404).send({
          ok: false,
          error: "Material not found",
        })
      }

      res.send({
        ok: true,
        message: "Material deleted successfully",
      })
    } catch (e: any) {
      console.error("[materials] Delete error:", e?.message || e)
      res.status(500).send({
        ok: false,
        error: e?.message || "Failed to delete material",
      })
    }
  })

  // GET /api/materials - List all materials for current user (paginated)
  app.get("/api/materials", requireAuth, async (req: any, res: any) => {
    try {
      const userId = getUserId(req)
      const limit = Math.min(parseInt(req.query.limit) || 50, 100)
      const offset = parseInt(req.query.offset) || 0

      const userIndex = (await db.get(STORAGE_KEYS.materialsIndex(userId))) || []
      const paginatedIds = userIndex.slice(offset, offset + limit)

      const materials = await Promise.all(
        paginatedIds.map(id => db.get(STORAGE_KEYS.materialById(userId, id)))
      )

      res.send({
        ok: true,
        materials: materials.filter(Boolean),
        pagination: {
          total: userIndex.length,
          limit,
          offset,
          hasMore: offset + limit < userIndex.length,
        },
      })
    } catch (e: any) {
      console.error("[materials] List error:", e?.message || e)
      res.status(500).send({
        ok: false,
        error: e?.message || "Failed to list materials",
      })
    }
  })
}
