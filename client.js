window.__ModuleLoader__.load({
  id: 'dsh-activity-heatmap',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Locale namespace owned by this plugin. */
    const NS = 'activity-heatmap';
    /** Trailing days requested from the Host. */
    const STATS_DAYS = 378;
    /** Browser-local settings key. */
    const STORAGE_KEY = 'dsh-activity-heatmap/settings/v1';

    const METRICS = ['messages', 'activeMinutes', 'toolCalls', 'turns', 'sessions', 'tokens'];
    const SHAPES = ['square', 'rounded', 'circle', 'hexagon', 'diamond', 'star', 'custom'];
    const LAYOUTS = ['year', 'months', 'rolling'];
    const INTENSITIES = ['linear', 'log', 'rank'];
    const PALETTES = {
      github: ['auto', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
      ocean: ['auto', '#a5d8f0', '#5aa9d6', '#2f7fb5', '#164e73'],
      violet: ['auto', '#ddccf7', '#b18cf0', '#8a5ce0', '#573093'],
      sunset: ['auto', '#ffdcae', '#ffb05c', '#f0803c', '#b8481f'],
      mono: ['auto', '#d9d9d9', '#ababab', '#757575', '#3b3b3b'],
    };
    const PALETTE_IDS = ['github', 'ocean', 'violet', 'sunset', 'mono'];

    const DEFAULTS = Object.freeze({
      version: 1,
      metric: 'messages',
      layout: 'year',
      weeks: 26,
      shape: 'square',
      customPath: '',
      cell: 8,
      gap: 2,
      palette: 'github',
      colors: PALETTES.github.slice(),
      weekStart: 1,
      intensity: 'linear',
      showMonthLabels: true,
      showWeekdayLabels: true,
      showLegend: true,
      showDock: true,
      dockWeeks: 18,
    });

    /* ------------------------------------------------------------------ */
    /* Locale dictionaries                                                 */
    /* ------------------------------------------------------------------ */

    const EN = {
      nav: 'Activity',
      title: 'Activity heatmap',
      intro: 'How much you use DeepSeek Harness, one cell per day. Counted locally from your own session logs.',
      'summary.activeDays': 'Active days',
      'summary.currentStreak': 'Current streak',
      'summary.longestStreak': 'Longest streak',
      'summary.total': 'Total',
      'summary.busiest': 'Busiest day',
      'summary.days': '{n} days',
      'summary.day': '{n} day',
      'chart.title': 'Calendar',
      'chart.hint': 'Each cell is one day. Darker means more.',
      'chart.scanning': 'Reading sessions… {scanned} / {total}',
      'chart.scanningUnknown': 'Reading sessions…',
      'chart.partial': '{n} sessions could not be read',
      'chart.refresh': 'Refresh',
      'chart.less': 'Less',
      'chart.more': 'More',
      'chart.empty': 'No activity recorded yet.',
      'chart.error': 'Could not read activity: {message}',
      'chart.scanError': 'Could not read sessions: {message}',
      'chart.retry': 'Try again',
      'chart.cellTitle': '{date}: {value}',
      controls: 'Appearance',
      'controls.metric': 'Measure',
      'controls.layout': 'Calendar',
      'controls.shape': 'Shape',
      'controls.customPath': 'SVG path (viewBox 0 0 100 100)',
      'controls.cell': 'Cell size',
      'controls.gap': 'Spacing',
      'controls.palette': 'Palette',
      'controls.colors': 'Colors',
      'controls.emptyAuto': 'Theme color for empty days',
      'controls.weekStart': 'Week starts on',
      'controls.intensity': 'Intensity',
      'controls.weeks': 'Weeks shown',
      'controls.monthLabels': 'Month labels',
      'controls.weekdayLabels': 'Weekday labels',
      'controls.legend': 'Legend',
      'controls.display': 'Display',
      'controls.dock': 'Compact strip under the composer',
      'controls.reset': 'Reset to defaults',
      'metric.messages': 'Messages',
      'metric.activeMinutes': 'Active time',
      'metric.toolCalls': 'Tool calls',
      'metric.turns': 'Turns',
      'metric.sessions': 'Sessions',
      'metric.tokens': 'Tokens',
      'layout.year': 'Year',
      'layout.months': 'Months',
      'layout.rolling': 'Rolling',
      'shape.square': 'Square',
      'shape.rounded': 'Rounded',
      'shape.circle': 'Circle',
      'shape.hexagon': 'Hexagon',
      'shape.diamond': 'Diamond',
      'shape.star': 'Star',
      'shape.custom': 'Custom',
      'palette.github': 'GitHub',
      'palette.ocean': 'Ocean',
      'palette.violet': 'Violet',
      'palette.sunset': 'Sunset',
      'palette.mono': 'Mono',
      'palette.custom': 'Custom',
      'intensity.linear': 'Linear',
      'intensity.log': 'Log',
      'intensity.rank': 'Rank',
      'weekStart.sun': 'Sunday',
      'weekStart.mon': 'Monday',
      'unit.minutes': '{n}m',
      'unit.hours': '{h}h {m}m',
      'dock.label': 'Activity',
      'dock.summary': '{n} active days',
    };

    const JA = {
      nav: 'アクティビティ',
      title: 'アクティビティヒートマップ',
      intro: 'DeepSeek Harness をどれだけ使ったかを1日1マスで表示します。あなたのセッションログからローカルで集計します。',
      'summary.activeDays': 'アクティブ日数',
      'summary.currentStreak': '連続日数',
      'summary.longestStreak': '最長連続',
      'summary.total': '合計',
      'summary.busiest': '最多の日',
      'summary.days': '{n}日',
      'summary.day': '{n}日',
      'chart.title': 'カレンダー',
      'chart.hint': '1マスが1日。濃いほど活動量が多い日です。',
      'chart.scanning': 'セッションを読み込み中… {scanned} / {total}',
      'chart.scanningUnknown': 'セッションを読み込み中…',
      'chart.partial': '{n}件のセッションを読み込めませんでした',
      'chart.refresh': '更新',
      'chart.less': '少',
      'chart.more': '多',
      'chart.empty': 'まだアクティビティがありません。',
      'chart.error': 'アクティビティを読み込めません: {message}',
      'chart.scanError': 'セッションを読み込めません: {message}',
      'chart.retry': '再試行',
      'chart.cellTitle': '{date}: {value}',
      controls: '表示設定',
      'controls.metric': '指標',
      'controls.layout': 'カレンダー',
      'controls.shape': 'マスの形',
      'controls.customPath': 'SVGパス (viewBox 0 0 100 100)',
      'controls.cell': 'マスの大きさ',
      'controls.gap': '間隔',
      'controls.palette': 'パレット',
      'controls.colors': '色',
      'controls.emptyAuto': '空の日はテーマ色',
      'controls.weekStart': '週の始まり',
      'controls.intensity': '濃さ',
      'controls.weeks': '表示する週数',
      'controls.monthLabels': '月ラベル',
      'controls.weekdayLabels': '曜日ラベル',
      'controls.legend': '凡例',
      'controls.display': '表示',
      'controls.dock': '入力欄の下にコンパクト表示',
      'controls.reset': '初期設定に戻す',
      'metric.messages': 'メッセージ',
      'metric.activeMinutes': 'アクティブ時間',
      'metric.toolCalls': 'ツール呼び出し',
      'metric.turns': 'ターン',
      'metric.sessions': 'セッション',
      'metric.tokens': 'トークン',
      'layout.year': '1年',
      'layout.months': '月別',
      'layout.rolling': '直近',
      'shape.square': '四角',
      'shape.rounded': '角丸',
      'shape.circle': '丸',
      'shape.hexagon': '六角形',
      'shape.diamond': 'ひし形',
      'shape.star': '星',
      'shape.custom': 'カスタム',
      'palette.github': 'GitHub',
      'palette.ocean': 'オーシャン',
      'palette.violet': 'バイオレット',
      'palette.sunset': 'サンセット',
      'palette.mono': 'モノ',
      'palette.custom': 'カスタム',
      'intensity.linear': '線形',
      'intensity.log': '対数',
      'intensity.rank': '順位',
      'weekStart.sun': '日曜',
      'weekStart.mon': '月曜',
      'unit.minutes': '{n}分',
      'unit.hours': '{h}時間{m}分',
      'dock.label': 'アクティビティ',
      'dock.summary': 'アクティブ {n}日',
    };

    const ZH = {
      nav: '活动',
      title: '活动热力图',
      intro: '每天一格，显示你使用 DeepSeek Harness 的活跃程度。数据在你的会话日志中本地统计。',
      'summary.activeDays': '活跃天数',
      'summary.currentStreak': '当前连续',
      'summary.longestStreak': '最长连续',
      'summary.total': '合计',
      'summary.busiest': '最活跃的一天',
      'summary.days': '{n} 天',
      'summary.day': '{n} 天',
      'chart.title': '日历',
      'chart.hint': '每一格代表一天，颜色越深活动越多。',
      'chart.scanning': '正在读取会话… {scanned} / {total}',
      'chart.scanningUnknown': '正在读取会话…',
      'chart.partial': '{n} 个会话无法读取',
      'chart.refresh': '刷新',
      'chart.less': '少',
      'chart.more': '多',
      'chart.empty': '还没有活动记录。',
      'chart.error': '无法读取活动：{message}',
      'chart.scanError': '无法读取会话：{message}',
      'chart.retry': '重试',
      'chart.cellTitle': '{date}：{value}',
      controls: '外观',
      'controls.metric': '指标',
      'controls.layout': '日历',
      'controls.shape': '形状',
      'controls.customPath': 'SVG 路径（viewBox 0 0 100 100）',
      'controls.cell': '格子大小',
      'controls.gap': '间距',
      'controls.palette': '配色',
      'controls.colors': '颜色',
      'controls.emptyAuto': '空白日使用主题色',
      'controls.weekStart': '每周始于',
      'controls.intensity': '浓度',
      'controls.weeks': '显示周数',
      'controls.monthLabels': '月份标签',
      'controls.weekdayLabels': '星期标签',
      'controls.legend': '图例',
      'controls.display': '显示',
      'controls.dock': '在输入框下显示紧凑条',
      'controls.reset': '恢复默认',
      'metric.messages': '消息',
      'metric.activeMinutes': '活跃时间',
      'metric.toolCalls': '工具调用',
      'metric.turns': '轮次',
      'metric.sessions': '会话',
      'metric.tokens': 'Token',
      'layout.year': '一年',
      'layout.months': '按月',
      'layout.rolling': '最近',
      'shape.square': '方形',
      'shape.rounded': '圆角',
      'shape.circle': '圆形',
      'shape.hexagon': '六边形',
      'shape.diamond': '菱形',
      'shape.star': '星形',
      'shape.custom': '自定义',
      'palette.github': 'GitHub',
      'palette.ocean': '海洋',
      'palette.violet': '紫罗兰',
      'palette.sunset': '日落',
      'palette.mono': '单色',
      'palette.custom': '自定义',
      'intensity.linear': '线性',
      'intensity.log': '对数',
      'intensity.rank': '分位',
      'weekStart.sun': '周日',
      'weekStart.mon': '周一',
      'unit.minutes': '{n} 分',
      'unit.hours': '{h} 小时 {m} 分',
      'dock.label': '活动',
      'dock.summary': '活跃 {n} 天',
    };

    /* ------------------------------------------------------------------ */
    /* Runtime bridge                                                      */
    /* ------------------------------------------------------------------ */

    const runtime = { ctx: null, t: null, localeId: 'en' };

    /** The active locale id, defaulting to English. */
    function activeLocale() {
      try {
        const snapshot = runtime.ctx?.locale.getSnapshot();
        const id = snapshot?.active ?? snapshot?.id;
        return typeof id === 'string' && id.length > 0 ? id : 'en';
      } catch {
        return 'en';
      }
    }

    /** Translate through the namespace binding. */
    function t(key, params) {
      const fn = runtime.t;
      if (typeof fn !== 'function') return key;
      try {
        return fn(key, params);
      } catch {
        return key;
      }
    }

    /** Re-render on a language switch. */
    function useLocale() {
      const [tick, setTick] = React.useState(0);
      React.useEffect(() => {
        const ctx = runtime.ctx;
        if (!ctx?.locale?.subscribe) return undefined;
        return ctx.locale.subscribe(() => setTick((value) => value + 1));
      }, []);
      runtime.localeId = activeLocale();
      return tick;
    }

    /* ------------------------------------------------------------------ */
    /* Settings                                                            */
    /* ------------------------------------------------------------------ */

    function normalizeSettings(input) {
      const out = { ...DEFAULTS, colors: DEFAULTS.colors.slice() };
      if (!input || typeof input !== 'object') return out;

      if (METRICS.includes(input.metric)) out.metric = input.metric;
      if (LAYOUTS.includes(input.layout)) out.layout = input.layout;
      if (INTENSITIES.includes(input.intensity)) out.intensity = input.intensity;
      if (SHAPES.includes(input.shape)) out.shape = input.shape;
      out.customPath = sanitizePath(input.customPath);
      out.cell = clamp(numberOr(input.cell, out.cell), 5, 20);
      out.gap = clamp(numberOr(input.gap, out.gap), 1, 8);
      out.weeks = clamp(Math.round(numberOr(input.weeks, out.weeks)), 8, 52);
      out.dockWeeks = clamp(Math.round(numberOr(input.dockWeeks, out.dockWeeks)), 7, 52);
      out.weekStart = input.weekStart === 0 ? 0 : 1;
      out.showMonthLabels = input.showMonthLabels !== false;
      out.showWeekdayLabels = input.showWeekdayLabels !== false;
      out.showLegend = input.showLegend !== false;
      out.showDock = input.showDock !== false;

      const palette = input.palette;
      if (palette === 'custom' && validColors(input.colors)) {
        out.palette = 'custom';
        out.colors = input.colors.slice().map((color) => (color === 'auto' ? 'auto' : expandColor(color)));
      } else if (PALETTE_IDS.includes(palette)) {
        out.palette = palette;
        out.colors = PALETTES[palette].slice();
      } else if (validColors(input.colors)) {
        out.palette = 'custom';
        out.colors = input.colors.slice().map((color) => (color === 'auto' ? 'auto' : expandColor(color)));
      }
      return out;
    }

    function validColors(colors) {
      return Array.isArray(colors) && colors.length === 5
        && colors.every((color) => color === 'auto' || /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(color)));
    }

    function expandColor(color) {
      if (typeof color !== 'string') return '#000000';
      if (/^#[0-9a-f]{3}$/i.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toLowerCase();
      }
      return color.toLowerCase();
    }

    function sanitizePath(value) {
      if (typeof value !== 'string') return '';
      const trimmed = value.trim().slice(0, 1200);
      return /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]*$/.test(trimmed) ? trimmed : '';
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function numberOr(value, fallback) {
      return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    }

    function readSettings() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return normalizeSettings(null);
        return normalizeSettings(JSON.parse(raw));
      } catch {
        return normalizeSettings(null);
      }
    }

    const settingsStore = {
      value: readSettings(),
      listeners: new Set(),
      write(patch) {
        this.value = normalizeSettings({ ...this.value, ...patch });
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.value));
        } catch {
          /* private mode: keep the in-memory value */
        }
        this.emit();
      },
      reset() {
        this.value = normalizeSettings(null);
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        this.emit();
      },
      emit() {
        for (const listener of this.listeners) listener(this.value);
      },
      subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      },
    };

    function useSettings() {
      const [value, setValue] = React.useState(settingsStore.value);
      React.useEffect(() => settingsStore.subscribe(setValue), []);
      return [value, (patch) => settingsStore.write(patch), () => settingsStore.reset()];
    }

    /* ------------------------------------------------------------------ */
    /* Stats                                                               */
    /* ------------------------------------------------------------------ */

    const statsStore = {
      data: null,
      error: null,
      loading: false,
      inflight: null,
      listeners: new Set(),
      emit() {
        for (const listener of this.listeners) listener();
      },
      subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
      },
      load(force) {
        if (this.inflight) return this.inflight;
        this.loading = true;
        this.emit();
        let request;
        try {
          const url = new URL('/plugin-api/activity-heatmap/stats', window.location.origin);
          url.searchParams.set('tz', browserTimeZone());
          url.searchParams.set('days', String(STATS_DAYS));
          url.searchParams.set('wait', '1200');
          if (force) url.searchParams.set('refresh', '1');
          request = window.fetch(url.toString(), {
            headers: { accept: 'application/json' },
            cache: 'no-store',
          });
        } catch (error) {
          request = Promise.reject(error);
        }
        this.inflight = request
          .then((response) => {
            if (!response || !response.ok) throw new Error(`HTTP ${response ? response.status : '?'}`);
            return response.json();
          })
          .then((payload) => {
            if (!payload || payload.ok !== true) throw new Error(payload?.error || 'invalid response');
            this.data = payload;
            this.error = null;
          })
          .catch((error) => {
            this.error = error instanceof Error ? error.message : String(error);
          })
          .finally(() => {
            this.loading = false;
            this.inflight = null;
            this.emit();
          });
        return this.inflight;
      },
    };

    function browserTimeZone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      } catch {
        return 'UTC';
      }
    }

    function useStats() {
      const [state, setState] = React.useState({
        data: statsStore.data,
        error: statsStore.error,
        loading: statsStore.loading,
      });
      React.useEffect(() => {
        const update = () => setState({
          data: statsStore.data,
          error: statsStore.error,
          loading: statsStore.loading,
        });
        const unsubscribe = statsStore.subscribe(update);
        statsStore.load(false);
        return unsubscribe;
      }, []);
      const scanning = state.data?.scan?.status === 'scanning';
      const scanned = state.data?.scan?.scanned;
      React.useEffect(() => {
        if (!scanning) return undefined;
        const timer = window.setTimeout(() => statsStore.load(false), 1400);
        return () => window.clearTimeout(timer);
      }, [scanning, scanned]);
      return state;
    }

    /* ------------------------------------------------------------------ */
    /* Date and value helpers                                              */
    /* ------------------------------------------------------------------ */

    function addDays(date, delta) {
      const [year, month, day] = date.split('-').map(Number);
      const shifted = new Date(Date.UTC(year, month - 1, day + delta));
      return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
    }

    function pad2(value) {
      return String(value).padStart(2, '0');
    }

    function weekdayOffset(date, weekStart) {
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      return (day - weekStart + 7) % 7;
    }

    function monthOf(date) {
      return date.slice(0, 7);
    }

    function formatMonth(date, locale) {
      try {
        return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
          .format(new Date(`${date}T12:00:00Z`));
      } catch {
        return date.slice(5, 7);
      }
    }

    function formatWeekday(index, locale) {
      // 2024-01-07 is a Sunday; index is 0..6 from Sunday.
      const date = new Date(Date.UTC(2024, 0, 7 + index, 12));
      try {
        return new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(date);
      } catch {
        return '';
      }
    }

    function formatDate(date, locale) {
      try {
        return new Intl.DateTimeFormat(locale, {
          weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
        }).format(new Date(`${date}T12:00:00Z`));
      } catch {
        return date;
      }
    }

    function metricValue(day, metric) {
      if (!day) return 0;
      const value = day[metric];
      return typeof value === 'number' && Number.isFinite(value) ? value : 0;
    }

    function formatValue(metric, value, locale) {
      if (metric === 'activeMinutes') {
        const minutes = Math.round(value);
        if (minutes < 60) return t('unit.minutes', { n: minutes });
        const hours = Math.floor(minutes / 60);
        return t('unit.hours', { h: hours, m: minutes % 60 });
      }
      if (metric === 'tokens') {
        try {
          return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
        } catch {
          return String(value);
        }
      }
      return String(Math.round(value));
    }

    function buildLevels(values, mode) {
      const positive = values.filter((value) => value > 0);
      if (positive.length === 0) return () => 0;
      if (mode === 'rank') {
        const sorted = positive.slice().sort((a, b) => a - b);
        const at = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)))];
        const q1 = at(0.25);
        const q2 = at(0.5);
        const q3 = at(0.75);
        return (value) => (value <= 0 ? 0 : value <= q1 ? 1 : value <= q2 ? 2 : value <= q3 ? 3 : 4);
      }
      const max = positive.reduce((best, value) => Math.max(best, value), 0);
      const logMax = Math.log1p(max);
      const scale = mode === 'log'
        ? (value) => (logMax > 0 ? Math.log1p(value) / logMax : 0)
        : (value) => (max > 0 ? value / max : 0);
      return (value) => {
        if (value <= 0) return 0;
        const ratio = scale(value);
        return ratio > 0.75 ? 4 : ratio > 0.5 ? 3 : ratio > 0.25 ? 2 : 1;
      };
    }

    /* ------------------------------------------------------------------ */
    /* Shape geometry                                                      */
    /* ------------------------------------------------------------------ */

    function shapeElement(shape, x, y, size, customPath, fill, extra) {
      const base = { fill, ...extra };
      if (shape === 'circle') {
        return h('circle', { ...base, cx: x + size / 2, cy: y + size / 2, r: Math.max(1, size * 0.47) });
      }
      if (shape === 'rounded') {
        return h('rect', { ...base, x, y, width: size, height: size, rx: Math.max(1.5, size * 0.28) });
      }
      if (shape === 'hexagon') {
        return h('polygon', { ...base, points: polygonPoints(x + size / 2, y + size / 2, size * 0.5, 6) });
      }
      if (shape === 'diamond') {
        const half = size / 2;
        return h('polygon', {
          ...base,
          points: [
            `${x + half},${y}`,
            `${x + size},${y + half}`,
            `${x + half},${y + size}`,
            `${x},${y + half}`,
          ].join(' '),
        });
      }
      if (shape === 'star') {
        return h('polygon', { ...base, points: radialPoints(x + size / 2, y + size / 2, size * 0.5, 5, size * 0.24) });
      }
      if (shape === 'custom' && customPath) {
        return h('path', {
          ...base,
          d: customPath,
          transform: `translate(${x} ${y}) scale(${size / 100})`,
        });
      }
      return h('rect', { ...base, x, y, width: size, height: size, rx: Math.max(0, size * 0.08) });
    }

    function polygonPoints(cx, cy, radius, sides) {
      const points = [];
      for (let index = 0; index < sides; index += 1) {
        const angle = -Math.PI / 2 + (index * 2 * Math.PI) / sides;
        points.push(`${round(cx + Math.cos(angle) * radius)},${round(cy + Math.sin(angle) * radius)}`);
      }
      return points.join(' ');
    }

    function radialPoints(cx, cy, outer, spikes, inner) {
      const points = [];
      const step = Math.PI / spikes;
      for (let index = 0; index < spikes * 2; index += 1) {
        const radius = index % 2 === 0 ? outer : inner;
        const angle = -Math.PI / 2 + index * step;
        points.push(`${round(cx + Math.cos(angle) * radius)},${round(cy + Math.sin(angle) * radius)}`);
      }
      return points.join(' ');
    }

    function round(value) {
      return Math.round(value * 100) / 100;
    }

    /* ------------------------------------------------------------------ */
    /* Grid construction                                                   */
    /* ------------------------------------------------------------------ */

    function gridWeeks(days, weekStart, columns) {
      const map = new Map(days.map((day) => [day.date, day]));
      const last = days[days.length - 1];
      if (!last) return { weeks: [], map, start: null, end: null };
      const gridEnd = addDays(last.date, 6 - weekdayOffset(last.date, weekStart));
      const gridStart = addDays(gridEnd, -(columns * 7 - 1));
      const weeks = [];
      for (let column = 0; column < columns; column += 1) {
        const week = [];
        for (let row = 0; row < 7; row += 1) {
          const date = addDays(gridStart, column * 7 + row);
          week.push(map.get(date) ?? null);
        }
        weeks.push(week);
      }
      return { weeks, map, start: gridStart, end: gridEnd };
    }

    function monthLabels(weeks, weekStart, locale) {
      const labels = [];
      let previous = null;
      let lastX = -Infinity;
      weeks.forEach((week, column) => {
        const first = week.find(Boolean);
        if (!first) return;
        const month = monthOf(first.date);
        if (month === previous) return;
        previous = month;
        const x = column * 1;
        if (x - lastX < 3 && labels.length > 0) return;
        lastX = x;
        labels.push({ column, text: formatMonth(first.date, locale) });
      });
      return labels;
    }

    /* ------------------------------------------------------------------ */
    /* Chart                                                               */
    /* ------------------------------------------------------------------ */

    function Chart({ days, config, levelOf, onHover }) {
      const locale = runtime.localeId;
      if (days.length === 0) {
        return h('p', { className: 'ah-empty' }, t('chart.empty'));
      }
      if (config.layout === 'months') {
        return h(MonthsChart, { days, config, levelOf, locale, onHover });
      }
      const columns = config.layout === 'rolling' ? config.weeks : 53;
      const { weeks } = gridWeeks(days, config.weekStart, columns);
      const cell = clamp(config.cell, 5, 20);
      const gap = clamp(config.gap, 1, 8);
      const labelWidth = config.showWeekdayLabels ? 24 : 0;
      const topPad = config.showMonthLabels ? 16 : 0;
      const width = labelWidth + weeks.length * (cell + gap) - gap;
      const height = topPad + 7 * (cell + gap) - gap;

      const labels = config.showMonthLabels ? monthLabels(weeks, config.weekStart, locale) : [];
      const children = [];

      if (config.showWeekdayLabels) {
        for (const weekday of [1, 3, 5]) {
          const row = (weekday - config.weekStart + 7) % 7;
          children.push(h('text', {
            key: `w${weekday}`,
            className: 'ah-axis',
            x: labelWidth - 6,
            y: topPad + row * (cell + gap) + cell * 0.8,
            textAnchor: 'end',
          }, formatWeekday(weekday, locale)));
        }
      }

      if (config.showMonthLabels) {
        for (const label of labels) {
          children.push(h('text', {
            key: `m${label.column}`,
            className: 'ah-axis',
            x: labelWidth + label.column * (cell + gap),
            y: topPad - 5,
          }, label.text));
        }
      }

      const today = days[days.length - 1].date;
      const nodes = [];
      weeks.forEach((week, column) => {
        week.forEach((day, row) => {
          if (!day) return;
          const value = metricValue(day, config.metric);
          const level = levelOf(value);
          const x = labelWidth + column * (cell + gap);
          const y = topPad + row * (cell + gap);
          const extra = { className: 'ah-cell' };
          if (day.date === today) {
            extra.stroke = 'var(--dsw-alias-brand-primary)';
            extra.strokeWidth = 1;
            extra.strokeOpacity = 0.8;
          }
          nodes.push(h('g', {
            key: day.date,
            onMouseEnter: onHover ? () => onHover(day) : undefined,
            onMouseLeave: onHover ? () => onHover(null) : undefined,
          },
          shapeElement(config.shape, x, y, cell, config.customPath, `var(--ah-c${level})`, extra),
          h('title', null, t('chart.cellTitle', {
            date: formatDate(day.date, locale),
            value: formatValue(config.metric, value, locale),
          }))));
        });
      });

      return h('svg', {
        className: 'ah-svg',
        width,
        height,
        viewBox: `0 0 ${width} ${height}`,
        role: 'img',
        'aria-label': t('chart.hint'),
        style: { ...colorVars(config), width: '100%', maxWidth: `${width}px`, height: 'auto' },
      }, children, nodes);
    }

    function MonthsChart({ days, config, levelOf, locale, onHover }) {
      const cell = clamp(Math.min(config.cell, 14), 5, 20);
      const gap = clamp(config.gap, 1, 6);
      const blocks = groupMonths(days).slice(-12);
      const today = days[days.length - 1].date;
      return h('div', { className: 'ah-months' }, blocks.map((block) => {
        const leading = weekdayOffset(block.start, config.weekStart);
        const cells = [];
        for (let index = 0; index < leading; index += 1) cells.push(null);
        for (const day of block.days) cells.push(day);
        while (cells.length % 7 !== 0) cells.push(null);
        const rows = Math.ceil(cells.length / 7);
        const width = 7 * (cell + gap) - gap;
        const height = 16 + rows * (cell + gap) - gap;
        const items = [];
        for (let index = 0; index < 7; index += 1) {
          const weekday = (index + config.weekStart) % 7;
          items.push(h('text', {
            key: `h${index}`,
            className: 'ah-axis',
            x: index * (cell + gap) + cell / 2,
            y: 8,
            textAnchor: 'middle',
          }, formatWeekday(weekday, locale)));
        }
        cells.forEach((day, index) => {
          if (!day) return;
          const column = index % 7;
          const row = Math.floor(index / 7);
          const value = metricValue(day, config.metric);
          const level = levelOf(value);
          const extra = { className: 'ah-cell' };
          if (day.date === today) {
            extra.stroke = 'var(--dsw-alias-brand-primary)';
            extra.strokeWidth = 1;
            extra.strokeOpacity = 0.8;
          }
          items.push(h('g', {
            key: day.date,
            onMouseEnter: onHover ? () => onHover(day) : undefined,
            onMouseLeave: onHover ? () => onHover(null) : undefined,
          },
          shapeElement(config.shape, column * (cell + gap), 16 + row * (cell + gap), cell, config.customPath,
            `var(--ah-c${level})`, extra),
          h('title', null, t('chart.cellTitle', {
            date: formatDate(day.date, locale),
            value: formatValue(config.metric, value, locale),
          }))));
        });
        return h('div', { className: 'ah-month', key: block.key },
          h('div', { className: 'ah-month-label' }, formatMonth(block.start, locale)),
          h('svg', {
            className: 'ah-svg',
            width,
            height,
            viewBox: `0 0 ${width} ${height}`,
            role: 'img',
            'aria-label': formatMonth(block.start, locale),
            style: colorVars(config),
          }, items));
      }));
    }

    function groupMonths(days) {
      const blocks = [];
      let current = null;
      for (const day of days) {
        const key = monthOf(day.date);
        if (!current || current.key !== key) {
          current = { key, start: day.date, days: [] };
          blocks.push(current);
        }
        current.days.push(day);
      }
      return blocks;
    }

    function colorVars(config) {
      return {
        '--ah-c0': config.colors[0] === 'auto'
          ? 'color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent)'
          : expandColor(config.colors[0]),
        '--ah-c1': expandColor(config.colors[1]),
        '--ah-c2': expandColor(config.colors[2]),
        '--ah-c3': expandColor(config.colors[3]),
        '--ah-c4': expandColor(config.colors[4]),
      };
    }

    function Legend({ config }) {
      const cell = 10;
      return h('div', { className: 'ah-legend' },
        h('span', null, t('chart.less')),
        h('div', { className: 'ah-legend-cells', style: colorVars(config) },
          [0, 1, 2, 3, 4].map((level) => h('svg', {
            key: level,
            width: cell + 2,
            height: cell + 2,
            viewBox: `0 0 ${cell + 2} ${cell + 2}`,
            'aria-hidden': true,
          }, shapeElement(config.shape, 1, 1, cell, config.customPath, `var(--ah-c${level})`, {})))),
        h('span', null, t('chart.more')));
    }

    /* ------------------------------------------------------------------ */
    /* Summary                                                             */
    /* ------------------------------------------------------------------ */

    function summarize(days, config) {
      const values = days.map((day) => metricValue(day, config.metric));
      const activeDays = values.filter((value) => value > 0).length;
      const total = values.reduce((sum, value) => sum + value, 0);
      let current = 0;
      for (let index = values.length - 1; index >= 0; index -= 1) {
        if (values[index] > 0) current += 1;
        else break;
      }
      let longest = 0;
      let run = 0;
      for (const value of values) {
        if (value > 0) {
          run += 1;
          longest = Math.max(longest, run);
        } else {
          run = 0;
        }
      }
      let best = null;
      days.forEach((day, index) => {
        if (best === null || values[index] > best.value) best = { day, value: values[index] };
      });
      return { activeDays, total, current, longest, best };
    }

    function Summary({ days, config }) {
      if (days.length === 0) return null;
      const stats = summarize(days, config);
      const locale = runtime.localeId;
      const chips = [
        { label: t('summary.activeDays'), value: t('summary.days', { n: stats.activeDays }) },
        { label: t('summary.currentStreak'), value: t('summary.days', { n: stats.current }) },
        { label: t('summary.longestStreak'), value: t('summary.days', { n: stats.longest }) },
        { label: t('summary.total'), value: formatValue(config.metric, stats.total, locale) },
      ];
      if (stats.best && stats.best.value > 0) {
        chips.push({
          label: t('summary.busiest'),
          value: `${formatDate(stats.best.day.date, locale)} · ${formatValue(config.metric, stats.best.value, locale)}`,
        });
      }
      return h('div', { className: 'ah-summary' }, chips.map((chip) =>
        h('div', { className: 'ah-chip', key: chip.label },
          h('span', { className: 'ah-chip-value' }, chip.value),
          h('span', { className: 'ah-chip-label' }, chip.label))));
    }

    /* ------------------------------------------------------------------ */
    /* Controls                                                            */
    /* ------------------------------------------------------------------ */

    function Segmented({ options, value, onChange, label }) {
      return h('div', { className: 'ah-seg', role: 'group', 'aria-label': label },
        options.map((option) => h('button', {
          key: option.id,
          type: 'button',
          'data-active': String(option.id === value),
          'aria-pressed': option.id === value,
          onClick: () => onChange(option.id),
        }, option.label)));
    }

    function Row({ label, children }) {
      return h('div', { className: 'ah-row' },
        h('div', { className: 'ah-row-label' }, label),
        h('div', { className: 'ah-row-body' }, children));
    }

    function Check({ checked, onChange, label }) {
      return h('label', { className: 'ah-check' },
        h('input', {
          type: 'checkbox',
          checked,
          onChange: (event) => onChange(event.target.checked),
        }),
        h('span', null, label));
    }

    function Range({ value, min, max, step, onChange, label }) {
      return h('div', { className: 'ah-range-wrap' },
        h('input', {
          className: 'ah-range',
          type: 'range',
          min,
          max,
          step,
          value,
          'aria-label': label,
          onChange: (event) => onChange(Number(event.target.value)),
        }),
        h('span', { className: 'ah-range-value' }, String(value)));
    }

    function Controls({ config, update, reset }) {
      const metricOptions = METRICS.map((id) => ({ id, label: t(`metric.${id}`) }));
      const layoutOptions = LAYOUTS.map((id) => ({ id, label: t(`layout.${id}`) }));
      const shapeOptions = SHAPES.map((id) => ({ id, label: t(`shape.${id}`) }));
      const intensityOptions = INTENSITIES.map((id) => ({ id, label: t(`intensity.${id}`) }));

      return h('section', { className: 'ah-card' },
        h('div', { className: 'ah-card-head' },
          h('h3', { className: 'ah-card-title' }, t('controls')),
          h('button', { className: 'ah-text-btn', type: 'button', onClick: reset }, t('controls.reset'))),
        h('div', { className: 'ah-controls' },
          h(Row, { label: t('controls.metric') },
            h(Segmented, { options: metricOptions, value: config.metric, onChange: (metric) => update({ metric }), label: t('controls.metric') })),
          h(Row, { label: t('controls.layout') },
            h(Segmented, { options: layoutOptions, value: config.layout, onChange: (layout) => update({ layout }), label: t('controls.layout') }),
            config.layout === 'rolling' ? h(Segmented, {
              options: [13, 26, 52].map((weeks) => ({ id: weeks, label: String(weeks) })),
              value: config.weeks,
              onChange: (weeks) => update({ weeks }),
              label: t('controls.weeks'),
            }) : null),
          h(Row, { label: t('controls.shape') },
            h(Segmented, { options: shapeOptions, value: config.shape, onChange: (shape) => update({ shape }), label: t('controls.shape') })),
          config.shape === 'custom' ? h(Row, { label: t('controls.customPath') },
            h('input', {
              className: 'ah-input',
              type: 'text',
              value: config.customPath,
              placeholder: 'M50 4 L96 92 L4 92 Z',
              spellCheck: false,
              onChange: (event) => update({ customPath: event.target.value }),
            })) : null,
          h(Row, { label: t('controls.cell') },
            h(Range, { value: config.cell, min: 5, max: 20, step: 1, onChange: (cell) => update({ cell }), label: t('controls.cell') })),
          h(Row, { label: t('controls.gap') },
            h(Range, { value: config.gap, min: 1, max: 8, step: 1, onChange: (gap) => update({ gap }), label: t('controls.gap') })),
          h(Row, { label: t('controls.palette') },
            h('div', { className: 'ah-palettes' },
              PALETTE_IDS.map((id) => h('button', {
                key: id,
                type: 'button',
                className: 'ah-palette',
                'data-active': String(config.palette === id),
                title: t(`palette.${id}`),
                'aria-label': t(`palette.${id}`),
                onClick: () => update({ palette: id, colors: PALETTES[id].slice() }),
              }, PALETTES[id].slice(1).map((color, index) => h('span', {
                key: index,
                className: 'ah-palette-dot',
                style: { background: color },
              })))),
              h('span', { className: 'ah-hint' }, t(`palette.${config.palette}`)))),
          h(Row, { label: t('controls.colors') },
            h('div', { className: 'ah-colors' },
              h(Check, {
                checked: config.colors[0] === 'auto',
                onChange: (checked) => update({
                  palette: 'custom',
                  colors: [checked ? 'auto' : '#ebedf0', ...config.colors.slice(1)],
                }),
                label: t('controls.emptyAuto'),
              }),
              config.colors[0] === 'auto' ? null : h('input', {
                className: 'ah-color',
                type: 'color',
                value: config.colors[0],
                'aria-label': `${t('controls.colors')} 0`,
                onChange: (event) => {
                  const colors = config.colors.slice();
                  colors[0] = event.target.value;
                  update({ palette: 'custom', colors });
                },
              }),
              [1, 2, 3, 4].map((index) => h('input', {
                key: index,
                className: 'ah-color',
                type: 'color',
                value: config.colors[index],
                'aria-label': `${t('controls.colors')} ${index}`,
                onChange: (event) => {
                  const colors = config.colors.slice();
                  colors[index] = event.target.value;
                  update({ palette: 'custom', colors });
                },
              })))),
          h(Row, { label: t('controls.weekStart') },
            h(Segmented, {
              options: [
                { id: 0, label: t('weekStart.sun') },
                { id: 1, label: t('weekStart.mon') },
              ],
              value: config.weekStart,
              onChange: (weekStart) => update({ weekStart }),
              label: t('controls.weekStart'),
            })),
          h(Row, { label: t('controls.intensity') },
            h(Segmented, { options: intensityOptions, value: config.intensity, onChange: (intensity) => update({ intensity }), label: t('controls.intensity') })),
          h(Row, { label: t('controls.display') },
            h('div', { className: 'ah-checks' },
              h(Check, { checked: config.showMonthLabels, onChange: (value) => update({ showMonthLabels: value }), label: t('controls.monthLabels') }),
              h(Check, { checked: config.showWeekdayLabels, onChange: (value) => update({ showWeekdayLabels: value }), label: t('controls.weekdayLabels') }),
              h(Check, { checked: config.showLegend, onChange: (value) => update({ showLegend: value }), label: t('controls.legend') }),
              h(Check, { checked: config.showDock, onChange: (value) => update({ showDock: value }), label: t('controls.dock') })))),
      );
    }

    /* ------------------------------------------------------------------ */
    /* Page                                                                */
    /* ------------------------------------------------------------------ */

    function ActivityPage() {
      useLocale();
      const [config, update, reset] = useSettings();
      const { data, error, loading } = useStats();
      const [hover, setHover] = React.useState(null);
      const days = data?.days ?? [];
      const values = React.useMemo(() => days.map((day) => metricValue(day, config.metric)), [days, config.metric]);
      const levelOf = React.useMemo(() => buildLevels(values, config.intensity), [values, config.intensity]);
      const locale = runtime.localeId;
      const scan = data?.scan;

      React.useEffect(() => {
        const onVisible = () => {
          if (!document.hidden) statsStore.load(false);
        };
        document.addEventListener('visibilitychange', onVisible);
        const timer = window.setInterval(() => {
          if (!document.hidden) statsStore.load(false);
        }, 60_000);
        return () => {
          document.removeEventListener('visibilitychange', onVisible);
          window.clearInterval(timer);
        };
      }, []);

      const status = scan?.status === 'error' && scan.error
        ? t('chart.scanError', { message: scan.error })
        : scan?.status === 'scanning'
          ? (scan.total > 0 ? t('chart.scanning', { scanned: scan.scanned, total: scan.total }) : t('chart.scanningUnknown'))
          : scan && scan.status === 'partial' && scan.failed > 0
            ? t('chart.partial', { n: scan.failed })
            : null;

      const readout = hover
        ? `${formatDate(hover.date, locale)} · ${formatValue(config.metric, metricValue(hover, config.metric), locale)}`
        : '';

      return h('div', { className: 'ah-page' },
        h('div', { className: 'ah-head' },
          h('h2', { className: 'ah-title' }, t('title')),
          h('p', { className: 'ah-intro' }, t('intro'))),
        h(Summary, { days, config }),
        h('section', { className: 'ah-card' },
          h('div', { className: 'ah-card-head' },
            h('h3', { className: 'ah-card-title' }, t('chart.title')),
            h('div', { className: 'ah-card-actions' },
              status ? h('span', { className: 'ah-hint', role: 'status' }, status) : null,
              h('button', {
                className: 'ah-text-btn',
                type: 'button',
                disabled: loading,
                onClick: () => statsStore.load(true),
              }, t('chart.refresh')))),
          error
            ? h('div', { className: 'ah-error' },
              h('p', null, t('chart.error', { message: error })),
              h('button', { className: 'ah-text-btn', type: 'button', onClick: () => statsStore.load(true) }, t('chart.retry')))
            : loading && days.length === 0
              ? h('p', { className: 'ah-empty' }, t('chart.scanningUnknown'))
              : h('div', { className: 'ah-chart' },
                h(Chart, { days, config, levelOf, onHover: setHover })),
          error ? null : h('div', { className: 'ah-readout' }, readout),
          config.showLegend ? h(Legend, { config }) : null,
          h('p', { className: 'ah-hint' }, t('chart.hint'))),
        h(Controls, { config, update, reset }));
    }

    /* ------------------------------------------------------------------ */
    /* Composer dock strip                                                 */
    /* ------------------------------------------------------------------ */

    function ActivityDock() {
      useLocale();
      const [config] = useSettings();
      const { data } = useStats();
      if (!config.showDock) return null;
      const days = data?.days ?? [];
      if (days.length === 0) return null;
      const values = days.map((day) => metricValue(day, config.metric));
      const levelOf = buildLevels(values, config.intensity);
      const weeksCount = clamp(config.dockWeeks, 7, 52);
      const columns = Math.min(weeksCount, Math.floor(days.length / 7));
      const cell = 7;
      const gap = 2;
      const { weeks } = gridWeeks(days, config.weekStart, columns);
      const width = weeks.length * (cell + gap) - gap;
      const height = 7 * (cell + gap) - gap;
      const locale = runtime.localeId;
      const activeDays = values.slice(-columns * 7).filter((value) => value > 0).length;
      const nodes = [];
      weeks.forEach((week, column) => {
        week.forEach((day, row) => {
          if (!day) return;
          const value = metricValue(day, config.metric);
          nodes.push(h('g', { key: day.date },
            shapeElement(config.shape, column * (cell + gap), row * (cell + gap), cell, config.customPath,
              `var(--ah-c${levelOf(value)})`, {}),
            h('title', null, t('chart.cellTitle', {
              date: formatDate(day.date, locale),
              value: formatValue(config.metric, value, locale),
            }))));
        });
      });
      return h('div', { className: 'ah-dock' },
        h('span', { className: 'ah-dock-label' }, t('dock.label')),
        h('svg', {
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          role: 'img',
          'aria-label': t('dock.summary', { n: activeDays }),
          style: colorVars(config),
        }, nodes),
        h('span', { className: 'ah-dock-total' }, t('dock.summary', { n: activeDays })));
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const CSS = `
.ah-page{display:flex;flex-direction:column;gap:16px;max-width:760px;color:var(--dsw-alias-label-primary);font-family:inherit}
.ah-head{display:flex;flex-direction:column;gap:4px}
.ah-title{margin:0;font-size:18px;font-weight:600;line-height:26px}
.ah-intro{margin:0;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary)}
.ah-summary{display:flex;flex-wrap:wrap;gap:8px}
.ah-chip{box-sizing:border-box;display:flex;flex-direction:column;gap:2px;min-width:104px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}
.ah-chip-value{font-size:17px;font-weight:600;line-height:24px;font-variant-numeric:tabular-nums;white-space:nowrap}
.ah-chip-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.ah-card{box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:14px 16px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1)}
.ah-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:24px}
.ah-card-title{margin:0;font-size:13px;font-weight:600;line-height:20px}
.ah-card-actions{display:flex;align-items:center;gap:10px;min-width:0}
.ah-chart{display:flex;flex-direction:column;gap:6px;overflow-x:auto;overflow-y:hidden;padding-bottom:2px}
.ah-svg{display:block;flex:none;overflow:visible}
.ah-axis{fill:var(--dsw-alias-label-secondary);font-size:9px;font-family:inherit}
.ah-cell{transition:opacity .12s ease}
.ah-cell:hover{opacity:.72}
.ah-readout{min-height:18px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.ah-hint{margin:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.ah-empty{margin:0;padding:18px 0;font-size:13px;color:var(--dsw-alias-label-secondary)}
.ah-error{display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:10px}
.ah-error p{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}
.ah-legend{display:flex;align-items:center;justify-content:flex-end;gap:6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.ah-legend-cells{display:flex;align-items:center;gap:2px}
.ah-months{display:flex;flex-wrap:wrap;gap:16px}
.ah-month{display:flex;flex-direction:column;gap:4px}
.ah-month-label{font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary)}
.ah-controls{display:flex;flex-direction:column;gap:12px}
.ah-row{display:flex;align-items:flex-start;gap:14px}
.ah-row-label{flex:none;width:128px;font-size:13px;line-height:28px;color:var(--dsw-alias-label-secondary)}
.ah-row-body{display:flex;flex:1;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;padding-top:1px}
.ah-seg{display:inline-flex;flex-wrap:wrap;gap:2px;padding:2px;border-radius:8px;background:var(--dsw-alias-bg-layer-2)}
.ah-seg button{border:0;border-radius:6px;padding:4px 9px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}
.ah-seg button:hover{color:var(--dsw-alias-label-primary)}
.ah-seg button[data-active=true]{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 0 0 1px var(--dsw-alias-border-l1)}
.ah-seg button:focus-visible,.ah-text-btn:focus-visible,.ah-palette:focus-visible,.ah-color:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.ah-range-wrap{display:flex;align-items:center;gap:8px}
.ah-range{width:150px;accent-color:var(--dsw-alias-brand-primary)}
.ah-range-value{min-width:22px;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.ah-input{box-sizing:border-box;width:min(100%,420px);height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px}
.ah-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px;border-color:transparent}
.ah-palettes{display:flex;align-items:center;gap:8px}
.ah-palette{display:flex;align-items:center;gap:2px;padding:4px;border:1px solid transparent;border-radius:7px;background:transparent;cursor:pointer}
.ah-palette[data-active=true]{border-color:var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.ah-palette-dot{width:10px;height:10px;border-radius:2px;display:block}
.ah-colors{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.ah-color{box-sizing:border-box;width:32px;height:28px;padding:0;border:1px solid var(--dsw-alias-border-l1);border-radius:7px;background:transparent;cursor:pointer}
.ah-check{display:inline-flex;align-items:center;gap:6px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary);cursor:pointer}
.ah-check input{width:14px;height:14px;margin:0;accent-color:var(--dsw-alias-brand-primary)}
.ah-checks{display:flex;flex-wrap:wrap;gap:10px 16px}
.ah-text-btn{border:1px solid var(--dsw-alias-border-l1);border-radius:7px;padding:3px 10px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap}
.ah-text-btn:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}
.ah-text-btn:disabled{opacity:.5;cursor:default}
.ah-dock{display:flex;align-items:center;justify-content:center;gap:8px;padding:5px 2px 0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);user-select:none}
.ah-dock svg{display:block;flex:none}
.ah-dock-label{font-weight:500}
.ah-dock-total{white-space:nowrap}
@media (max-width:640px){.ah-row{flex-direction:column;gap:4px}.ah-row-label{width:auto;line-height:20px}}
`;

    /* ------------------------------------------------------------------ */
    /* Mount                                                               */
    /* ------------------------------------------------------------------ */

    function apply(ctx) {
      runtime.ctx = ctx;
      runtime.t = ctx.locale.bind(NS);
      runtime.localeId = activeLocale();

      ctx.effect(() => ctx.locale.register(NS, { en: EN, zh: ZH }), 'activity-heatmap: dictionaries');
      ctx.effect(() => {
        try {
          return ctx.locale.register(NS, 'ja', JA);
        } catch {
          return () => {};
        }
      }, 'activity-heatmap: japanese');

      ctx.effect(() => {
        const style = document.createElement('style');
        style.dataset.plugin = 'dsh-activity-heatmap';
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, 'activity-heatmap: styles');

      ctx.effect(() => {
        const onStorage = (event) => {
          if (event.key !== null && event.key !== STORAGE_KEY) return;
          settingsStore.value = readSettings();
          settingsStore.emit();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
      }, 'activity-heatmap: settings sync');

      ctx.slots.inject('settings.section', () => ctx.slots.register({
        name: 'settings.section',
        id: 'activity',
        order: 17,
        label: () => runtime.t('nav'),
        locale: NS,
      }, ActivityPage));

      ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
        name: 'conversation.composer.dock',
        id: 'activity-heatmap-dock',
        order: 20,
      }, ActivityDock));
    }

    return { apply, inject: ['slots', 'locale'] };
  },
});
