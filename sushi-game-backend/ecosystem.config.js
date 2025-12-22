module.exports = {
  apps: [{
    name: 'sushi-streak-backend',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3005 // Usa una porta diversa se 3000 è occupata
    }
  }]
};
