// ─── Types ─────────────────────────────────────────────────────────────────

export interface ThresholdAlertSeed {
	/** Alert rule name. Keep unique per test to avoid collisions. */
	name: string;
	/** The critical-threshold target value to persist and later assert. */
	target: number;
	/**
	 * Notification channel names for the critical threshold. At least one is
	 * required by the API — seed one with {@link createEmailChannelViaApi}.
	 */
	channels: string[];
	/**
	 * Rule labels. `severity` drives the list's Severity column and is one of
	 * the things its search box matches on, so list specs set it explicitly.
	 */
	labels?: Record<string, string>;

	// ── SEED-RV2 extras ─────────────────────────────────────────────────────
	// Everything below exists so an *edit* spec can prove the form prefilled from
	// the rule rather than from its own defaults. A prefill assertion against a
	// value that equals `INITIAL_CREATE_ALERT_STATE` proves nothing, so each of
	// these deliberately differs from the corresponding UI default.

	/**
	 * Replaces the single `critical` threshold. Use two or more to exercise the
	 * multi-threshold prefill — and note the UI only reads `op`/`matchType` back
	 * from `spec[0]`, so entries after the first should keep them identical unless
	 * the test is *about* that defect.
	 */
	thresholds?: ThresholdSeedSpec[];
	/** Go duration; UI default is `5m0s`, so pass something else. */
	evalWindow?: string;
	/** Go duration; UI default is `1m`, so pass something else. */
	frequency?: string;
	/**
	 * `notificationSettings.groupBy`. The UI's group-by select only offers keys
	 * that the *query* groups by (`MultipleNotifications.tsx:20-48`), so set
	 * {@link ThresholdAlertSeed.queryGroupBy} to the same keys or the prefilled
	 * value has no matching option.
	 */
	groupBy?: string[];
	/** Attribute keys the query groups by. Also what unlocks the group-by select. */
	queryGroupBy?: string[];
	/** `notificationSettings.renotify`. UI default is `{enabled: false}`. */
	renotify?: {
		enabled: boolean;
		/** Go duration; UI default is `30m`. */
		interval: string;
		alertStates: ('firing' | 'nodata')[];
	};
	/** `condition.alertOnAbsent` + `condition.absentFor` (minutes). */
	alertOnAbsent?: { absentFor: number };
	/** `condition.recoveryTarget` on the first threshold — the UI never renders it. */
	recoveryTarget?: number | null;
}

export interface ThresholdSeedSpec {
	name: string;
	target: number;
	targetUnit?: string;
	matchType?: string;
	op?: string;
	channels: string[];
	recoveryTarget?: number | null;
}

export interface LogsAlertSeed {
	name: string;
	/** Substring the rule matches on (`body CONTAINS '<marker>'`). */
	marker: string;
	/** Channel *names* (not ids) — the API validates the reference. */
	channels: string[];
	/** Go duration, e.g. `5m0s`. Shrink it to make the rule resolve fast. */
	evalWindow?: string;
	frequency?: string;
	/** Becomes the threshold name, i.e. the history `threshold.name`. */
	severity?: string;
	/**
	 * Extra rule labels merged alongside `severity`. They show up as extra
	 * history `filter_keys`, so add them only where a scenario needs them.
	 */
	extraLabels?: Record<string, string>;
	/** `condition.alertOnAbsent` — the only route to a `nodata` row. */
	alertOnAbsent?: boolean;
	/** `condition.absentFor`, in minutes. */
	absentFor?: number;
}

export interface TracesAlertSeed {
	name: string;
	/** Span name the rule matches on (`name = '<marker>'`). */
	marker: string;
	channels: string[];
	evalWindow?: string;
	frequency?: string;
}

export interface MetricAlertSeed {
	name: string;
	metricName: string;
	channels: string[];
	/** Attribute the history rows group by. Defaults to `host`. */
	groupByKey?: string;
	evalWindow?: string;
	frequency?: string;
}

export interface LogsSeedOptions {
	marker: string;
	/** Number of distinct `service.name` values ⇒ number of timeline rows. */
	services: number;
	recordsPerService?: number;
	/** Oldest record age in seconds; records spread from here up to `minAgeSeconds`. */
	ageSeconds?: number;
	minAgeSeconds?: number;
	/** Prefix for the generated `service.name` values. */
	servicePrefix?: string;
}

export interface MetricsSeedOptions {
	metricName: string;
	/** Distinct attribute values ⇒ number of timeline rows. */
	hosts: string[];
	pointsPerHost?: number;
	groupByKey?: string;
}

export interface TracesSeedOptions {
	/** Span `name` the rule matches on. */
	marker: string;
	/** Number of distinct `service.name` values ⇒ number of timeline rows. */
	services: number;
	spansPerService?: number;
	/** Oldest span age in seconds; spans spread from here up to `minAgeSeconds`. */
	ageSeconds?: number;
	minAgeSeconds?: number;
	servicePrefix?: string;
}

/** One row of `GET /api/v2/rules/{id}/history/timeline`. */
export interface TimelineItem {
	state: string;
	unixMilli: number;
	fingerprint: string;
	value: number;
	labels: {
		key?: { name?: string };
		value?: string | number | boolean | null;
	}[];
	relatedLogsLink?: string;
	relatedTracesLink?: string;
}

export interface TimelineResponse {
	items: TimelineItem[];
	total: number;
	nextCursor?: string;
}

export interface AlertRulesSeedOptions {
	count: number;
	channelName: string;
	/** Rules are named `<namePrefix>-NN`. Keep it unique per batch. */
	namePrefix?: string;
	/**
	 * Appended to both `team` label values. Every list spec seeds its own batch
	 * and they run in parallel, so a bare `team: payments` would also match the
	 * neighbouring batches — which is exactly what the label-search scenario
	 * counts. Leave it empty only when nothing asserts an exact label count.
	 */
	teamSuffix?: string;
}
