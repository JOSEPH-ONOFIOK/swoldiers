# Swoldiers

Landing page, whitelist and docs for Swoldiers, a top-down pixel war MMO.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. In development, whitelist data is saved to `.data/db.json`, and the admin page works once you set `ADMIN_PASSWORD` in `.env.local`.

## Pages

| Path | What it is |
|---|---|
| `/` | Landing: hero, whitelist status and countdown, rewards and top 10, armory, fronts, features, token, FAQ |
| `/whitelist` | Connect a wallet (free signed message), follow on X, comment on the post, invite friends, extra missions, leaderboard |
| `/docs/*` | Getting started, fronts, enemies, combat and skills, whitelist rules |
| `/admin` | Approve or reject follows and comments, add missions, remove fake mission comments, export CSV |

## How the whitelist works

- **Join:** the wallet signs a message (no transaction). The server checks the signature and adds the wallet, worth 100 points.
- **Follow (+50) and comment (+50):** the player sends their X username and the link to their reply. Both wait for review in `/admin`; nothing is checked automatically.
- **Referrals (+50):** each player gets a `?ref=` link. A friend counts once their follow is approved and they are not on the inviter's network.
- **Missions:** added in `/admin`, they unlock after an approved follow. They count at once and can be removed later.
- **Ranking:** points high to low, ties go to whoever joined first. Rewards per rank are set in `src/lib/config.ts`.

## Where to change things

- Prize table, points, perk: `src/lib/config.ts`
- Fronts, enemies, skills, features: `src/lib/game.ts`
- Dates, X account, token: environment variables, see `.env.example`

## Deploy (Vercel)

1. Create an Upstash Redis database and copy the REST URL and token.
2. Set every variable from `.env.example` in the Vercel project.
3. Deploy. The sign-in, whitelist and admin APIs return "not set up" until the Upstash and secret values are present.
