module.exports = {
  apps: [
    {
      name: 'educaplay-api',
      script: 'server.js',
      cwd: '/opt/educaplay',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
