import type { MessageContext } from 'api/ai-assistant/chat';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { matchPath } from 'react-router-dom';

/**
 * Resolves the page the user is currently on into structured `MessageContext`
 * entries with `source: 'auto'`. The agent uses these as implicit context
 * (e.g. "the user is currently looking at dashboard X with this time range
 * and this query").
 *
 * **URL-only.** All inputs come from `pathname` + `search`; we never reach
 * into Redux / context. SigNoz already encodes most page state into the URL
 * (`compositeQuery`, `startTime`/`endTime`, `viewName`/`viewKey`,
 * `variables`, `expandedWidgetId`, `activeLogId`, …), so URL parsing is
 * sufficient. Anything not in the URL is simply omitted from `metadata` —
 * the server applies its own defaults.
 *
 * Returns `[]` when no mapping exists, so callers can spread the result
 * unconditionally before user-picked contexts.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export function getAutoContexts(
	pathname: string,
	search: string,
): MessageContext[] {
	const params = new URLSearchParams(search);
	const sharedMetadata = collectSharedMetadata(params);

	// ── Dashboards ────────────────────────────────────────────────────────────

	// Widget edit (panel_edit) — `/dashboard/:dashboardId/:widgetId`.
	const widgetMatch = matchPath<{ dashboardId: string; widgetId: string }>(
		pathname,
		{ path: ROUTES.DASHBOARD_WIDGET, exact: true },
	);
	if (widgetMatch) {
		return [
			{
				source: 'auto',
				type: 'dashboard',
				resourceId: widgetMatch.params.dashboardId,
				metadata: {
					page: 'panel_edit',
					widgetId: widgetMatch.params.widgetId,
					...sharedMetadata,
				},
			},
		];
	}

	// Dashboard detail — `/dashboard/:dashboardId`. The `expandedWidgetId`
	// query param signals the panel-fullscreen overlay; otherwise it's the
	// plain dashboard view.
	const dashboardMatch = matchPath<{ dashboardId: string }>(pathname, {
		path: ROUTES.DASHBOARD,
		exact: true,
	});
	if (dashboardMatch) {
		const expandedWidgetId = params.get(QueryParams.expandedWidgetId);
		if (expandedWidgetId) {
			return [
				{
					source: 'auto',
					type: 'dashboard',
					resourceId: dashboardMatch.params.dashboardId,
					metadata: {
						page: 'panel_fullscreen',
						widgetId: expandedWidgetId,
						...sharedMetadata,
					},
				},
			];
		}
		return [
			{
				source: 'auto',
				type: 'dashboard',
				resourceId: dashboardMatch.params.dashboardId,
				metadata: {
					page: 'dashboard_detail',
					...sharedMetadata,
				},
			},
		];
	}

	// Dashboard list — `/dashboard`.
	if (matchPath(pathname, { path: ROUTES.ALL_DASHBOARD, exact: true })) {
		return [
			{
				source: 'auto',
				type: 'dashboard',
				resourceId: null,
				metadata: { page: 'dashboard_list' },
			},
		];
	}

	// ── Alerts ────────────────────────────────────────────────────────────────

	// Alert edit — `/alerts/edit?ruleId=…`.
	if (matchPath(pathname, { path: ROUTES.EDIT_ALERTS, exact: true })) {
		const ruleId = params.get(QueryParams.ruleId);
		if (ruleId) {
			return [
				{
					source: 'auto',
					type: 'alert',
					resourceId: ruleId,
					metadata: { page: 'alert_edit' },
				},
			];
		}
	}

	if (matchPath(pathname, { path: ROUTES.ALERTS_NEW, exact: true })) {
		return [
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: { page: 'alert_new' },
			},
		];
	}

	if (matchPath(pathname, { path: ROUTES.ALERT_HISTORY, exact: true })) {
		return [
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: {
					page: 'alerts_triggered',
					...sharedMetadata,
				},
			},
		];
	}

	if (matchPath(pathname, { path: ROUTES.LIST_ALL_ALERT, exact: true })) {
		return [
			{
				source: 'auto',
				type: 'alert',
				resourceId: null,
				metadata: { page: 'alert_list' },
			},
		];
	}

	// ── Services ──────────────────────────────────────────────────────────────

	// Service detail (covers sub-routes like top-level-operations) —
	// `/services/:servicename[/...]`.
	const serviceMatch = matchPath<{ servicename: string }>(pathname, {
		path: ROUTES.SERVICE_METRICS,
		exact: false,
	});
	if (serviceMatch?.params.servicename) {
		return [
			{
				source: 'auto',
				type: 'service',
				resourceId: serviceMatch.params.servicename,
				metadata: {
					page: 'service_detail',
					...sharedMetadata,
				},
			},
		];
	}

	// Services list — `/services`.
	if (matchPath(pathname, { path: ROUTES.APPLICATION, exact: true })) {
		return [
			{
				source: 'auto',
				type: 'service',
				resourceId: null,
				metadata: {
					page: 'services_list',
					...sharedMetadata,
				},
			},
		];
	}

	// ── Logs ──────────────────────────────────────────────────────────────────

	if (matchPath(pathname, { path: ROUTES.LOGS_EXPLORER, exact: false })) {
		const activeLogId = params.get(QueryParams.activeLogId);
		// `?activeLogId=…` indicates a log-detail panel is open. Per the
		// schema, log_detail requires payload fields (timestamp, service,
		// body) we can't recover from the URL alone, so we still emit the
		// surrounding logs_explorer page context — the panel registry can
		// layer richer log_detail context on top in a follow-up.
		return [
			{
				source: 'auto',
				type: 'logs_explorer',
				resourceId: null,
				metadata: {
					page: 'logs_explorer',
					...sharedMetadata,
					...(activeLogId ? { activeLogId } : {}),
				},
			},
		];
	}

	// ── Traces ────────────────────────────────────────────────────────────────

	// Trace detail — `/trace/:id`. Treated as a detail-as-metadata page
	// (resourceId null, `traceId` lives in metadata).
	const traceMatch = matchPath<{ id: string }>(pathname, {
		path: ROUTES.TRACE_DETAIL,
		exact: true,
	});
	if (traceMatch?.params.id) {
		const spanId = params.get(QueryParams.selectedTimelineQuery);
		return [
			{
				source: 'auto',
				type: 'traces_explorer',
				resourceId: null,
				metadata: {
					page: 'trace_detail',
					traceId: traceMatch.params.id,
					...(spanId ? { spanId } : {}),
					...sharedMetadata,
				},
			},
		];
	}

	if (matchPath(pathname, { path: ROUTES.TRACES_EXPLORER, exact: false })) {
		return [
			{
				source: 'auto',
				type: 'traces_explorer',
				resourceId: null,
				metadata: {
					page: 'traces_explorer',
					...sharedMetadata,
				},
			},
		];
	}

	// ── Metrics ───────────────────────────────────────────────────────────────

	if (
		matchPath(pathname, { path: ROUTES.METRICS_EXPLORER_EXPLORER, exact: false })
	) {
		return [
			{
				source: 'auto',
				type: 'metrics_explorer',
				resourceId: null,
				metadata: {
					page: 'metrics_explorer',
					...sharedMetadata,
				},
			},
		];
	}

	return [];
}

/**
 * Pulls metadata fields that any page may carry in its query string —
 * `timeRange`, `query`, saved-view selectors, dashboard variables. Each
 * piece is omitted when the URL doesn't carry it (rather than being filled
 * in with a stale default).
 */
