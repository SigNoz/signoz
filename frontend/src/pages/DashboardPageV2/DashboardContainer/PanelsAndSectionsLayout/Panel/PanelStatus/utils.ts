import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';
import type { Warning } from 'types/api';

import type { PanelStatusDetail } from './types';

/**
 * Adapts a query failure into the normalized status shape.
 *
 * The generated `queryRangeV5` client's reject interceptor passes the raw
 * `AxiosError` through untouched — it is NOT pre-converted to `APIError` — so
 * the error arriving here is an axios error. `convertToApiError` is the
 * app-standard normalizer for generated-API axios errors: it pulls the backend
 * `code / message / url / errors` envelope off the response and supplies
 * sensible fallbacks for anything missing, so there's always a structured
 * detail to surface.
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
	warning: Warning | null | undefined,
): PanelStatusDetail | null {
	if (!warning) {
		return null;
	}

	return {
		code: warning.code,
		message: warning.message,
		docsUrl: warning.url || undefined,
		messages: (warning.warnings ?? []).map((w) => w.message),
	};
}
