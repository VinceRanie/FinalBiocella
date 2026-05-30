#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
REPO_URL="${REPO_URL:-https://github.com/VinceRanie/FinalBiocella.git}"

cd "${REPO_DIR}"

START_HEAD="$(git rev-parse HEAD)"

# Ensure the configured deploy remote points to the expected repository URL.
# If the remote doesn't exist or points elsewhere, set it to `REPO_URL` so
# subsequent fetch/pull operations use the correct origin.
existing_remote_url="$(git config --get remote.${DEPLOY_REMOTE}.url 2>/dev/null || true)"
if [[ -z "${existing_remote_url}" ]]; then
  echo "Configuring git remote '${DEPLOY_REMOTE}' -> ${REPO_URL}"
  git remote add "${DEPLOY_REMOTE}" "${REPO_URL}" || true
elif [[ "${existing_remote_url}" != "${REPO_URL}" ]]; then
  echo "Updating git remote '${DEPLOY_REMOTE}' from ${existing_remote_url} to ${REPO_URL}"
  git remote set-url "${DEPLOY_REMOTE}" "${REPO_URL}"
else
  echo "Git remote '${DEPLOY_REMOTE}' already points to ${REPO_URL}"
fi

echo "=== Deploy started at $(date -u +'%Y-%m-%dT%H:%M:%SZ') ==="
echo "Repository: ${REPO_DIR}"
echo "Tracking: ${DEPLOY_REMOTE}/${DEPLOY_BRANCH}"

git fetch "${DEPLOY_REMOTE}" "${DEPLOY_BRANCH}"

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_REF="${DEPLOY_REMOTE}/${DEPLOY_BRANCH}"

if git rev-parse --verify --quiet "${REMOTE_REF}" >/dev/null; then
  REMOTE_HEAD="$(git rev-parse "${REMOTE_REF}")"
  BASE_HEAD="$(git merge-base HEAD "${REMOTE_REF}")"
else
  REMOTE_HEAD="$(git rev-parse FETCH_HEAD)"
  BASE_HEAD="$(git merge-base HEAD FETCH_HEAD)"
  echo "Remote ref ${REMOTE_REF} is not available locally; using FETCH_HEAD for comparison."
fi

if [[ "${LOCAL_HEAD}" == "${REMOTE_HEAD}" ]]; then
  echo "Local checkout is already at the latest ${REMOTE_REF}."
elif [[ "${LOCAL_HEAD}" == "${BASE_HEAD}" ]]; then
  echo "Local checkout is behind. Fast-forwarding to ${REMOTE_REF}."
  git pull --ff-only "${DEPLOY_REMOTE}" "${DEPLOY_BRANCH}"
else
  echo "ERROR: Local branch has local-only commits or has diverged from ${REMOTE_REF}."
  echo "Resolve this manually, then redeploy."
  echo "Local HEAD : ${LOCAL_HEAD}"
  echo "Remote HEAD: ${REMOTE_HEAD}"
  echo "Merge base : ${BASE_HEAD}"
  exit 1
fi

CURRENT_HEAD="$(git rev-parse HEAD)"

if [[ "${START_HEAD}" != "${CURRENT_HEAD}" ]]; then
  CHANGED_FILES="$(git diff --name-only "${START_HEAD}" "${CURRENT_HEAD}")"
else
  CHANGED_FILES=""
fi

has_changed_path() {
  local path_pattern="$1"
  [[ -n "${CHANGED_FILES}" ]] && grep -Eq "${path_pattern}" <<<"${CHANGED_FILES}"
}

install_dependencies() {
  local target_dir="$1"

  if [[ -f "${target_dir}/package-lock.json" ]]; then
    if ! npm ci --prefix "${target_dir}"; then
      echo "npm ci failed for ${target_dir}; falling back to npm install to repair lockfile drift."
      npm install --prefix "${target_dir}"
    fi
  else
    npm install --prefix "${target_dir}"
  fi
}

NEED_BACKEND_INSTALL=false
NEED_FRONTEND_INSTALL=false
NEED_FRONTEND_BUILD=false

if [[ ! -d "biocella-api/node_modules" ]] || has_changed_path '^biocella-api/package(-lock)?\.json$'; then
  NEED_BACKEND_INSTALL=true
fi

if [[ ! -d "WebApp/node_modules" ]] || has_changed_path '^WebApp/package(-lock)?\.json$'; then
  NEED_FRONTEND_INSTALL=true
fi

if [[ ! -f "WebApp/.next/BUILD_ID" ]] || has_changed_path '^WebApp/'; then
  NEED_FRONTEND_BUILD=true
fi

if [[ "${FORCE_INSTALL:-0}" == "1" ]]; then
  NEED_BACKEND_INSTALL=true
  NEED_FRONTEND_INSTALL=true
fi

if [[ "${FORCE_FRONTEND_BUILD:-0}" == "1" ]]; then
  NEED_FRONTEND_BUILD=true
fi

if [[ "${NEED_BACKEND_INSTALL}" == "true" ]]; then
  echo "Installing backend dependencies..."
  install_dependencies "biocella-api"
else
  echo "Skipping backend dependency install (no backend package changes detected)."
fi

if [[ "${NEED_FRONTEND_INSTALL}" == "true" ]]; then
  echo "Installing frontend dependencies..."
  install_dependencies "WebApp"
else
  echo "Skipping frontend dependency install (no frontend package changes detected)."
fi

if [[ "${NEED_FRONTEND_BUILD}" == "true" ]]; then
  echo "Building frontend..."
  npm run --prefix WebApp build
else
  echo "Skipping frontend build (no WebApp changes detected)."
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "ERROR: PM2 is not installed on this server. Install with: npm install -g pm2"
  exit 1
fi

echo "Starting/reloading backend + frontend with PM2..."
pm2 startOrReload ecosystem.config.cjs --env production
pm2 save

echo "=== Deploy completed successfully ==="
