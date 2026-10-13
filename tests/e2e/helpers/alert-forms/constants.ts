// ─── Routes ────────────────────────────────────────────────────────────────

export const ALERTS_NEW_PATH = '/alerts/new';

/**
 * The standalone edit route. Distinct from `/alerts/overview`, which renders the
 * *same* editor inside the details shell. The two are not interchangeable for v2
 * rules — see `edit/v2.spec.ts` EV2-12.
 */
export const ALERT_EDIT_PATH = '/alerts/edit';

// ─── Enums mirrored from the frontend ──────────────────────────────────────

/**
 * URL values of `AlertTypes` (`frontend/src/types/api/alerts/alertTypes.ts`).
 * Note `METRICS` maps to the *singular* `METRIC_BASED_ALERT` — the enum key and
 * its value disagree in the source, and the URL carries the value.
 */
export const AlertType = {
	METRICS: 'METRIC_BASED_ALERT',
	LOGS: 'LOGS_BASED_ALERT',
	TRACES: 'TRACES_BASED_ALERT',
	EXCEPTIONS: 'EXCEPTIONS_BASED_ALERT',
	ANOMALY: 'ANOMALY_BASED_ALERT',
} as const;

export type AlertTypeValue = (typeof AlertType)[keyof typeof AlertType];

/** `AlertDetectionTypes` (`frontend/src/container/FormAlertRules/index.tsx:78-81`). */
export const RuleType = {
	THRESHOLD: 'threshold_rule',
	ANOMALY: 'anomaly_rule',
} as const;

/**
 * `AlertThresholdOperator` (`CreateAlertV2/context/types.ts:97-105`) and its
 * dropdown labels (`context/constants.ts:123-137`).
 *
 * Threshold-alert operators only. Anomaly alerts render a different, shorter
 * list (`ANOMALY_THRESHOLD_OPERATOR_OPTIONS`) with relabelled entries.
 */
export const ThresholdOperator = {
	ABOVE: { value: 'above', label: 'ABOVE' },
	BELOW: { value: 'below', label: 'BELOW' },
	EQUAL_TO: { value: 'equal', label: 'EQUAL TO' },
	NOT_EQUAL_TO: { value: 'not_equal', label: 'NOT EQUAL TO' },
	ABOVE_OR_EQUAL_TO: { value: 'above_or_equal', label: 'ABOVE OR EQUAL TO' },
	BELOW_OR_EQUAL_TO: { value: 'below_or_equal', label: 'BELOW OR EQUAL TO' },
} as const;

/**
 * `AlertThresholdMatchType` (`CreateAlertV2/context/types.ts:105-111`) and its
 * dropdown labels (`context/constants.ts:136-142`).
 *
 * Watch the plural: the enum *key* is `ALL_THE_TIME` but the wire value is
 * `all_the_times`, and the API rejects the singular outright — the same
 * key/value mismatch as `METRICS_BASED_ALERT` → `METRIC_BASED_ALERT`.
 */
export const ThresholdMatchType = {
	AT_LEAST_ONCE: { value: 'at_least_once', label: 'AT LEAST ONCE' },
	ALL_THE_TIME: { value: 'all_the_times', label: 'ALL THE TIME' },
	ON_AVERAGE: { value: 'on_average', label: 'ON AVERAGE' },
	IN_TOTAL: { value: 'in_total', label: 'IN TOTAL' },
	LAST: { value: 'last', label: 'LAST' },
} as const;

/**
 * `AlertListTabs` (`frontend/src/pages/AlertList/types.ts:7-9`). The values are
 * space-less — the tab *labels* read "Triggered Alerts" but the `tab` URL param
 * is `TriggeredAlerts`, and asserting the label form silently fails.
 */
export const AlertListTab = {
	TRIGGERED_ALERTS: 'TriggeredAlerts',
	ALERT_RULES: 'AlertRules',
	CONFIGURATION: 'Configuration',
} as const;

/**
 * The four cards a stock stack shows, in render order
 * (`CreateAlertRule/SelectAlertType/config.ts:10-31`). Anomaly is `unshift`ed to
 * the **front** of this list when the `ANOMALY_DETECTION` feature flag is active,
 * so both the count and the order change when it is enabled.
 */
export const STOCK_ALERT_TYPE_CARDS: AlertTypeValue[] = [
	AlertType.METRICS,
	AlertType.LOGS,
	AlertType.TRACES,
	AlertType.EXCEPTIONS,
];

/**
 * Rolling-window presets (`EvaluationSettings/constants.ts:9-18`) paired with the
 * button label each one produces. A value *outside* this set collapses to `custom`
 * on load (`utils.tsx:86-96`), which is what makes it a prefill assertion worth
 * having: `10m0s` proves the seed was read, `7m0s` proves the fallback fired.
 */
export const EVALUATION_WINDOW_PRESETS = {
	'5m0s': 'Last 5 minutes',
	'10m0s': 'Last 10 minutes',
	'15m0s': 'Last 15 minutes',
	'30m0s': 'Last 30 minutes',
	'1h0m0s': 'Last 1 hour',
	'2h0m0s': 'Last 2 hours',
	'4h0m0s': 'Last 4 hours',
} as const;
