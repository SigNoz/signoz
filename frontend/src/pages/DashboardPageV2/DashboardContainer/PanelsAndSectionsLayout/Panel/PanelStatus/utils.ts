import type { Warning } from 'types/api';
import type APIError from 'types/api/error';

import type { PanelStatusDetail } from './types';

const FALLBACK_CODE = '500';
const FALLBACK_MESSAGE = 'Something went wrong';

/**
 * Narrows a thrown `Error` to our `APIError` (which carries the structured
 * `error.error` envelope). react-query types failures as `Error`, so a runtime
 * guard is the typed way to recover the richer shape.
 */
function isAPIError(error: Error): error is APIError {
	return (
		'error' in error &&
		typeof (error as APIError).error === 'object' &&
		(error as APIError).error !== null
	);
}

/**
 * Adapts a query failure into the normalized status shape. Structured
 * `APIError`s yield their backend code/message/docs/sub-messages; any other
 * `Error` falls back to a generic 500 with its message.
 */
export function panelStatusFromError(
	error: Error | null,
): PanelStatusDetail | null {
	if (!error) {
		return null;
	}

	if (isAPIError(error)) {
		const detail = error.error.error;
		return {
			code: detail?.code || FALLBACK_CODE,
			message: detail?.message || FALLBACK_MESSAGE,
			docsUrl: detail?.url || undefined,
			messages: (detail?.errors ?? []).map((e) => e.message),
		};
	}

	return {
		code: FALLBACK_CODE,
		message: error.message || FALLBACK_MESSAGE,
		messages: [],
	};
}

/** Adapts a query warning into the normalized status shape. */
export function panelStatusFromWarning(
	warning: Warning | undefined,
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
