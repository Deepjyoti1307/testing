import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY,
  JWT_SECRET: process.env.JWT_SECRET || 'dev_jwt_secret_key_123',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_REDIRECT_URI: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  WORKER_CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  DEFAULT_MIN_DELAY_MS: parseInt(process.env.DEFAULT_MIN_DELAY_MS || '2000', 10),
  DEFAULT_HOURLY_LIMIT_PER_SENDER: parseInt(process.env.DEFAULT_HOURLY_LIMIT_PER_SENDER || '200', 10),
  ETHEREAL_USER: process.env.ETHEREAL_USER || '',
  ETHEREAL_PASS: process.env.ETHEREAL_PASS || '',
};
