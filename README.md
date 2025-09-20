
# $0 Open-Source Product Analytics (React · Bun/Hono · Supabase · Slack)

Build a free-tier analytics stack: events → realtime → Slack alerts. Minimal.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your/repo)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your/repo)

![diagram](./docs/diagram.png)

## Quickstart
1) **Clone & env**
```bash
git clone https://github.com/your/repo
cd repo
cp .env.example .env


Supabase

Create project → run the SQL in supabase.sql.

Toggle Enable Realtime for public.analytics_events.

Backend

bun install
bun run dev  # http://localhost:8787


Frontend

bun run dev  # http://localhost:5173


Slack

Use a webhook or a bot token with chat:write.

Deploy

Deploy backend to Render
 · Deploy frontend to Netlify

Env

See .env.example.

Notes

Don’t ship SERVICE_ROLE_KEY to the browser.

Use INGESTION_SECRET to authenticate ingestion requests.

RLS is enabled; see supabase.sql.

License

---

If you want, I can tweak the SQL/policies to match exactly how your current code inserts (direct vs. via backend), or generate the **Render/Netlify buttons** pointed at your actual repo once you push it.
```