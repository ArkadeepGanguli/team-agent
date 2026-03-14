# TeamAgent

TeamAgent is a multi-agent AI orchestration system built with Next.js 14 for managing software team execution from project brief to task delivery.

It coordinates:
- `Task Assignment Agent`: breaks a project brief into role-scoped tasks.
- `Scheduler Agent`: builds day-by-day execution with blockers and handoffs.
- `Notification Agent`: drafts and dispatches email/Slack updates.
- `Helper Agent`: provides private, role-scoped assistant responses for members.

Every agent API action is modeled as a paid x402 call (`$0.01` USDC challenge) with facilitator-backed verification logic.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Groq API via OpenAI SDK (`llama-3.3-70b-versatile`)
- x402 flow with Facinet integration
- Resend (email)
- Slack Bolt (Slack messaging)
- JSON file storage via `fs/promises`

## Current Auth Mode

The app currently runs in **local session mode** (Farcaster login disabled for easier testing):
- No wallet/social sign-in required to access dashboard flows.
- Backend uses a local fallback session (`local-admin`) when no `fc_session` cookie is present.

Farcaster auth route/files are still present and can be re-enabled later.

## Project Structure

```text
teamagent/
  data/
    projects.json
    members.json
    tasks.json
    timeline.json
    notifications.json
    logs.json

  src/
    app/
      layout.tsx
      page.tsx
      dashboard/page.tsx
      project/[id]/page.tsx
      member/[fid]/page.tsx
      api/
        auth/farcaster/route.ts
        admin/create-project/route.ts
        admin/add-member/route.ts
        agents/task-assign/route.ts
        agents/scheduler/route.ts
        agents/notifier/route.ts
        agents/helper/route.ts
        agents/orchestrate/route.ts
        data/projects/route.ts
        data/tasks/route.ts
        data/timeline/route.ts

    agents/
      taskAssignAgent.ts
      schedulerAgent.ts
      notifierAgent.ts
      helperAgent.ts

    lib/
      storage.ts
      groq.ts
      x402.ts
      facinet.ts
      resend.ts
      slack.ts
      farcaster.ts
      orchestrator.ts

    types/
      index.ts
```

## Core Orchestrator Flow

`POST /api/agents/orchestrate`

Stage order:
1. `task-assign`
2. `scheduler`
3. `notifier`

Behavior:
- Validates each stage output before moving forward.
- Records stage state (`pending/running/success/failed`) in `logs.json`.
- Stops pipeline immediately on stage failure.
- Supports `idempotencyKey` to prevent duplicate orchestration work.
- Updates project status to `active` once tasks/timeline exist.
- Marks project `complete` when all tasks are `done`.

## Payment Model (x402)

Agent endpoints require payment verification:
- Reads `x-payment` header.
- If missing/invalid -> returns HTTP `402` with challenge:
  - amount: `0.01`
  - currency: `USDC`
- If accepted -> proceeds with agent execution.

Note:
- In the current demo-friendly setup, settlement can succeed without always returning a tx hash.
- UI may show `Settlement tx: n/a` when hash is unavailable.

## Data Schemas

Defined in `src/types/index.ts`:
- `Project`
- `Member`
- `Task`
- `TimelineEntry`
- `Notification`
- `AgentLog`

Storage is JSON-file based under `data/`.

## API Overview

### Admin
- `POST /api/admin/create-project`
- `POST /api/admin/add-member`

### Orchestration / Agents (paid)
- `POST /api/agents/orchestrate` (primary)
- `POST /api/agents/task-assign`
- `POST /api/agents/scheduler`
- `POST /api/agents/notifier`
- `POST /api/agents/helper`

### Data
- `GET /api/data/projects`
- `GET /api/data/tasks?projectId=...`
- `GET /api/data/timeline?projectId=...`

### Auth
- `POST /api/auth/farcaster` (present but not required in current local mode)

## Environment Variables

Create/update `.env.local`:

```env
GROQ_API_KEY=

NEXT_PUBLIC_DOMAIN=localhost:3000
NEXT_PUBLIC_URL=http://localhost:3000
JWT_SECRET=

WALLET_ADDRESS=
CLIENT_PRIVATE_KEY=
THIRDWEB_SECRET_KEY=
FACILITATOR_URL=https://x402.org/facilitator

RESEND_API_KEY=

SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
```

## Local Setup

```bash
npm install
npm run dev
```

If port `3000` is busy, Next.js will move to `3001`. Update:
- `NEXT_PUBLIC_DOMAIN`
- `NEXT_PUBLIC_URL`

to match the active port.

## Quick Demo Script

1. Open `/dashboard`.
2. Create a project.
3. Add members (PM, FE, BE, QA).
4. Open `/project/<projectId>`.
5. Enter any non-empty `x-payment` test header in UI.
6. Click `Run TeamAgent`.
7. Show:
   - Generated tasks
   - Timeline with blockers/handoffs
   - Notification trigger
8. Open `/member/<fid>` and use private helper chat.
9. Show JSON artifacts in `data/` and logs in `data/logs.json`.

## Troubleshooting

### `ENOENT: package.json` when running npm
You are in wrong folder. Run commands inside `teamagent/`.

### `Port 3000 is in use`
Kill process or use port `3001` and update `NEXT_PUBLIC_*` URL/domain.

### Farcaster login issues
Current app mode does not require Farcaster login.

### `Settlement tx: n/a`
Payment verified but tx hash was not returned by settlement helper.

### Slack notifications not sent
Check:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- member `slackUserId`

### Email notifications not sent
Check `RESEND_API_KEY` and verified sender setup in Resend.

## Security Notes

- Never commit `.env.local`.
- Rotate keys immediately if exposed.
- Do not expose server secrets via `NEXT_PUBLIC_*`.

## Judge Demo Line

> Every AI action in this system is a paid HTTP call. Payments flow through a Facinet-powered x402 network and settle on Avalanche Fuji, while intelligence runs on Groq.

