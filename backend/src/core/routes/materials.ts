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

// Storage keys
const STORAGE_KEYS = {
  materialsIndex: "materials:index",
  materialsByChat: (chatId: string) => `materials:chat:${chatId}`,
  materialById: (id: string) => `material:${id}`,
}

// Types for stored materials
export interface StoredMaterials {
  id: string
  chatId: string
  messageId?: string
  flashcards: FlashCard[]
  notes: NoteSummary
  quiz: Quiz
  createdAt: number
}

// Save learning materials to database
export async function saveLearningMaterials(
  chatId: string,
  materials: LearningMaterials,
  messageId?: string
): Promise<StoredMaterials> {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const stored: StoredMaterials = {
    id,
    chatId,
    messageId,
    flashcards: materials.flashcards,
    notes: materials.notes,
    quiz: materials.quiz,
    createdAt: Date.now(),
  }

  // Save individual material
  await db.set(STORAGE_KEYS.materialById(id), stored)

  // Update chat materials index
  const chatMaterials = (await db.get(STORAGE_KEYS.materialsByChat(chatId))) || []
  chatMaterials.push(id)
  await db.set(STORAGE_KEYS.materialsByChat(chatId), chatMaterials)

  // Update global index
  const globalIndex = (await db.get(STORAGE_KEYS.materialsIndex)) || []
  globalIndex.unshift(id)
  await db.set(STORAGE_KEYS.materialsIndex, globalIndex.slice(0, 10000))

  console.log(`[materials] Saved materials ${id} for chat ${chatId}`)
  return stored
}

// Get materials by chat ID
export async function getMaterialsByChat(chatId: string): Promise<StoredMaterials[]> {
  const materialIds = (await db.get(STORAGE_KEYS.materialsByChat(chatId))) || []

  const materials = await Promise.all(
    materialIds.map(id => db.get(STORAGE_KEYS.materialById(id)))
  )

  return materials.filter(Boolean).sort((a: any, b: any) => b.createdAt - a.createdAt)
}

// Get single material by ID
export async function getMaterialById(id: string): Promise<StoredMaterials | null> {
  const result = await db.get(STORAGE_KEYS.materialById(id))
  return result || null
}

// Delete materials
export async function deleteMaterials(id: string): Promise<boolean> {
  const material = await getMaterialById(id)
  if (!material) return false

  // Parallel read of both indexes
  const [chatMaterials, globalIndex] = await Promise.all([
    db.get(STORAGE_KEYS.materialsByChat(material.chatId)),
    db.get(STORAGE_KEYS.materialsIndex),
  ])

  // Remove from chat index
  const updatedChatMaterials = ((chatMaterials as string[]) || []).filter((mid: string) => mid !== id)
  // Remove from global index
  const updatedGlobalIndex = ((globalIndex as string[]) || []).filter((mid: string) => mid !== id)

  // Parallel writes
  await Promise.all([
    db.set(STORAGE_KEYS.materialsByChat(material.chatId), updatedChatMaterials),
    db.set(STORAGE_KEYS.materialsIndex, updatedGlobalIndex),
    db.delete(STORAGE_KEYS.materialById(id)),
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
        stored = await saveLearningMaterials(chatId, materials)
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

      const materials = await getMaterialsByChat(chatId)

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

  // GET /api/materials/:id - Get single material
  app.get("/api/materials/:id", requireAuth, async (req: any, res: any) => {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).send({
          ok: false,
          error: "id is required",
        })
      }

      const material = await getMaterialById(id)
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

  // DELETE /api/materials/:id - Delete a material
  app.delete("/api/materials/:id", requireAuth, async (req: any, res: any) => {
    try {
      const { id } = req.params
      if (!id) {
        return res.status(400).send({
          ok: false,
          error: "id is required",
        })
      }

      const deleted = await deleteMaterials(id)
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

  // GET /api/materials - List all materials (paginated)
  app.get("/api/materials", requireAuth, async (req: any, res: any) => {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 50, 100)
      const offset = parseInt(req.query.offset) || 0

      const globalIndex = (await db.get(STORAGE_KEYS.materialsIndex)) || []
      const paginatedIds = globalIndex.slice(offset, offset + limit)

      const materials = await Promise.all(
        paginatedIds.map(id => db.get(STORAGE_KEYS.materialById(id)))
      )

      res.send({
        ok: true,
        materials: materials.filter(Boolean),
        pagination: {
          total: globalIndex.length,
          limit,
          offset,
          hasMore: offset + limit < globalIndex.length,
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
