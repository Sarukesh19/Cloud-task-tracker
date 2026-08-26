import path from 'path';

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'task_tracker_super_secure_secret_key_2026',
  DB_PATH: path.join(__dirname, '..', 'data', 'db.json'),
  OVERDUE_CHECK_INTERVAL_MS: 5000, // Check overdue status every 5 seconds
  NOTIFICATION_QUEUE_INTERVAL_MS: 500, // Process queue every 500ms
  MAX_ACTIVE_TASKS_PER_USER: 5, // Constraint 3: max 5 active tasks
  NOTIFICATION_MAX_RETRIES: 3, // Stretch goal: 3 retry attempts with exponential backoff
};
