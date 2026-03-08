module.exports = {
  apps: [{
    name: "clawkb",
    cwd: "/Users/hata1234/clawd/projects/clawkb/app",
    script: "node_modules/.bin/next",
    args: "start -p 3500",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://hata1234@localhost:5432/knowledge_hub",
      NEXTAUTH_SECRET: "kh-s3cr3t-7x9mP2qR4vW8nB1jC6fA",
      NEXTAUTH_URL: "https://hub.ringohome.com",
      AUTH_TRUST_HOST: "true",
      API_TOKEN: "kh-api-t0k3n-Xq7Wr9Bm2Pv4Nj8Lc1Fs",
    },
    autorestart: true,
    max_restarts: 10,
    watch: false,
  }],
};
