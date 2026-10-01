import { isAxiosError } from 'axios';
import {
	ErrorCodeDTO,
	RetryActionDTO,
	type ErrorBodyDTO,
	type ErrorResponseDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

export interface AssistantErrorResolution {
	/** User-facing copy: code-specific FE copy → backend message → caller fallback. */
	message: string;
	/** Known backend error code, when one we recognise was supplied. */
	code?: ErrorCodeDTO;
	/**
	 * Whether/how the failed action may be retried:
	 *   • `auto`   — transient; the caller may silently re-attempt (capped).
	 *   • `manual` — surface a Retry affordance to the user.
	 *   • `none`   — retrying would re-fail deterministically; offer nothing.
	 */
	retryAction: RetryActionDTO;
	/** Quota/limit error — callers hide the retry + feedback bar (retrying just re-limits). */
	isRateLimit: boolean;
}

/** Quota/limit codes — surfaced as rate-limit errors (no retry, feedback bar hidden). */
const RATE_LIMIT_ERROR_CODES = new Set<ErrorCodeDTO>([
	ErrorCodeDTO.rate_limit_override_exceeds_ceiling,
	ErrorCodeDTO.thread_message_limit,
	ErrorCodeDTO.connection_limit_exceeded,
	ErrorCodeDTO.hourly_message_limit,
	ErrorCodeDTO.daily_message_limit,
	ErrorCodeDTO.daily_token_limit,
	ErrorCodeDTO.daily_cost_limit,
	ErrorCodeDTO.budget_exceeded,
]);

/**
 * Codes whose retry would re-fail deterministically — permission/config/validation
 * failures. These force `retryAction: none` regardless of HTTP status.
 */
const NON_RETRYABLE_CODES = new Set<ErrorCodeDTO>([
	ErrorCodeDTO.permission_denied,
	ErrorCodeDTO.user_disabled,
	ErrorCodeDTO.org_disabled,
	ErrorCodeDTO.validation_error,
	ErrorCodeDTO.invalid_content_length,
	ErrorCodeDTO.invalid_fork_target,
	ErrorCodeDTO.missing_signoz_url,
	ErrorCodeDTO.invalid_signoz_url,
	ErrorCodeDTO.region_not_configured,
]);

/**
 * Code-specific, user-friendly copy. Takes precedence over the backend's raw
 * `error.message` so the user sees an actionable, consistent sentence rather
 * than internal phrasing. Codes absent here fall through to the backend message.
 */
const ERROR_CODE_COPY: Partial<Record<ErrorCodeDTO, string>> = {
	[ErrorCodeDTO.permission_denied]:
		"You don't have permission to do that. Contact your workspace admin if you think this is a mistake.",
	[ErrorCodeDTO.user_disabled]:
		'Your access to the AI assistant has been disabled. Contact your workspace admin to re-enable it.',
	[ErrorCodeDTO.org_disabled]:
		'The AI assistant is disabled for your organisation. An admin can enable it in settings.',
	[ErrorCodeDTO.thread_busy]:
		'This conversation is still finishing a previous response. Give it a moment and try again.',
	[ErrorCodeDTO.thread_has_active_execution]:
		'This conversation is still finishing a previous response. Give it a moment and try again.',
	[ErrorCodeDTO.hourly_message_limit]:
		"You've reached the hourly message limit. Please try again later.",
	[ErrorCodeDTO.daily_message_limit]:
		"You've reached the daily message limit. Please try again tomorrow.",
	[ErrorCodeDTO.daily_token_limit]:
		"You've reached today's usage limit. Please try again tomorrow.",
	[ErrorCodeDTO.daily_cost_limit]:
		"You've reached today's usage limit. Please try again tomorrow.",
	[ErrorCodeDTO.budget_exceeded]:
		"You've reached your usage budget. Contact your workspace admin to raise it.",
	[ErrorCodeDTO.thread_message_limit]:
		'This conversation has reached its length limit. Start a new conversation to continue.',
	[ErrorCodeDTO.connection_limit_exceeded]:
		'Too many active conversations right now. Close one and try again.',
	[ErrorCodeDTO.max_turns_exceeded]:
		'The assistant reached the maximum number of steps for this request. Try rephrasing or breaking it into smaller asks.',
	[ErrorCodeDTO.region_unreachable]:
		"Couldn't reach your region's services. Please try again in a moment.",
	[ErrorCodeDTO.region_not_configured]:
		'No region is configured for the AI assistant yet. An admin can set this up in settings.',
	[ErrorCodeDTO.mcp_unavailable]:
		'A required service is temporarily unavailable. Please try again shortly.',
	[ErrorCodeDTO.sandbox_unavailable]:
		'The execution environment is temporarily unavailable. Please try again shortly.',
	[ErrorCodeDTO.internal_error]:
		'Something went wrong on our end. Please try again.',
};

function isErrorCodeDTO(code: string | undefined): code is ErrorCodeDTO {
	return (
		code !== undefined && (Object.values(ErrorCodeDTO) as string[]).includes(code)
	);
}

function isRetryActionDTO(value: unknown): value is RetryActionDTO {
	return (
		typeof value === 'string' &&
		(Object.values(RetryActionDTO) as string[]).includes(value)
	);
}

/**
 * Pulls the structured error body out of either an Axios REST error or the
 * SSE error the streaming loop throws (a plain `Error` augmented with `code`).
 */
function getErrorBody(err: unknown): ErrorBodyDTO | null {
	if (isAxiosError(err)) {
		return (err.response?.data as ErrorResponseDTO | undefined)?.error ?? null;
	}

	const code = (err as { code?: string } | undefined)?.code;
	const message = err instanceof Error ? err.message : undefined;
	if (!code || !message) {
		return null;
	}

	return { code: code as ErrorCodeDTO, message };
}

function isRateLimit(code: ErrorCodeDTO | undefined, err: unknown): boolean {
	if (isAxiosError(err) && err.response?.status === 429) {
		return true;
	}
	return code !== undefined && RATE_LIMIT_ERROR_CODES.has(code);
}

/**
 * Resolves how the failed action may be retried. The backend's explicit signal
 * (SSE `ErrorEventDTO.retryAction`) is authoritative; otherwise we derive it
 * from the rate-limit/non-retryable code sets and the HTTP status.
 */
function resolveRetryAction(
	err: unknown,
	code: ErrorCodeDTO | undefined,
	rateLimited: boolean,
): RetryActionDTO {
	const explicit = (err as { retryAction?: unknown } | undefined)?.retryAction;
	if (isRetryActionDTO(explicit)) {
		return explicit;
	}

	if (rateLimited || (code !== undefined && NON_RETRYABLE_CODES.has(code))) {
		return RetryActionDTO.none;
	}

	if (isAxiosError(err)) {
		const status = err.response?.status;
		// No response → network/timeout failure; retrying may well succeed.
		if (status === undefined || status === 408) {
			return RetryActionDTO.manual;
		}
		if (status === 401 || status === 403) {
			return RetryActionDTO.none;
		}
		if (status === 409 || status >= 500) {
			return RetryActionDTO.manual;
		}
		// Other 4xx (validation, bad request) re-fail deterministically.
		return RetryActionDTO.none;
	}

	// Non-Axios transport/parse error with no code — let the user retry.
	return RetryActionDTO.manual;
}

function resolveMessage(
	code: ErrorCodeDTO | undefined,
	body: ErrorBodyDTO | null,
	fallback: string,
): string {
	if (code !== undefined && ERROR_CODE_COPY[code]) {
		return ERROR_CODE_COPY[code] as string;
	}
	// Trust the backend's message only for codes we recognise — never surface
	// raw text for unknown codes (could be an internal stack trace).
	if (code !== undefined && body?.message.trim()) {
		return body.message.trim();
	}
	return fallback;
}

/**
 * Single resolution point for both SSE and REST assistant errors. Maps the
 * error onto user-facing copy plus retry semantics, degrading gracefully for
 * unknown codes (falls back to `fallback` + a `manual` retry where sensible).
 */
export function resolveAssistantError(
	err: unknown,
	fallback: string,
): AssistantErrorResolution {
	const body = getErrorBody(err);
	const code = isErrorCodeDTO(body?.code) ? body?.code : undefined;
	const rateLimited = isRateLimit(code, err);

	return {
		message: resolveMessage(code, body, fallback),
		code,
		retryAction: resolveRetryAction(err, code, rateLimited),
		isRateLimit: rateLimited,
	};
}
