import { createApp } from './app.js';
import { ENV } from './config/env.js';

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  console.log(`🚀 ReachInbox Scheduler Backend running on port ${ENV.PORT} [${ENV.NODE_ENV}]`);
});

// Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP Server closed. Process exiting.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
