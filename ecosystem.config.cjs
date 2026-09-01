module.exports = {
  apps: [
    {
      name: "huepot",
      cwd: "/var/www/huepot",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        PRODUCT_MODE: "1",
        APP_VERSION: "1.3.19",
      },
    },
  ],
};
