#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"

cd "${REPO_DIR}"

git fetch "${DEPLOY_REMOTE}" "${DEPLOY_BRANCH}" >/dev/null

LOCAL_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse "${DEPLOY_REMOTE}/${DEPLOY_BRANCH}")"
BASE_HEAD="$(git merge-base HEAD "${DEPLOY_REMOTE}/${DEPLOY_BRANCH}")"

if [[ "${LOCAL_HEAD}" == "${REMOTE_HEAD}" ]]; then
  echo "IN_SYNC"
  exit 0
fi

if [[ "${LOCAL_HEAD}" == "${BASE_HEAD}" ]]; then
  echo "BEHIND"
  exit 1
fi

if [[ "${REMOTE_HEAD}" == "${BASE_HEAD}" ]]; then
  echo "AHEAD"
  exit 2
fi

echo "DIVERGED"
exit 3
