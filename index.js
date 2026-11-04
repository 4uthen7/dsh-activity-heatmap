/**
 * Host half of dsh-activity-heatmap.
 *
 * Reads the local Session corpus through the read-only Session query /
 * persistence services and folds it into per-local-day counters. The browser
 * half fetches the result from the exact route registered below; nothing is
 * sent off the machine and no Session content is returned, only counts.
 */

/** Exact HTTP route the browser half reads. */
const ROUTE = '/plugin-api/activity-heatmap/stats';

/** Fixed window, in days, that the per-Session cache is bucketed against. */
const WINDOW_DAYS = 820;

/** Largest range a client may ask for. */
const MAX_RANGE_DAYS = 800;

/** Events requested per persistence read when the query service is absent. */
const READ_CHUNK = 1000;

/** Sessions scanned in parallel. Session logs are zstd-compressed JSONL. */
const CONCURRENCY = 2;

/** Cached corpus age that answers requests without starting another scan. */
const SCAN_FRESH_MS = 60_000;

/** Counter slots inside one day row. */
const SESSIONS = 0;
const TURNS = 1;
const MESSAGES = 2;
const TOOL_CALLS = 3;
const TOKENS = 4;
const EVENTS = 5;
const ACTIVE_MINUTES = 6;
const FIELDS = 7;

/** Host dependencies: without the HTTP carrier the browser half has no data. */
export const inject = ['webServer'];

/**
 * Mount the stats route.
 * @param ctx - the host plugin context.
 */
