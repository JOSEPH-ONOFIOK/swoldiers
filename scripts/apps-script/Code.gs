/**
 * SWOLDIERS whitelist — Google Apps Script web app.
 *
 * A readable copy of the whitelist. Upstash is the database; the site sends
 * changed wallets here in batches. Nothing is read back from this sheet.
 *
 * Contract with src/lib/mirror.ts. Everything is a POST carrying `secret`:
 *
 *   {action:"bulk", rows:[...]}  -> { saved }     adds or updates wallets
 *
 *   GET ?version -> { version, secured }
 *
 * Setup is in README.md next to this file.
 */

/** Bumped whenever this file changes, so `?version` shows which copy is deployed. */
var SCRIPT_VERSION = 3;

var WALLETS = 'Whitelist';

/** Rows are written by header name. */
var HEADERS = [
  'Wallet',
  'X Handle',
  'Points',
  'Follow',
  'Comment + RT',
  'Comment Link',
  'Bonus Missions',
  'Mission Points',
  'Invite Code',
  'Invited By',
  'Joined At',
  'Updated At',
];

/** Set in Project Settings → Script Properties, never in this file: the repo is public. */
var SHARED_SECRET = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET') || '';

// --- entry points ---------------------------------------------------------

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.version !== undefined) return json({ version: SCRIPT_VERSION, secured: !!SHARED_SECRET });
  return json({ error: 'unauthorised' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ error: 'bad request' });
  }
  // A copy with no lock would let anyone write to it, so the secret is required.
  if (!SHARED_SECRET || body.secret !== SHARED_SECRET) return json({ error: 'unauthorised' });
  if (body.action !== 'bulk') return json({ error: 'unknown action' });

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ error: 'busy' });
  }
  try {
    return json({ saved: saveAll(body.rows || []) });
  } catch (err) {
    return json({ error: String(err) });
  } finally {
    // Finish the write before the next one starts, or it can read the sheet as it was.
    SpreadsheetApp.flush();
    lock.releaseLock();
  }
}

// --- writes ---------------------------------------------------------------

/** One read of the wallet column, so a batch costs the same however long the sheet is. */
function saveAll(rows) {
  var sheet = walletSheet(), last = sheet.getLastRow(), at = {};
  if (last > 1) {
    var list = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < list.length; i++) at[String(list[i][0]).toLowerCase()] = i + 2;
  }
  var fresh = [];
  for (var j = 0; j < rows.length; j++) {
    var row = buildRow(rows[j]), wallet = String(rows[j].address).toLowerCase();
    if (at[wallet]) sheet.getRange(at[wallet], 1, 1, HEADERS.length).setValues([row]);
    else fresh.push(row);
  }
  if (fresh.length) sheet.getRange(sheet.getLastRow() + 1, 1, fresh.length, HEADERS.length).setValues(fresh);
  return rows.length;
}

function buildRow(e) {
  var missions = e.missions || {}, names = Object.keys(missions), points = 0;
  for (var i = 0; i < names.length; i++) points += Number(missions[names[i]].pts || 0);

  var row = [];
  row[col('Wallet') - 1] = String(e.address).toLowerCase();
  row[col('X Handle') - 1] = safeText(e.x_handle);
  row[col('Points') - 1] = Number(e.points || 0);
  row[col('Follow') - 1] = safeText(e.follow_status);
  row[col('Comment + RT') - 1] = safeText(e.status);
  row[col('Comment Link') - 1] = safeText(e.post_url);
  row[col('Bonus Missions') - 1] = names.length;
  row[col('Mission Points') - 1] = points;
  row[col('Invite Code') - 1] = "'" + safeText(e.ref); // stays text, even a code like 123e45
  row[col('Invited By') - 1] = safeText(e.referredBy);
  row[col('Joined At') - 1] = e.joinedAt ? new Date(Number(e.joinedAt)).toISOString() : '';
  row[col('Updated At') - 1] = new Date().toISOString();
  return row;
}

// --- helpers --------------------------------------------------------------

function walletSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sheet = ss.getSheetByName(WALLETS);
  if (!sheet) sheet = ss.insertSheet(WALLETS);
  // Also upgrades a tab made by an older version of this script
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.showColumns(1, HEADERS.length);
  sheet.setFrozenRows(1);
  return sheet;
}

// Text a visitor typed must never run as a formula in the sheet
function safeText(v) {
  var t = String(v === undefined || v === null ? '' : v);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}

function col(name) {
  return HEADERS.indexOf(name) + 1;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// --- manual test ----------------------------------------------------------

/** Run from the Apps Script editor. Delete the selftest row afterwards. */
function selfTest() {
  var row = { address: 'selftest', x_handle: 'tester', points: 150, follow_status: 'approved', status: 'pending', ref: 'abc123', missions: {}, joinedAt: Date.now() };
  var send = function () {
    return JSON.parse(doPost({ postData: { contents: JSON.stringify({ action: 'bulk', rows: [row], secret: SHARED_SECRET }) } }).getContent());
  };
  var first = send();
  var before = walletSheet().getLastRow();
  var second = send();
  var once = walletSheet().getLastRow() === before;

  Logger.log('saved         : ' + JSON.stringify(first));
  Logger.log('no duplicate  : ' + once);
  Logger.log('shared secret : ' + (SHARED_SECRET ? 'on' : 'OFF: set SHARED_SECRET in Script Properties'));

  var ok = first.saved === 1 && second.saved === 1 && once;
  Logger.log(ok ? 'PASS. Delete the "selftest" row before going live.' : 'FAIL. See the lines above.');
}
