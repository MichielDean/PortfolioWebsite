/**
 * PM2 ecosystem configuration for the job-hunter daemon.
 *
 * Deploy:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * One-shot test run:
 *   pm2 start ecosystem.config.cjs --only job-hunter --env production -- --run-now
 */

'use strict';

module.exports = {
  apps: [
    {
      name: 'job-hunter',

      // Run TypeScript directly via tsx (no separate compile step required)
      script: './node_modules/.bin/tsx',
      args: 'src/job-hunter/index.ts',

      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',

      // Merge stdout and stderr into a single log stream
      merge_logs: true,
      error_file: './logs/job-hunter-error.log',
      out_file: './logs/job-hunter-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      env: {
        NODE_ENV: 'production',
        // JOB_HUNTER_DB: '/home/lobsterdog/.local/share/job-hunter/jobs.db',
        // TELEGRAM_BOT_TOKEN: 'set in /etc/environment or systemd unit',
        // TELEGRAM_CHAT_ID: 'set in /etc/environment or systemd unit',
      },
    },
  ],
};
