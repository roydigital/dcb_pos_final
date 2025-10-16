module.exports = {
  apps: [{
    name: "dcb-pos",
    script: "server.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 8080
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 8080
    },
    watch: true,
    ignore_watch: ["node_modules", "logs"],
    max_memory_restart: "1G",
    error_file: "./logs/err.log",
    out_file: "./logs/out.log",
    log_file: "./logs/combined.log",
    time: true
  }]
