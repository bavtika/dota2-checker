# Security notes

## Secrets

- Never commit `.env` or real Telegram / Steam credentials.
- Rotate `BOT_TOKEN` in [@BotFather](https://t.me/BotFather) if it was ever shared or committed.
- In Kubernetes, inject `BOT_TOKEN` via `Secret` (see `k8s/secret.example.yaml`).

## Credential handling

This bot accepts Steam `login:password` over Telegram for a **one-shot session** to query the Dota 2 Game Coordinator.

- Passwords are **not persisted** to disk or logs.
- Prefer throwaway / owned accounts for demos.
- Do not use this to access accounts you do not own.

## Disclosure

If you find a security issue in this repository, open a private security advisory on GitHub or contact the maintainer — do not file a public issue with exploit details.