function collectSharedMetadata(
	params: URLSearchParams,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};

	// Time range — emit only when both bounds are explicit. SigNoz writes
	// `startTime` / `endTime` in milliseconds when the user picks a custom
	// range; relative ranges (`relativeTime=15m`) are left out because the
	// server applies its own freshly-anchored window.
	const startTime = numericParam(params, QueryParams.startTime);
	const endTime = numericParam(params, QueryParams.endTime);
	if (startTime !== null && endTime !== null) {
		out.timeRange = { start: startTime, end: endTime };
	}

	// Query Builder state — URL-encoded JSON written by `QueryBuilderProvider`.
	const compositeQueryRaw = params.get(QueryParams.compositeQuery);
	if (compositeQueryRaw) {
		try {
			out.query = JSON.parse(decodeURIComponent(compositeQueryRaw));
		} catch {
			// Malformed JSON in the URL — drop silently rather than throw
			// inside a context-collection helper.
		}
	}

	// Saved view selectors (logs / traces explorer) and dashboard variables.
	const viewKey = params.get(QueryParams.viewKey);
	if (viewKey) {
		out.savedViewId = viewKey;
	}
	const viewName = params.get(QueryParams.viewName);
	if (viewName) {
		out.savedViewName = viewName;
	}
	const variablesRaw = params.get(QueryParams.variables);
	if (variablesRaw) {
		try {
			out.variables = JSON.parse(decodeURIComponent(variablesRaw));
		} catch {
			// Same fallback as compositeQuery — keep silent on malformed JSON.
		}
	}

	return out;
}

function numericParam(params: URLSearchParams, key: string): number | null {
	const raw = params.get(key);
	if (raw === null) {
		return null;
	}
	const value = Number(raw);
	return Number.isFinite(value) ? value : null;
}
