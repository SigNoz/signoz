import { isAxiosError } from 'axios';
import {
	ErrorCodeDTO,
	type ErrorBodyDTO,
	type ErrorResponseDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

export interface AssistantErrorResolution {
	message: string;
	isRateLimit: boolean;
}

function isErrorCodeDTO(code: string | undefined): code is ErrorCodeDTO {
	return (
		code !== undefined && (Object.values(ErrorCodeDTO) as string[]).includes(code)
	);
}

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

function isRateLimitError(code: string | undefined, err: unknown): boolean {
	if (isAxiosError(err) && err.response?.status === 429) {
		return true;
	}

	return isErrorCodeDTO(code) && RATE_LIMIT_ERROR_CODES.has(code);
}

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

/**
 * Uses `error.message` when `error.code` is a known `ErrorCodeDTO`;
 * otherwise returns `fallback`.
 */
export function resolveAssistantErrorMessage(
	err: unknown,
	fallback: string,
): AssistantErrorResolution {
	const body = getErrorBody(err);
	const isRateLimit = isRateLimitError(body?.code, err);

	if (body && isErrorCodeDTO(body.code) && body.message.trim()) {
		return {
			message: body.message.trim(),
			isRateLimit,
		};
	}

	return { message: fallback, isRateLimit: Boolean(isRateLimit) };
}
