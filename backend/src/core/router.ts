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
