module.exports = {
  apps: [{
    name: "clawkb",
    script: "node_modules/.bin/next",
    args: "start -p 3500",
    env: {
      NODE_ENV: "production",
      // Set these via .env file or system environment variables
      // DATABASE_URL: "postgresql://user:password@localhost:5432/clawkb",
      // NEXTAUTH_SECRET: "your-secret",
      // NEXTAUTH_URL: "https://your-domain.com",
      // AUTH_TRUST_HOST: "true",
      // API_TOKEN: "your-api-token",
    },
    autorestart: true,
    max_restarts: 10,
    watch: false,
  }],
};
