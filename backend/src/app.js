import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { query } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind nginx / a load balancer
  app.use(helmet());
  if (env.CORS_ORIGIN) app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/api/health' } }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.get('/api/health', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded' });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
