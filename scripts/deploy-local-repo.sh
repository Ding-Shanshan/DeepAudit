#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.localrepo.yml"

if ! command -v git >/dev/null 2>&1; then
  echo "git 未安装，无法读取当前仓库版本。"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker 未安装，无法执行部署。"
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "未找到部署配置: ${COMPOSE_FILE}"
  exit 1
fi

cd "${REPO_ROOT}"

BRANCH="$(git branch --show-current)"
COMMIT_SHA="$(git rev-parse --short HEAD)"
SAFE_BRANCH="$(printf '%s' "${BRANCH}" | tr '/:@ ' '-')"
export DEPLOY_TAG="${SAFE_BRANCH}-${COMMIT_SHA}"

echo "============================================="
echo "DeepAudit 本地仓库部署"
echo "仓库: ${REPO_ROOT}"
echo "分支: ${BRANCH}"
echo "提交: ${COMMIT_SHA}"
echo "镜像标签: ${DEPLOY_TAG}"
echo "Compose: ${COMPOSE_FILE}"
echo "============================================="

if [ -n "$(git status --porcelain)" ]; then
  echo "警告：当前仓库存在未提交变更，部署会基于工作区当前内容构建镜像。"
fi

docker compose -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo
echo "部署完成，当前容器镜像如下："
docker ps --format "table {{.Names}}\t{{.Image}}" | grep -E 'deepaudit|NAMES' || true
