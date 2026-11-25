import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import apiRoutes from './routes/index.js';
import { setupBullBoard } from './queues/board.js';
// Import email worker so background queue processing is active
import './queues/email.worker.js';

export function createApp(): Express {
  const app = express();

  // Middlewares
  app.use(cors({
    origin: [ENV.FRONTEND_URL, 'http://localhost:3000', 'https://*.vercel.app'],
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Mount Bull-Board Dashboard for Real-Time Queue Monitoring
  setupBullBoard(app);

  // Mount API Routes
  app.use('/api', apiRoutes);

  // Base Health Check
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'ReachInbox Email Job Scheduler Backend',
      environment: ENV.NODE_ENV,
      bullBoardUrl: '/admin/queues',
    });
  });

  // Global Error Handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: ENV.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred.',
    });
  });

  return app;
}
