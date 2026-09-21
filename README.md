# Dota 2 Account Checker

Telegram bot that logs into Steam (ephemeral session), connects to the Dota 2 Game Coordinator, and returns account stats: rank, behavior score, matches, LP, Dota Plus, and related flags.

Built as a **DevOps / platform portfolio project**: containerized Node.js service with health probes, GitHub Actions CI, Docker Compose, and Kubernetes manifests.

> **Disclaimer:** For educational / personal use on accounts you own. Steam credentials are used only for a one-shot session and are not stored. See [SECURITY.md](SECURITY.md).

---

## Architecture

```text
Telegram user
     │
     ▼
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Telegraf bot   │────▶│  In-memory   │────▶│  Steam + Dota2  │
│  (src/bot.js)   │     │  job queue   │     │  GC client      │
└────────┬────────┘     └──────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Health HTTP    │  GET /healthz  /livez  /readyz
│  :8080          │
└─────────────────┘
```

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Bot | Telegraf |
| Steam / Dota GC | `steam-user`, `dota2-user` |
| Config | dotenv + env validation |
| Logs | JSON structured logging |
| Containers | Multi-stage Dockerfile (Alpine, non-root) |
| Local orchestration | Docker Compose |
| CI | GitHub Actions (lint, test, image build) |
| Deploy example | Kubernetes Deployment + probes + Secret |

---

## Quick start (local)

```bash
cp .env.example .env
# set BOT_TOKEN from @BotFather

npm ci
npm start
```

Health endpoints (default port `8080`):

```bash
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/readyz
```

### Bot usage

Send to the bot:

```text
login:password
login:password:socks5://user:pass@host:port
```

If Steam Guard is enabled, the bot asks for the code in chat.

---

## Docker

```bash
cp .env.example .env   # set BOT_TOKEN
make docker-up         # or: docker compose up --build -d
```

Useful targets:

```bash
make lint
make test
make docker-build
make ci                # lint + test + docker build
```

---

## Kubernetes

```bash
kubectl apply -f k8s/deployment.yaml

kubectl create secret generic dota2-checker-secrets \
  --namespace dota2-checker \
  --from-literal=BOT_TOKEN="$BOT_TOKEN"
```

Replace `ghcr.io/YOUR_GITHUB_USERNAME/dota2-checker:latest` in `k8s/deployment.yaml` with your image.

Probes:

- **Liveness** → `/healthz`
- **Readiness** → `/readyz` (waits until Telegram bot has launched)

---

## CI/CD

On every push / PR to `main` or `master`, GitHub Actions:

1. `npm ci` → syntax check → unit tests  
2. Multi-stage Docker image build (Buildx + GHA cache, no push)

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | yes | — | Telegram bot token |
| `HEALTH_PORT` | no | `8080` | Health HTTP port |
| `LOG_LEVEL` | no | `info` | `debug` \| `info` \| `warn` \| `error` |

---

## Project layout

```text
├── app.js                 # entrypoint
├── src/
│   ├── bot.js             # Telegram handlers + graceful shutdown
│   ├── steam.js           # Steam / GC session
│   ├── queue.js           # sequential job queue
│   ├── health.js          # /healthz /readyz
│   ├── logger.js          # JSON logs
│   └── config.js          # env validation
├── test/                  # node:test unit tests
├── k8s/                   # Deployment + Secret example
├── Dockerfile             # multi-stage, non-root, HEALTHCHECK
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## What this shows on a CV (DevOps)

- Multi-stage Docker images, non-root user, image healthcheck  
- Compose for local parity with production-ish settings  
- Kubernetes Deployment with liveness/readiness probes and Secret injection  
- GitHub Actions pipeline (test gate → image build)  
- Structured logs and explicit config validation  
- Graceful `SIGINT` / `SIGTERM` shutdown for the bot process  

---

## License

MIT — see [LICENSE](LICENSE).
