import * as Sentry from '@sentry/react';
import { ErrorCodeDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

import { resolveAssistantError } from './resolveAssistantError';

// Account and thread states the UI already explains. Quota limits are skipped
// too; aborts, 401/403 and network drops are dropped by the global Sentry filter.
const EXPECTED_ERROR_CODES = new Set<ErrorCodeDTO>([
	ErrorCodeDTO.permission_denied,
	ErrorCodeDTO.user_disabled,
	ErrorCodeDTO.org_disabled,
	ErrorCodeDTO.thread_busy,
	ErrorCodeDTO.thread_has_active_execution,
]);

function isExpectedAssistantError(err: unknown): boolean {
	const { code, isRateLimit } = resolveAssistantError(err, '');
	return isRateLimit || (code !== undefined && EXPECTED_ERROR_CODES.has(code));
}

export function reportAssistantError(operation: string, err: unknown): void {
	// eslint-disable-next-line no-console
	console.error(`[AIAssistant] ${operation} failed:`, err);
	if (isExpectedAssistantError(err)) {
		return;
	}
	Sentry.captureException(err, { tags: { feature: 'noz', operation } });
}
