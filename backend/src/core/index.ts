import cors from 'cors';
import path from 'path'
import compression from 'compression'
import server from '../utils/server/server'
import { registerRoutes } from './router'
import { loggerMiddleware } from './middleware'
import { defaultSecurityMiddleware } from './middleware/security'

process.loadEnvFile(path.resolve(process.cwd(), '.env'))

// Build allowed origins from environment variables
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  const frontendUrl = process.env.VITE_FRONTEND_URL || process.env.FRONTEND_URL;
  if (frontendUrl) {
    origins.push(frontendUrl);
  }

  // Always include development origins as fallback
  const devOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  for (const origin of devOrigins) {
    if (!origins.includes(origin)) {
      origins.push(origin);
    }
  }

  return origins;
}

const allowedOrigins = getAllowedOrigins();

const app = server()

// Apply compression before all other middleware for maximum benefit
app.use(compression())

// Apply security middleware before routes
app.use(defaultSecurityMiddleware)
app.use(loggerMiddleware)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy: origin ${origin} is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS policy: origin ${origin} is not allowed`));
  },
  credentials: true,
}));
// Only expose uploads directory - never expose database or cache
app.use(app.serverStatic("/storage/uploads", "./storage/uploads"))

registerRoutes(app)

app.listen(Number.parseInt(process.env.PORT || '5000'), () => {
  console.log(`[pagelm] running on ${process.env.VITE_BACKEND_URL}`)
})
