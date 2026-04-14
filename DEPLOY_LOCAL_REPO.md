# 本地仓库部署说明

如果你希望服务器始终部署“当前仓库分支 + 当前提交”的版本，而不是官方预构建镜像，请使用本方案。

## 为什么需要这套方案

默认的 `docker-compose.prod.yml` 和 `docker-compose.prod.cn.yml` 使用的是官方镜像：

- `ghcr.io/lintsinghua/deepaudit-frontend:latest`
- `ghcr.io/lintsinghua/deepaudit-backend:latest`

这意味着即使服务器已经切到你自己的分支，例如 `qianduanV1.0`，容器实际运行的也可能仍然是官方镜像内容。

## 推荐用法

在服务器仓库根目录执行：

```bash
cd /data/DeepAudit
chmod +x scripts/deploy-local-repo.sh
./scripts/deploy-local-repo.sh
```

脚本会自动：

- 读取当前 `git` 分支和提交号
- 生成本地镜像标签
- 使用 `docker-compose.localrepo.yml` 基于当前仓库代码重建前端和后端镜像
- 输出当前运行容器对应的镜像版本

默认不会构建 `sandbox`，因为沙箱镜像依赖额外安全工具下载，部分服务器会因为访问 GitHub 失败而中断整个部署。

## 适用场景

- 服务器长期部署你自己的分支
- 前端、后端有持续自定义改动
- 不希望因为 `latest` 镜像覆盖而丢失本地仓库版本

## 手动执行方式

如果不使用脚本，也可以手动执行：

```bash
cd /data/DeepAudit
export DEPLOY_TAG="$(git branch --show-current | tr '/:@ ' '-')-$(git rev-parse --short HEAD)"
export SANDBOX_ENABLED=false
docker compose -f docker-compose.localrepo.yml up -d --build --remove-orphans
```

## 如需构建本地 sandbox

仅当你的服务器 Docker 构建环境可以稳定访问外网时，再启用：

```bash
cd /data/DeepAudit
./scripts/deploy-local-repo.sh --with-sandbox
```

等价手动命令：

```bash
cd /data/DeepAudit
export DEPLOY_TAG="$(git branch --show-current | tr '/:@ ' '-')-$(git rev-parse --short HEAD)"
export SANDBOX_ENABLED=true
docker compose -f docker-compose.localrepo.yml --profile sandbox up -d --build --remove-orphans
```

## 验证是否生效

```bash
docker ps --format "table {{.Names}}\t{{.Image}}"
```

你应该看到类似：

```text
deepaudit-frontend-1   deepaudit-frontend:qianduanV1.0-b0cf14f
deepaudit-backend-1    deepaudit-backend:qianduanV1.0-b0cf14f
```

如果仍然看到 `ghcr.io/lintsinghua/deepaudit-frontend:latest`，说明你还在使用官方镜像部署链路，而不是本地仓库部署链路。
