import type { MessageActionDTOQuery } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { normalizeTimeToMs } from 'utils/timeUtils';

export interface ActionTimeRange {
	start: number;
	end: number;
}

function toTimestampMs(value: unknown): number | null {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return null;
	}
	return normalizeTimeToMs(Math.trunc(value));
}

export function getTimeRangeFromActionQuery(
	query: MessageActionDTOQuery | undefined,
): ActionTimeRange | null {
	const start = toTimestampMs(query?.start);
	const end = toTimestampMs(query?.end);
	if (start === null || end === null || end <= start) {
		return null;
	}
	return { start, end };
}
