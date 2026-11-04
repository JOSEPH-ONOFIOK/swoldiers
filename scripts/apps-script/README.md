# Swoldiers whitelist sheet: deploy guide

Upstash is the database. `Code.gs` is a Google Apps Script web app that keeps a
readable copy of the whitelist in a Google Sheet, updated in batches about every
30 seconds. Players never wait for the sheet, and if it goes down the site keeps
working and catches up afterwards.

## 1. Make the spreadsheet

1. Go to <https://sheets.new> and name it something like `Swoldiers Whitelist`.
2. Leave it empty. The script creates its tab on the first save.

## 2. Add the script

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete the placeholder `myFunction` code.
3. Paste the whole contents of [Code.gs](Code.gs).
4. Save (⌘S / Ctrl+S).

## 3. Set the shared secret

This sheet holds wallets, so it is locked with a secret as well as its URL. The
script refuses every save until the secret is set.

1. Generate one: `openssl rand -base64 32`.
2. In the Apps Script editor: **Project Settings** (gear icon) → **Script
   Properties** → **Add script property**. Property `SHARED_SECRET`, value the
   string from step 1. **Save script properties**.

## 4. Check it works

Back in the editor, pick `selfTest` in the function dropdown, press **Run**,
allow the permissions Google asks for, then open **Execution log**. The last
line should read:

```
PASS. Delete the "selftest" row before going live.
```

Delete the `selftest` row from the `Whitelist` tab.

## 5. Deploy it

1. **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. **Deploy**, then **Authorize access**. Google warns the app is unverified;
   that is expected for your own script. Choose **Advanced → Go to (project name)**.
5. Copy the **Web app URL**, which looks like
   `https://script.google.com/macros/s/AKfy.../exec`.

"Anyone" is required because the site calls the URL from its server without
Google credentials. Nothing can be read or written without the secret.

## 6. Point the site at it

Add these in Vercel (**Project → Settings → Environment Variables**), alongside
the Upstash ones, then redeploy:

```
GOOGLE_SHEETS_WEBAPP_URL=https://script.google.com/macros/s/AKfy.../exec
SHEETS_WEBHOOK_SECRET=<the same value as SHARED_SECRET>
```

To check, open your web app URL with `?version` on the end. It should show
`"secured":true`.

## Re-deploying after an edit

A new deployment gets a new URL. To keep the existing one:

**Deploy → Manage deployments → pencil icon → Version: New version → Deploy**

## What lands in the sheet

**Whitelist** has one row per wallet:

| Column | Value |
| --- | --- |
| Wallet | The wallet that enlisted |
| X Handle | Their X username |
| Points | Their points at the last update |
| Follow | none, pending, approved or rejected |
| Comment + RT | The same statuses, for the `$SWOL` comment and repost |
| Comment Link | Link to their comment |
| Bonus Missions, Mission Points | Bonus missions done and the points from them |
| Invite Code | Their own invite code |
| Invited By | The wallet that invited them |
| Joined At, Updated At | Timestamps |

Sorting or filtering the tab is safe: wallets are found by address, never by row
position.

**The sheet is a copy, not the control panel.** Approve and reject in `/admin`.
Typing in the sheet changes nothing, and is overwritten on that wallet's next
update. For the winners list always use the CSV export in `/admin`, which is
worked out from the database.

## If rows look out of date

Press **Sync sheet** in `/admin`. It lists every wallet again and sends them in
batches of 300, one batch every 30 seconds or so while the site has visitors.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| No **Sync sheet** button in `/admin` | `GOOGLE_SHEETS_WEBAPP_URL` not set, or set without a redeploy |
| `Sheets web app returned 401/403` in the logs | Access isn't "Anyone", or the deployment was never authorised |
| `Sheets web app: unauthorised` in the logs | `SHARED_SECRET` isn't set, doesn't match `SHEETS_WEBHOOK_SECRET`, or Vercel wasn't redeployed |
| Edits to `Code.gs` have no effect | Saved but not deployed as a new version |
