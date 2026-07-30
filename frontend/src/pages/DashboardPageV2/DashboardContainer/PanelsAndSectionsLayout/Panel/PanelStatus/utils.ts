import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type {
	DashboardtypesPanelDTO,
	Querybuildertypesv5QueryWarnDataDTO as WarningDTO,
	RenderErrorResponseDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';
import { countEnabledQueries } from 'pages/DashboardPageV2/DashboardContainer/Panels/utils/countEnabledQueries';

import type { PanelStatusDetail } from './types';

/**
 * Adapts a query failure into the normalized status shape.
 *
 * The generated `queryRangeV5` client's reject interceptor passes the raw
 * `AxiosError` through untouched (NOT pre-converted to `APIError`), so
 * `convertToApiError` is needed here to pull the backend `code/message/url/
 * errors` envelope off the response (with fallbacks) into a structured detail.
 */
export function panelStatusFromError(
	error: Error | null | undefined,
): PanelStatusDetail | null {
	if (!error) {
		return null;
	}

	const apiError = convertToApiError(
		error as AxiosError<RenderErrorResponseDTO>,
	);
	if (!apiError) {
		return null;
	}

	const { error: detail } = apiError.getErrorDetails();
	return {
		code: detail.code,
		message: detail.message,
		docsUrl: detail.url || undefined,
		messages: (detail.errors ?? []).map((e) => e.message),
	};
}

/** Adapts a query warning into the normalized status shape. */
export function panelStatusFromWarning(
	warning: WarningDTO | undefined,
): PanelStatusDetail | null {
	if (!warning) {
		return null;
	}

	return {
		message: warning.message || 'Warning',
		docsUrl: warning.url || undefined,
		messages: (warning.warnings ?? [])
			.map((w) => w.message)
			.filter((message): message is string => Boolean(message)),
	};
}

/**
 * A Number panel renders only the first query's value, so more than one enabled
 * query silently hides the rest. Warns for that case; null otherwise.
 */
export function panelStatusFromMultipleEnabledQueries(
	panel: DashboardtypesPanelDTO,
): PanelStatusDetail | null {
	if (panel.spec.plugin.kind !== 'signoz/NumberPanel') {
		return null;
	}
	if (countEnabledQueries(panel.spec.queries) <= 1) {
		return null;
	}
	return {
		message:
			'This panel shows a single value, but more than one query is enabled.',
		messages: [
			"Disable the queries you don't want to display, keeping only the one whose value you want to show.",
		],
	};
}