export function apply(ctx) {
  /** `${tz}|${windowStart}|${sessionId}` -> `{ revision, days, error? }`. */
  const sessionCache = new Map();
  /** IANA zone -> `{ today, startDate, dates, starts, index }`. */
  const windows = new Map();
  /** Progress of the current or last full corpus scan. */
  const scan = {
    running: false,
    promise: null,
    startedAt: 0,
    finishedAt: 0,
    scanned: 0,
    total: 0,
    failed: 0,
    source: 'unknown',
    timeZone: null,
    windowStart: null,
    error: null,
  };

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: (req, res) => handleRequest(req, res),
  }), 'activity-heatmap: stats route');

  /**
   * Answer one stats request.
   * @param req - the incoming request.
   * @param res - the response to write.
   */
  async function handleRequest(req, res) {
    let payload;
    try {
      const url = new URL(req.url ?? ROUTE, 'http://localhost');
      const tz = resolveTimeZone(url.searchParams.get('tz'));
      const days = clampInt(url.searchParams.get('days'), 7, MAX_RANGE_DAYS, 400);
      const wait = clampInt(url.searchParams.get('wait'), 0, 15_000, 0);
      const force = url.searchParams.get('refresh') === '1';
      const window = ensureWindow(tz);
      const running = ensureScan(tz, force);
      if (wait > 0 && scan.running) {
        await Promise.race([running, delay(wait)]);
      }
      payload = report(tz, window, days);
    } catch (error) {
      payload = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      res.statusCode = 500;
    }
    const body = JSON.stringify(payload);
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('cache-control', 'no-store');
    res.setHeader('content-length', String(Buffer.byteLength(body)));
    res.end(body);
  }

  /**
   * Build the compact, content-free report the browser renders.
   * @param tz - the IANA zone the client asked for.
   * @param window - the current day window for that zone.
   * @param rangeDays - how many trailing days to include.
   */
  function report(tz, window, rangeDays) {
    const toIndex = window.index.get(window.today) ?? window.dates.length - 1;
    const fromIndex = Math.max(0, toIndex - (rangeDays - 1));
    const rows = Array.from({ length: toIndex - fromIndex + 1 }, () => new Array(FIELDS).fill(0));
    let counted = 0;
    let pending = 0;
    let failedCached = 0;

    for (const record of sessionCache.values()) {
      if (record.windowStart !== window.startDate) continue;
      if (record.cells === null) {
        failedCached += 1;
        continue;
      }
      counted += 1;
      for (const [index, source] of record.cells) {
        if (index < fromIndex || index > toIndex) continue;
        const target = rows[index - fromIndex];
        for (let field = 0; field < FIELDS; field += 1) target[field] += source[field];
      }
    }

    if (scan.total > 0) pending = Math.max(0, scan.total - scan.scanned);

    const totals = {
      sessions: 0,
      turns: 0,
      messages: 0,
      toolCalls: 0,
      tokens: 0,
      events: 0,
      activeMinutes: 0,
    };
    const days = rows.map((row, offset) => {
      totals.sessions += row[SESSIONS];
      totals.turns += row[TURNS];
      totals.messages += row[MESSAGES];
      totals.toolCalls += row[TOOL_CALLS];
      totals.tokens += row[TOKENS];
      totals.events += row[EVENTS];
      totals.activeMinutes += row[ACTIVE_MINUTES];
      return {
        date: window.dates[fromIndex + offset],
        sessions: row[SESSIONS],
        turns: row[TURNS],
        messages: row[MESSAGES],
        toolCalls: row[TOOL_CALLS],
        tokens: row[TOKENS],
        events: row[EVENTS],
        activeMinutes: row[ACTIVE_MINUTES],
      };
    });

    const status = scan.error !== null
      ? 'error'
      : scan.running
        ? 'scanning'
        : scan.finishedAt > 0
          ? (scan.failed > 0 || failedCached > 0 ? 'partial' : 'complete')
          : 'idle';

    return {
      ok: true,
      schema: 1,
      timeZone: tz,
      generatedAt: Date.now(),
      from: window.dates[fromIndex],
      to: window.dates[toIndex],
      days,
      totals,
      scan: {
        status,
        source: scan.source,
        scanned: scan.scanned,
        total: scan.total,
        pending,
        failed: Math.max(scan.failed, failedCached),
        counted,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        error: scan.error,
      },
    };
  }

  /**
   * Start one corpus scan unless one is already running or the cached one is
   * fresh enough to answer this request.
   * @param tz - bucketing zone for this scan.
   * @param force - ignore the freshness window.
   */
  function ensureScan(tz, force) {
    if (scan.promise !== null) return scan.promise;
    const windowStart = ensureWindow(tz).startDate;
    if (!force && scan.finishedAt > 0 && scan.timeZone === tz
      && scan.windowStart === windowStart
      && Date.now() - scan.finishedAt < SCAN_FRESH_MS) {
      return Promise.resolve();
    }
    scan.timeZone = tz;
    scan.windowStart = windowStart;
    scan.running = true;
    scan.startedAt = Date.now();
    scan.finishedAt = 0;
    scan.scanned = 0;
    scan.total = 0;
    scan.failed = 0;
    scan.error = null;
    scan.promise = collect(tz)
      .catch((error) => {
        scan.error = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        scan.running = false;
        scan.finishedAt = Date.now();
        scan.promise = null;
      });
    return scan.promise;
  }

  /**
   * Scan every Session visible to this process and fill the cache.
   * @param tz - bucketing zone.
   */
  async function collect(tz) {
    const window = ensureWindow(tz);
    const query = ctx.get('sessionQuery');
    const persistence = ctx.get('sessionPersistence');
    const liveStore = ctx.get('sessions');

    let items;
    if (persistence) {
      scan.source = 'session-persistence';
      const snapshots = await persistence.list();
      items = snapshots.map((snapshot) => ({
        id: String(snapshot.header.id),
        header: snapshot.header,
        revision: String(snapshot.revision),
      }));
    } else if (query) {
      scan.source = 'session-query';
      const records = await query.listSessions();
      items = records.map((record) => ({
        id: String(record.header.id),
        header: record.header,
        revision: null,
      }));
    } else if (liveStore) {
      scan.source = 'live-sessions';
      const live = liveStore.list();
      items = live.map((session) => ({
        id: String(session.id),
        header: session.header,
        revision: null,
      }));
    } else {
      scan.source = 'none';
      items = [];
    }

    scan.total = items.length;
    await pool(items, CONCURRENCY, async (item) => {
      try {
        await scanOne(item, window, query, persistence);
      } finally {
        scan.scanned += 1;
      }
    });
  }

  /**
   * Scan one Session, reusing its cache entry when the revision is unchanged.
   * @param item - session identity and revision.
   * @param window - bucketing window.
   * @param query - the Session query service, when present.
   * @param persistence - the persistence service, when present.
   */
  async function scanOne(item, window, query, persistence) {
    const key = `${window.timeZone}|${window.startDate}|${item.id}`;
    const cached = sessionCache.get(key);
    if (cached !== undefined && (item.revision === null || cached.revision === item.revision)) {
      return;
    }

    let folded = null;
    try {
      if (persistence) {
        folded = await foldHandle(persistence, item, window);
      } else if (query) {
        const records = await query.listEvents(item.id);
        folded = foldRecords(records, item.header, window);
      } else {
        folded = foldHeaderOnly(item.header, window);
      }
    } catch (error) {
      sessionCache.set(key, {
        windowStart: window.startDate,
        revision: item.revision,
        cells: null,
        error: error instanceof Error ? error.message : String(error),
      });
      scan.failed += 1;
      return;
    }

    sessionCache.set(key, {
      windowStart: window.startDate,
      revision: item.revision,
      cells: folded.cells,
      error: null,
    });
    pruneCache(key);
  }

  /** Keep the cache bounded on very long-lived processes. */
  function pruneCache(keep) {
    if (sessionCache.size <= 4000) return;
    for (const key of sessionCache.keys()) {
      if (key === keep) continue;
      sessionCache.delete(key);
      if (sessionCache.size <= 3000) break;
    }
  }

  /**
   * Fold lightweight query records into day rows.
   * @param records - event records from `sessionQuery.listEvents`.
   * @param header - the owning Session header.
   * @param window - bucketing window.
   */
  function foldRecords(records, header, window) {
    const { cells, offset } = blankRows();
    const minutes = new Set();
    for (const record of records) {
      if (!record || typeof record.time !== 'number') continue;
      accumulate(cells, offset, window, minutes, record.type, record.time, record.data);
    }
    finalizeMinutes(cells, offset, minutes);
    countSession(cells, offset, window, header);
    return { cells, offset };
  }

  /**
   * Fold a full log read into day rows, chunked so one large log is not
   * materialized at once.
   * @param persistence - the persistence service.
   * @param item - session identity.
   * @param window - bucketing window.
   */
  async function foldHandle(persistence, item, window) {
    const { cells, offset } = blankRows();
    const minutes = new Set();
    const handle = await persistence.open(item.id, 'read');
    try {
      let cursor = 0;
      for (;;) {
        const chunk = await handle.read(cursor, READ_CHUNK);
        const events = chunk?.events ?? [];
        if (events.length === 0) break;
        for (const event of events) {
          if (!event || typeof event.time !== 'number') continue;
          accumulate(cells, offset, window, minutes, event.type, event.time, event.data);
        }
        cursor += events.length;
        if (events.length < READ_CHUNK) break;
      }
    } finally {
      await handle.close();
    }
    finalizeMinutes(cells, offset, minutes);
    countSession(cells, offset, window, item.header);
    return { cells, offset };
  }

  /** Count only the session creation day when logs are unavailable. */
  function foldHeaderOnly(header, window) {
    const { cells, offset } = blankRows();
    countSession(cells, offset, window, header);
    return { cells, offset };
  }

  /**
   * Allocate a sparse day map. Only days with activity hold a row, so a large
   * corpus does not allocate the full window for every Session.
   */
  function blankRows() {
    return { cells: new Map(), offset: 0 };
  }

  /** Return (creating on demand) one day row. */
  function dayCell(cells, index) {
    let row = cells.get(index);
    if (row === undefined) {
      row = new Array(FIELDS).fill(0);
      cells.set(index, row);
    }
    return row;
  }

  /**
   * Add one event to its local day.
   * @param rows - day rows for the window.
   * @param offset - absolute index of row 0.
   * @param window - bucketing window.
   * @param minutes - unique local minutes for this Session.
   * @param type - event type.
   * @param time - event wall clock in epoch milliseconds.
   * @param data - event payload, used for token usage only.
   */
  function accumulate(cells, offset, window, minutes, type, time, data) {
    const index = dayIndex(window, time);
    if (index < 0) return;
    const row = dayCell(cells, index - offset);
    row[EVENTS] += 1;
    const minute = Math.floor((time - window.starts[index]) / 60_000);
    minutes.add(index * 1440 + Math.min(1439, Math.max(0, minute)));

    if (type === 'turn/start') {
      row[TURNS] += 1;
      return;
    }
    if (type === 'tool/call') {
      row[TOOL_CALLS] += 1;
      return;
    }
    if (type === 'user/message' || type === 'assistant/message') {
      row[MESSAGES] += 1;
      if (type === 'assistant/message' && data && data.usage) {
        row[TOKENS] += number(data.usage.inputTokens) + number(data.usage.outputTokens);
      }
    }
  }

  /** Convert a Session's unique minutes into per-day active-minute counts. */
  function finalizeMinutes(cells, offset, minutes) {
    for (const key of minutes) {
      const index = Math.floor(key / 1440) - offset;
      const row = cells.get(index);
      if (row !== undefined) row[ACTIVE_MINUTES] += 1;
    }
  }

  /** Count a Session on the local day it was created. */
  function countSession(cells, offset, window, header) {
    const created = number(header?.createdAt);
    if (created <= 0) return;
    const index = dayIndex(window, created);
    if (index < 0) return;
    dayCell(cells, index - offset)[SESSIONS] += 1;
  }

  /**
   * Resolve (and memoize) the day window for one zone. A new local day
   * invalidates cached rows because their indices are window-relative.
   * @param tz - IANA zone.
   */
  function ensureWindow(tz) {
    const cached = windows.get(tz);
    const today = localDate(tz, Date.now());
    if (cached !== undefined && cached.today === today) return cached;
    if (cached !== undefined && cached.startDate !== localDate(tz, Date.now())) {
      sessionCache.clear();
    }
    const startDate = addDays(today, -(WINDOW_DAYS - 1));
    const dates = [];
    const starts = [];
    for (let index = 0; index < WINDOW_DAYS; index += 1) {
      const date = addDays(startDate, index);
      dates.push(date);
      starts.push(localMidnight(tz, date));
    }
    const window = {
      timeZone: tz,
      today,
      startDate,
      dates,
      starts,
      index: new Map(dates.map((date, position) => [date, position])),
    };
    windows.set(tz, window);
    return window;
  }
}

