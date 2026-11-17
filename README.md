# Qureo Study Bot — Admin Edition 1.2

Telegram bot for an educational assistant and **genuinely ungraded practice only**.

## What's included

- Arabic Telegram menus and user commands.
- Admin dashboard with statistics, user list, user profile, activity log and broadcast.
- Per-user admin buttons: block/unblock, pause/resume, change activation code, stop session, request session start, and delete stored Qureo credentials.
- One-time activation codes bound to one Telegram account. If a code is entered from a different account, it is marked compromised and the rightful owner's activation is disabled; the owner and administrator are notified.
- Activation request queue for the administrator.
- AES-256-GCM encrypted local credential storage.
- Gemini question explanation/selection for standard multiple-choice practice.
- Optional Cloudflare Workers AI image generation using `/image`.
- Conservative runner behavior: stops on unclear questions, missing controls, or uncertain progression.

## Critical upgrade and data-preservation instructions

This archive does **not** contain your personal `.env` or `data/users.enc.json`. Keep both from your existing installation.

1. Stop the old bot process.
2. Make a backup copy of the existing `.env` and `data/` folder somewhere private.
3. Extract this archive into a **new folder**.
4. Copy your existing `.env` into that new folder. Do not replace it with `.env.example`.
5. Keep the exact original `DATA_ENCRYPTION_KEY` and the same `DATA_DIR` setting. A new key cannot decrypt old saved data.
6. Copy the existing `data/users.enc.json` into the new folder's configured data directory. Do not upload it or share it.
7. Install dependencies and run the checks before starting.

Do not send `.env`, bot tokens, API keys, passwords, activation codes, or `users.enc.json` to anyone.

## Setup

Requirements: Node.js 20+; Linux recommended for browser automation.

```bash
npm install
npx playwright install chromium
npm run check
npm start
```

On Android Termux, Telegram menus and Cloudflare image generation may work, but Playwright Chromium/Qureo browser sessions are not supported reliably. The admin "start user session" button reports this limitation rather than pretending a session started.

## Required environment variables

- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`
- `ADMIN_ID`
- `DATA_ENCRYPTION_KEY` — Base64 encoding of exactly 32 random bytes

To generate a key only for a brand-new empty installation:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Never generate a replacement key for an installation that already has encrypted data.

## Optional image generation

Set these in the existing `.env` if you want `/image`:

- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`
- `CF_IMAGE_MODEL` (defaults to `@cf/black-forest-labs/flux-1-schnell`)

The image provider may enforce quotas or availability limits. The bot cannot guarantee uninterrupted free image generation.

## Admin dashboard

Open Telegram and send `/start` from the configured admin account, then press **👑 لوحة تحكم الإدارة**. You can also use `/panel`.

Inside each user profile:

- **Block / unblock** — prevent or restore access.
- **Pause / resume** — temporarily disable user operations; active session is stopped.
- **Change activation code** — invalidates the prior active code and sends a new one privately.
- **Stop session** — closes an active browser session.
- **Start session** — starts only when the host supports Playwright, the account is activated, and credentials exist.
- **Delete credentials** — removes saved Qureo credentials.

Activation requests appear in the dashboard under **طلبات التفعيل**. The user must first open the bot and press Start so Telegram permits a private message.

## User commands

- `/start`
- `/activate CODE`
- `/connect`
- `/run`
- `/stop`
- `/status`
- `/disconnect`
- `/image prompt`
- `/help`

## Safety and platform limitations

- Use only with permission and on activities that are genuinely ungraded practice. Do not use it to submit graded work or assessments.
- Qureo selectors and page structure may change. This project is not certified or verified against a live Qureo account.
- The runner supports ordinary radio-button multiple-choice pages only. It does not solve written answers, image questions, drag-and-drop, or custom widgets.
- It does not bypass CAPTCHA, MFA, access controls, or platform restrictions. If a manual check appears or the platform blocks automation, stop and use the supported manual flow.
- A changed question page is not conclusive proof that Qureo recorded an answer. Test only with harmless practice material and keep the stop checks intact.
- Telegram's message deletion is best-effort; never send passwords in a group or public chat.
- Activation codes are private, one-time codes. Never share them.

## Troubleshooting

- `Cannot decrypt saved data`: stop the bot and restore the exact original `DATA_ENCRYPTION_KEY`. Do not delete or recreate `users.enc.json`.
- `Missing configuration`: confirm the existing `.env` was copied into the project root.
- Qureo login or controls not found: the default selectors may not match the current website. Do not guess selectors or disable safety checks.
- Browser launch failure on Termux: run on a supported Linux host.
