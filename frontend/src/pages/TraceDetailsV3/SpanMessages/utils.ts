import { parseJsonObject } from '../AIThreadMessage/utils';
import { ThreadMessage, ThreadSpan } from '../TraceDetailsThread/types';
import { GEN_AI_KEYS } from '../utils/genAi';

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
	return {
		formattedInput: span.formatted_input ?? [],
		formattedOutput: span.formatted_output ?? [],
		rawInput: toRawValue(span.attributes?.[GEN_AI_KEYS.inputMessages]),
		rawOutput: toRawValue(span.attributes?.[GEN_AI_KEYS.outputMessages]),
	};
}

export function hasFormattedMessages(data: SpanMessagesData): boolean {
	return data.formattedInput.length > 0 || data.formattedOutput.length > 0;
}

export function hasAnyMessages(data: SpanMessagesData): boolean {
	return hasFormattedMessages(data) || !!data.rawInput || !!data.rawOutput;
}
