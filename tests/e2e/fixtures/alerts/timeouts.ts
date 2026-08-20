/**
 * Centralized timeout constants for alert fixtures.
 *
 * **Ruler**: SigNoz's alert evaluation engine. Runs on ~15s cycles, checks each
 * rule's query against ClickHouse, writes results to `rule_state_history_v0`.
 * There's no API to force-evaluate or seed history directly, so fixtures must
 * poll the timeline endpoint until the ruler writes rows.
 *
 * Fixture timeouts are set generously because:
 * 1. CI environments are slower than local dev machines
 * 2. Ruler evaluation depends on Kafka/ClickHouse latency
 * 3. A timeout should mean "something is broken", not "it's just slow today"
 *
 * Typical measured times (local):
 * - API call (create/delete rule/channel): ~1-2s
 * - waitForTimelineEntries (logs, 25 services): ~20-35s
 * - waitForTimelineEntries (metrics, 2 hosts): ~10s
 * - waitForTimelineStates (firing→resolved): ~105s
 * - waitForTimelineEntries (nodata state): ~60-120s
 */

// ─── Fixture-specific wait overrides (ms) ──────────────────────────────

/**
 * Metrics history wait override. Metrics push faster than logs, but ruler still
 * needs 2 evaluation windows to confirm state. 10s typical, 120s defensive.
 */
export const WAIT_METRICS_TIMELINE = 120_000;

/**
 * Nodata state detection. Ruler must evaluate twice with empty result set.
 * Takes longer than firing detection because it's an absence check.
 */
export const WAIT_NODATA_TIMELINE = 180_000;

// ─── Fixture timeouts (ms) ─────────────────────────────────────────────

/**
 * alertList: seeds 12 rules via API.
 *
 * Breakdown: createChannel(2s) + 12×createRule(24s) = ~26s.
 * Timeout: 120s (~5x headroom for CI).
 */
export const FIXTURE_ALERT_LIST = 120_000;

/**
 * alertHistory: seeds 25 logs + 2 rules, waits for ruler evaluation.
 *
 * Breakdown: createChannel(2s) + seedLogs(10s) + 2×createRule(4s) +
 *            2×waitForEntries(70s) + 2×disableRule(4s) = ~90s.
 * Timeout: 240s (~2.5x headroom).
 */
export const FIXTURE_ALERT_HISTORY = 240_000;

/**
 * metricsHistory: seeds 2 hosts, waits for metrics ruler cycle.
 *
 * Breakdown: createChannel(2s) + seedMetrics(5s) + createRule(2s) +
 *            waitForEntries(10s actual, 120s budget) + disableRule(2s) = ~21s.
 * Timeout: 240s (matches alertHistory for consistency).
 */
export const FIXTURE_METRICS_HISTORY = 240_000;

/**
 * tracesHistory: seeds 3 trace services, waits for ruler.
 *
 * Breakdown: similar to alertHistory but fewer services = ~45s.
 * Timeout: 240s (~5x headroom).
 */
export const FIXTURE_TRACES_HISTORY = 240_000;

/**
 * resolvedHistory: waits for firing→resolved transition.
 *
 * Breakdown: setup(30s) + waitForStates(105s) = ~135s.
 * Timeout: 300s (~2x headroom). Longest because resolved requires
 * evalWindow expiry after data stops matching.
 */
export const FIXTURE_RESOLVED_HISTORY = 300_000;

/**
 * noDataHistory: waits for nodata state to appear.
 *
 * Breakdown: createChannel(2s) + createRule(2s) + waitForEntries(60-120s).
 * Timeout: 300s. Nodata detection is slowest because ruler must confirm
 * absence across multiple evaluation cycles.
 */
export const FIXTURE_NODATA_HISTORY = 300_000;

/**
 * emptyHistory: creates rule then immediately disables it (no ruler wait).
 *
 * Breakdown: createChannel(2s) + createRule(2s) + disableRule(2s) = ~6s.
 * Timeout: 120s (generous for slow CI, no ruler dependency).
 */
export const FIXTURE_EMPTY_HISTORY = 120_000;