/**
 * Run tasks with bounded parallelism.
 * @param items - work items.
 * @param limit - maximum concurrent workers.
 * @param worker - async task.
 */
async function pool(items, limit, worker) {
  let cursor = 0;
  const width = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: width }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      await worker(items[index]);
    }
  }));
}

/** Resolve the requested IANA zone, falling back to UTC. */
function resolveTimeZone(value) {
  if (typeof value === 'string' && value.length > 0 && value.length <= 64) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
      return value;
    } catch {
      return 'UTC';
    }
  }
  return 'UTC';
}

/** Clamp a query integer. */
function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Sleep helper used to bound a request's wait for a scan. */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Coerce a JSON number, defaulting to 0. */
function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Cache of one formatter per zone; formatToParts is the offset primitive. */
const formatters = new Map();

/** @param tz - IANA zone. */
function formatter(tz) {
  let format = formatters.get(tz);
  if (format === undefined) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(tz, format);
  }
  return format;
}

/**
 * Offset of a zone at one instant, in milliseconds east of UTC.
 * @param tz - IANA zone.
 * @param time - epoch milliseconds.
 */
function zoneOffset(tz, time) {
  const parts = formatter(tz).formatToParts(new Date(time));
  const field = { year: 0, month: 1, day: 1, hour: 0, minute: 0, second: 0 };
  for (const part of parts) {
    if (part.type in field) field[part.type] = Number(part.value);
  }
  const asUtc = Date.UTC(field.year, field.month - 1, field.day, field.hour, field.minute, field.second);
  return asUtc - time;
}

/**
 * Local calendar date of an instant.
 * @param tz - IANA zone.
 * @param time - epoch milliseconds.
 */
function localDate(tz, time) {
  const parts = formatter(tz).formatToParts(new Date(time));
  const field = { year: '1970', month: '01', day: '01' };
  for (const part of parts) {
    if (part.type in field) field[part.type] = part.value;
  }
  return `${field.year}-${field.month}-${field.day}`;
}

/**
 * Instant of local midnight for a `YYYY-MM-DD` date.
 * @param tz - IANA zone.
 * @param date - local calendar date.
 */
function localMidnight(tz, date) {
  const [year, month, day] = date.split('-').map(Number);
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const first = zoneOffset(tz, guess);
  const candidate = guess - first;
  const second = zoneOffset(tz, candidate);
  return second === first ? candidate : guess - second;
}

/** Shift a `YYYY-MM-DD` date by whole days. */
function addDays(date, delta) {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + delta));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

/** Absolute day index of an instant inside a window, or -1 when outside. */
function dayIndex(window, time) {
  const starts = window.starts;
  if (time < starts[0]) return -1;
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= time) low = middle;
    else high = middle - 1;
  }
  if (time < starts[low]) return -1;
  return low;
}
