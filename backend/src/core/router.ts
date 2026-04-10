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

export function registerRoutes(app: AppServer) {
  // Health check endpoint
  app.get("/health", (_req: IncomingMessage, res: ServerResponse) => {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      version: process.env.npm_package_version || "1.0.13",
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
