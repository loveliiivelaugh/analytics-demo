import type { Context } from 'hono';
import { Hono } from 'hono';
import { createClient } from "@supabase/supabase-js";
import axios from 'axios';

// ----- trackAnalytics utility -----
interface AnalyticsEvent {
    project: string;
    page: string;
    event_type: string;
    event_type_id: string | number;
    description: string;
    notes: string;
    metadata: Record<string, any>;
    isFirstEvent?: boolean;
    sessionID?: string;
    userAgent?: string;
    publicAnalyticsToken?: string;
};

export const trackAnalytics = async (resolvedId?: string | number, event?: AnalyticsEvent) => {
    const {
        project,
        page,
        event_type,
        event_type_id,
        description,
        notes,
        metadata = {},
        // optional
        isFirstEvent,
        sessionID,
        userAgent,
        publicAnalyticsToken
    } = event as AnalyticsEvent;

    resolvedId = event_type_id

    // Look up event_type_id by name
    if (!resolvedId && event_type) {
        const { data, error } = await supabase
            .from('analytics_event_types')
            .select('id')
            .eq('type', event_type)
            .single()

        if (error || !data) {
            return { error: `Invalid event type: ${event_type}` }
        }

        resolvedId = data.id
    }

    // Insert event
    const { error: insertError } = await supabase
        .from('analytics_events')
        .insert([{
            project,
            page,
            description,
            notes,
            metadata,
            event_type_id: resolvedId
        }])

    if (insertError) {
        return { error: insertError }
    }

    return { error: null }
};
// --------------


// -------- SLACK CLIENT -----------
const slackClient = axios.create({
    baseURL: "https://slack.com/api",
    decompress: false, // Disable automatic Brotli/gzip decompress // 👈🏼 *required*
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Bun.env.SLACK_BOT_TOKEN}`,
        'Accept-Encoding': 'gzip, deflate' // ❌ no br // 👈🏼 *required*
    }
});
// -------- SLACK Notification utility -----------
type SlackRequestBody = {
    type?: string;
    challenge?: string;
    event: any;
};
const slackNotification = async (payload: SlackRequestBody) => {

    // 🛑 Prevent ghost loop by checking if the bot sent the message
    const BOT_USER_ID = Bun.env.SLACK_BOT_USER_ID;
    if (payload?.event?.user === BOT_USER_ID) {
        console.log("Skipping message from bot itself (prevent loop)");
        return ({ message: "Ignored self-triggered event" });
    }

    let responseMessage = payload?.event?.text
        ? payload.event.text
        : JSON.stringify(payload?.event || {}, null, 2)

    const response = await slackClient.post('/chat.postMessage', {
        channel: '#general',
        text: (`Hi <@${payload.event.user}>! 👋` + responseMessage)
    });

    console.log("Slack event:", payload.event, response.data);
}
// ----------------


// -------- SUPABASE CLIENT ------------
const SUPABASE_URL = Bun.env.SUPABASE_URL!;
const SUPABASE_KEY = Bun.env.SUPABASE_KEY!; // or anon key if safe
const SUPABASE_SERVICE_KEY = Bun.env.SUPABASE_SERVICE_KEY!; // or anon key if safe

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// use service key for realtime sub to bypass RLS if safe
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});
//  ----------------


// ---------- Realtime Subscription Listener ------------
async function startListener() {
    console.log("🟢 Starting Supabase booking listener...");
    supabaseService
        .channel("analytics_events")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "analytics_events",
            },
            async (payload) => {
                const analyticsEvent = payload.new;

                // ... Slack integration + request logic will go here
                const result = await slackNotification({ event: analyticsEvent });
                console.log("[Slack Notification Result]: ", result);
            }
        )
        .subscribe();
};

startListener(); // Start listening when app is launched
// ---------------------


// ---------- Web Service -------------
const port = Bun.env.PORT || 4545;

const app = new Hono();

// Routes
app
    .post("/api/v1/analytics/track", async (c: Context) => {
        const body = await c.req.json()

        const { error: insertError } = await trackAnalytics(body?.type || "page_view", body);

        if (insertError) {
            return c.json({ error: insertError }, 500)
        }

        return c.json({ success: true })
    });

// public health route at root
app.get("/health", (c: Context) => c.json({ status: "ok", server: port }));

// Start server
export default {
    port,
    fetch: app.fetch
};
// ------------------