module.exports = {
  apps: [
    {
      name: "royal-backend",
      script: "server.js",
      env: { NODE_ENV: "production", DOTENV_PATH: ".env" },
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
    },
    {
      name: "royal-heartbeat",
      script: "src/jobs/heartbeat.job.js",
      env: { NODE_ENV: "production", DOTENV_PATH: ".env", HEARTBEAT_INTERVAL_SEC: 30 },
      autorestart: true,
      max_restarts: 20,
      restart_delay: 2000,
    },
  ],
};
