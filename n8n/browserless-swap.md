# Browserless Swap — Replace htmlcsstopdf

Drafted 2026-05-11. Replaces the paid `htmlcsstopdf` node with a Browserless
HTTP call. Free tier covers low volume (well under the limit for early lead
flow). Saves the htmlcsstopdf subscription cost.

---

## Step 1 — Sign up for Browserless

1. Go to <https://www.browserless.io/sign-up>
2. Pick the **Free** plan (called "Free Cloud" or "Hobby" depending on the
   current page). Free tier currently covers ~1,000 PDF renders per month and
   1 concurrent session. Plenty for the AI Readiness Assessment volume.
3. On the dashboard, find your **API token** (usually labelled "API Key").
   Copy it.

## Step 2 — Save the token as an n8n environment variable (recommended)

1. In n8n: **Settings → Environment Variables** (or **Credentials → New** if
   your version doesn't expose env vars in the UI).
2. Add: `BROWSERLESS_TOKEN` = `your-token-here`
3. Save.

(If your n8n version doesn't have env vars, just paste the token directly in
the HTTP node URL below. Less clean but works.)

## Step 3 — Replace the Convert to PDF node

### 3a. Delete the existing "Convert to PDF" node

Right-click → Delete. Don't worry about the disconnected wires for now —
we'll reconnect after step 3b.

### 3b. Add a new HTTP Request node

Drop a new **HTTP Request** node where the old PDF node was. Open it. Configure:

**Authentication**
- *Method:* `POST`
- *URL:* `https://production-sfo.browserless.io/pdf?token={{ $env.BROWSERLESS_TOKEN }}`
  - If you didn't set the env var, paste the URL with the token inline:
    `https://production-sfo.browserless.io/pdf?token=YOUR_TOKEN_HERE`
- *Authentication:* None (token is in URL)

**Send Body**
- Toggle *Send Body* to ON
- *Body Content Type:* `JSON`
- *Specify Body:* `Using JSON`
- Paste this into the JSON field:

```json
{
  "html": "={{ $json.html }}",
  "options": {
    "format": "A4",
    "printBackground": true,
    "margin": {
      "top": "20px",
      "bottom": "20px",
      "left": "20px",
      "right": "20px"
    }
  }
}
```

**Send Headers**
- Toggle *Send Headers* to ON
- Add header: `Cache-Control` = `no-cache` (optional, but helps avoid stale renders)
- The `Content-Type: application/json` header is set automatically when Body Content Type is JSON.

**Options**
- *Response → Response Format:* `File`
- *Response → Put Output File In Field:* `data`
  (Critical — this puts the binary into a field named `data`, which is what the
  Outlook node already expects.)

**Rename the node** to `Convert to PDF (Browserless)` so it's obvious in the
workflow diagram.

### 3c. Add a tiny Code node after to set the PDF filename

The HTTP node doesn't automatically tag the binary file with a sensible name
(it'll default to something like `unknown.bin`). One small Code node fixes that.

Drop a **Code** node after Convert to PDF (Browserless). Configure:

- *Language:* JavaScript
- *Mode:* Run Once for All Items
- Paste:

```javascript
/* Tag the Browserless PDF binary with the filename and mime type so the
   downstream Outlook attachment uses the right name. */
const items = $input.all();
const fileName = $('Build HTML Report').first().json.fileName || 'AI-Readiness-Report.pdf';
items.forEach(function(item) {
  if (item.binary && item.binary.data) {
    item.binary.data.fileName = fileName;
    item.binary.data.mimeType = 'application/pdf';
  }
});
return items;
```

Name the node `Tag PDF File`.

### 3d. Reconnect the workflow

The flow becomes:

```
Scorecard Webhook
  → Claude Generate Insights
  → Build HTML Report
  → Convert to PDF (Browserless)   ← NEW
  → Tag PDF File                    ← NEW
  → Email PDF to Lead
  → Notify Bill
  → Update Waitlist
  → Respond OK
```

Connect:
- `Build HTML Report` → `Convert to PDF (Browserless)`
- `Convert to PDF (Browserless)` → `Tag PDF File`
- `Tag PDF File` → `Email PDF to Lead` (and the other parallel branches)

Save the workflow.

## Step 4 — Test

Submit one assessment from `scorecard.html`. Watch the n8n execution view:

- **Convert to PDF (Browserless)** should show output with a `data` binary field
  (around 200-500 KB).
- **Tag PDF File** should pass through with `fileName: "AI-Readiness-Report-<name>.pdf"`
  on the binary.
- **Email PDF to Lead** should attach the PDF correctly. Check your inbox.

If the PDF arrives looking the same as before, you've successfully swapped to
free PDF generation. The htmlcsstopdf node and its monthly cost are gone.

## Troubleshooting

**"Cannot read binary property data" error in Email PDF to Lead**
The HTTP node's *Put Output File In Field* wasn't set to `data`. Open the node,
go to Options → Response, confirm `Put Output File In Field: data`.

**Browserless 429 (rate limit) error**
You hit the free-tier concurrent-session limit. Add a small retry loop or
upgrade Browserless plan.

**PDF renders blank or distorted**
Open the Browserless node's input. Confirm `{{ $json.html }}` is non-empty and
starts with `<!DOCTYPE html>`. If empty, the upstream Build HTML Report didn't
emit the html field — check that node's output.

**Logo missing in rendered PDF**
The Browserless renderer fetches `https://automatex.uk/brand_assets/Logo.png`
just like a browser. If the URL is unreachable (CORS, robots block, or wrong
path), the image fails silently. Open the URL in your browser to verify.

## Cost reality

- **Before:** htmlcsstopdf subscription, approximately $9-15/month at typical
  rail-flow volume.
- **After:** Browserless free tier (under their monthly limit). $0/month.
- **If volume spikes past free tier:** Browserless Hobby plan is $30/month
  with much higher limits. Still cheaper than enterprise PDF SaaS.

## When to consider upgrading away

You're under 1,000 PDFs/month and won't need to. If you start running multiple
campaigns in parallel and your concurrent rate spikes, consider self-hosting
Browserless on Fly.io or Render (their open-source version is free), or
moving to a Cloudflare Worker with the `@cloudflare/puppeteer` package.
