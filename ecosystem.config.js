module.exports = {
  apps: [
    {
      name: "whatsapp-ai-backend",
      script: "server/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1500M",
      // Exponential backoff on crash loops — doubles each restart up to 15 s
      exp_backoff_restart_delay: 100,
      out_file: "logs/backend-out.log",
      error_file: "logs/backend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    },
    {
      name: "whatsapp-ai-frontend",
      // Use npx to resolve the Next.js binary at runtime instead of hardcoding
      // a path into node_modules that may change between installs.
      interpreter: "node",
      script: "node_modules/.bin/next",
      args: "start -p 3005",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1500M",
      exp_backoff_restart_delay: 100,
      out_file: "logs/frontend-out.log",
      error_file: "logs/frontend-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        NODE_ENV: "development",
        PORT: 3005
      },
      env_production: {
        NODE_ENV: "production",
        NEXT_DIST_DIR: ".next-build",
        PORT: 3005
      }
    }
  ]
};
