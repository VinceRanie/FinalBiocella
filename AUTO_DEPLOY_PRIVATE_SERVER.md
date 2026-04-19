# Private Server Auto-Deployment (Vercel-like)

This setup deploys automatically when `main` is updated in:

- https://github.com/VinceRanie/IT-3105N-REPO.git

It also:

- checks whether the server checkout is behind or diverged from `origin/main`
- rejects deployment when local branch has local-only commits/divergence
- starts/reloads backend and frontend together via PM2

## 1. One-time server setup

Run on your private server:

```bash
cd ~/testbiocella.dcism.org/biocella
npm install -g pm2
chmod +x scripts/deploy-production.sh scripts/check-main-sync.sh
```

Optional: test sync status anytime:

```bash
cd ~/testbiocella.dcism.org/biocella
./scripts/check-main-sync.sh
```

Possible outputs:

- `IN_SYNC`: local == `origin/main`
- `BEHIND`: local is behind `origin/main`
- `AHEAD`: local has commits not in remote
- `DIVERGED`: both local and remote changed

## 2. Run first deployment manually

```bash
cd ~/testbiocella.dcism.org/biocella
./scripts/deploy-production.sh
pm2 status
```

PM2 apps started:

- `biocella-api` (backend, port 3000)
- `biocella-webapp` (Next.js frontend, port 20191)

For DCISM Custom Application Hosting:

- the subdomain must point to port `20191`
- frontend serves at `https://testbiocella.dcism.org`
- frontend proxies `/api/*` and `/uploads/*` to backend `127.0.0.1:3000`

## 3. Enable PM2 on reboot

```bash
pm2 startup
pm2 save
```

## 4. Configure GitHub Actions secrets

In the GitHub repo settings, add these Actions secrets:

- `DEPLOY_HOST` = your server host/IP
- `DEPLOY_USER` = your SSH username
- `DEPLOY_PORT` = SSH port (usually `22`)
- `DEPLOY_SSH_KEY` = private key that can SSH into the server

## 5. Automatic deploy behavior

Workflow file:

- `.github/workflows/deploy-private-server.yml`

Trigger:

- every push to `main`
- manual trigger from Actions tab (`workflow_dispatch`)

Server command executed by workflow:

```bash
cd ~/test22.dcism.org/biocella
./scripts/deploy-production.sh
```

## 6. What deploy script does

File:

- `scripts/deploy-production.sh`

Steps:

1. `git fetch origin main`
2. compare local `HEAD`, remote `origin/main`, and merge base
3. if behind: `git pull --ff-only`
4. if diverged/ahead: stop deployment with error
5. install backend + frontend dependencies
6. build frontend (`npm run --prefix WebApp build`)
7. `pm2 startOrReload ecosystem.config.cjs --env production`

## 7. Useful operational commands

```bash
pm2 status
pm2 logs biocella-api --lines 100
pm2 logs biocella-webapp --lines 100
pm2 restart biocella-api
pm2 restart biocella-webapp
```
