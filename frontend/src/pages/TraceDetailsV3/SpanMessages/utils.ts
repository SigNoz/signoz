import { parseJsonObject } from '../AIThreadMessage/utils';
import { toThreadMessages } from '../TraceDetailsThread/messageUtils';
import { ThreadMessage, ThreadSpan } from '../TraceDetailsThread/types';
import { GEN_AI_KEYS } from '../utils/aiTraceUtils';

/** Parsed JSON, or the original string when it isn't JSON. */
export type RawMessagesValue = object | string;

export interface SpanMessagesData {
	formattedInput: ThreadMessage[];
	formattedOutput: ThreadMessage[];
	rawInput?: RawMessagesValue;
	rawOutput?: RawMessagesValue;
}

function toRawValue(value: unknown): RawMessagesValue | undefined {
	if (value === undefined || value === null || value === '') {
		return undefined;
	}
	if (typeof value === 'string') {
		return parseJsonObject(value) ?? value;
	}
	return typeof value === 'object' ? value : JSON.stringify(value);
}

export function getSpanMessages(span: ThreadSpan): SpanMessagesData {
	const rawInput = toRawValue(span.attributes?.[GEN_AI_KEYS.inputMessages]);
	const rawOutput = toRawValue(span.attributes?.[GEN_AI_KEYS.outputMessages]);

	// Waterfall spans and spans from before the JSON column have no formatted messages.
	return {
		formattedInput: span.formatted_input?.length
			? span.formatted_input
			: toThreadMessages(rawInput),
		formattedOutput: span.formatted_output?.length
			? span.formatted_output
			: toThreadMessages(rawOutput),
		rawInput,
		rawOutput,
	};
}

export function hasFormattedMessages(data: SpanMessagesData): boolean {
	return data.formattedInput.length > 0 || data.formattedOutput.length > 0;
}

export function hasAnyMessages(data: SpanMessagesData): boolean {
	return hasFormattedMessages(data) || !!data.rawInput || !!data.rawOutput;
}
