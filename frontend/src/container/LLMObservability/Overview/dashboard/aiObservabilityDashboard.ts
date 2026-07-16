import { DashboardData, Widgets } from 'types/api/dashboard/getAll';

import dashboardJson from './constant/dashboard.json';

/**
 * Prebuilt AI/LLM observability dashboard (cost, tokens, latency, errors, tool-call
 * RED, TTFT). Sourced from a static JSON blob that mirrors the `DashboardData` payload
 * the backend will serve, so swapping in a live fetch later is a drop-in change. Cast
 * at the boundary because JSON imports are untyped. Rendered read-only on the LLM
 * Observability Overview tab.
 */
export const aiObservabilityDashboard =
	dashboardJson as unknown as DashboardData;

/** The prebuilt widgets, each rendered read-only via `GridCard` (version v5). */
export const aiObservabilityWidgets: Widgets[] =
	(aiObservabilityDashboard.widgets ?? []) as Widgets[];

/** Grid placement (12-col) for each widget, keyed by widget id via `i`. */
export const aiObservabilityLayout = aiObservabilityDashboard.layout ?? [];
