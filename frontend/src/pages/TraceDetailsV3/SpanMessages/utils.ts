import { parseJsonObject } from '../AIThreadMessage/utils';
import {
	MessagePart,
	ThreadMessage,
	ThreadSpan,
} from '../TraceDetailsThread/types';
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toFallbackPart(part: unknown): MessagePart {
	if (typeof part === 'string') {
		return { type: 'text', content: part };
	}
	if (isRecord(part) && part.type === 'text') {
		const text = part.text ?? part.content;
		if (typeof text === 'string') {
			return { type: 'text', content: text };
		}
	}
	return { type: 'generic', content: JSON.stringify(part, null, 2) };
}

function toFallbackMessage(item: unknown): ThreadMessage {
	if (!isRecord(item)) {
		return { content: [toFallbackPart(item)] };
	}
	const body = item.parts ?? item.content;
	return {
		role: typeof item.role === 'string' ? item.role : undefined,
		content: Array.isArray(body)
			? body.map(toFallbackPart)
			: [toFallbackPart(body ?? item)],
	};
}

/** Best-effort messages from a raw `gen_ai.*.messages` value. */
function toFallbackMessages(raw?: RawMessagesValue): ThreadMessage[] {
	if (raw === undefined) {
		return [];
	}
	return Array.isArray(raw)
		? raw.map(toFallbackMessage)
		: [toFallbackMessage(raw)];
}

export function getSpanMessages(span: ThreadSpan): SpanMessagesData {
	const rawInput = toRawValue(span.attributes?.[GEN_AI_KEYS.inputMessages]);
	const rawOutput = toRawValue(span.attributes?.[GEN_AI_KEYS.outputMessages]);

	// TODO: drop the raw-key fallback once the thread API sends formatted_input/output (#13003).
	return {
		formattedInput: span.formatted_input?.length
			? span.formatted_input
			: toFallbackMessages(rawInput),
		formattedOutput: span.formatted_output?.length
			? span.formatted_output
			: toFallbackMessages(rawOutput),
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
