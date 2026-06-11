module.exports = {
  apps: [
    {
      name: "image",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "1024M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
