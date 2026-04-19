module.exports = {
  apps: [
    {
      name: "biocella-api",
      cwd: "./biocella-api",
      script: "app.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "biocella-webapp",
      cwd: "./WebApp",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 20194
      }
    }
  ]
};
