import { chatRoutes } from "./routes/chat";
import { quizRoutes } from "./routes/quiz";
import { flashcardRoutes } from "./routes/flashcards";
import { smartnotesRoutes } from "./routes/notes";
import { podcastRoutes } from "./routes/podcast";
import { examRoutes } from "./routes/examlab";
import { transcriberRoutes } from "./routes/transcriber";
import { plannerRoutes } from "./routes/planner";
import { debateRoutes } from "./routes/debate";
import { companionRoutes } from "./routes/companion";
import { materialsRoutes } from "./routes/materials";
import { learningRoutes } from "./routes/learning";
import { reviewRoutes } from "./routes/reviews";
import { reportRoutes } from "./routes/reports";
import { requestMetrics } from "./middleware/metrics";
import type { IncomingMessage, ServerResponse } from 'http';

type RouteHandler = (req: IncomingMessage, res: ServerResponse, next?: () => void) => void;

export interface AppServer {
  get: (path: string, handler: RouteHandler) => void;
  post: (path: string, handler: RouteHandler) => void;
  put: (path: string, handler: RouteHandler) => void;
  patch: (path: string, handler: RouteHandler) => void;
  delete: (path: string, handler: RouteHandler) => void;
  use: (handler: RouteHandler) => void;
  ws: (path: string, handler: (ws: unknown, req: IncomingMessage) => void) => void;
}

// API Documentation
const API_DOCS = {
  name: "PageLM API",
  description: "AI-powered education platform API",
  version: "1.0.16",
  baseUrl: "/api",
  endpoints: {
    "Health & Monitoring": [
      { method: "GET", path: "/health", description: "Health check with system stats" },
      { method: "GET", path: "/metrics", description: "Request metrics and performance data" },
    ],
    "Chat": [
      { method: "POST", path: "/chat", description: "Start chat with AI" },
      { method: "GET", path: "/chats", description: "List chat history" },
      { method: "GET", path: "/chats/:id", description: "Get specific chat" },
      { method: "WS", path: "/ws/chat", description: "WebSocket for real-time chat" },
    ],
    "Learning": [
      { method: "GET", path: "/api/learning/profile", description: "Get learning profile" },
      { method: "GET", path: "/api/learning/stats", description: "Get learning statistics" },
      { method: "GET", path: "/api/reviews/due", description: "Get due reviews" },
      { method: "POST", path: "/flashcards", description: "Create flashcard" },
      { method: "GET", path: "/flashcards", description: "List flashcards" },
    ],
    "Planner": [
      { method: "POST", path: "/tasks", description: "Create task" },
      { method: "GET", path: "/tasks", description: "List tasks" },
      { method: "GET", path: "/tasks/:id", description: "Get task details" },
      { method: "PATCH", path: "/tasks/:id", description: "Update task" },
      { method: "DELETE", path: "/tasks/:id", description: "Delete task" },
    ],
    "Tools": [
      { method: "POST", path: "/quiz", description: "Generate quiz" },
      { method: "POST", path: "/podcast", description: "Generate podcast" },
      { method: "POST", path: "/smartnotes", description: "Generate smart notes" },
      { method: "POST", path: "/transcriber", description: "Transcribe audio" },
    ],
    "Reports": [
      { method: "GET", path: "/api/reports/weekly", description: "Get weekly report" },
      { method: "POST", path: "/api/reports/share", description: "Create share link" },
    ],
  }
};

export function registerRoutes(app: AppServer) {
  // API Documentation endpoint
  app.get("/", (_req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(API_DOCS, null, 2));
  });

  // Health check endpoint
  app.get("/health", (_req: IncomingMessage, res: ServerResponse) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      version: API_DOCS.version,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024),
        total: Math.round(memory.heapTotal / 1024 / 1024),
        unit: "MB"
      },
      node: process.version
    }));
  });

  // Metrics endpoint for monitoring
  app.get("/metrics", (_req: IncomingMessage, res: ServerResponse) => {
    // Increment request counter for this request too
    requestMetrics.requests++;
    const avgResponseTime = requestMetrics.responseTimes.length > 0
      ? Math.round(requestMetrics.responseTimes.reduce((a, b) => a + b, 0) / requestMetrics.responseTimes.length)
      : 0;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      requests: requestMetrics.requests,
      errors: requestMetrics.errors,
      avgResponseTime,
      responseTimeHistory: requestMetrics.responseTimes.slice(-100), // Last 100 response times
    }));
  });

  chatRoutes(app);
  quizRoutes(app);
  examRoutes(app);
  podcastRoutes(app);
  flashcardRoutes(app);
  smartnotesRoutes(app);
  transcriberRoutes(app);
  plannerRoutes(app);
  debateRoutes(app);
  companionRoutes(app);
  materialsRoutes(app);
  learningRoutes(app);
  reviewRoutes(app);
  reportRoutes(app);
}
