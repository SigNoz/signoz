import { MessagePart, MessagePartType, ThreadMessage } from './types';
import { toDisplayText } from './utils';

const PART_TYPES = new Set<string>([
	'text',
	'reasoning',
	'compaction',
	'tool_call',
	'tool_call_response',
	'server_tool_call',
	'server_tool_call_response',
	'blob',
	'file',
	'uri',
	'generic',
] satisfies MessagePartType[]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

function toPart(part: unknown): MessagePart {
	if (typeof part === 'string') {
		return { type: 'text', content: part };
	}
	if (
		!isRecord(part) ||
		typeof part.type !== 'string' ||
		!PART_TYPES.has(part.type)
	) {
		return { type: 'generic', content: part };
	}
	switch (part.type) {
		case 'text': {
			// Some SDKs write "text" in place of the schema's "content".
			const text = part.content ?? part.text;
			return {
				type: 'text',
				content: typeof text === 'string' ? text : toDisplayText(text),
			};
		}
		case 'reasoning':
			return {
				type: 'reasoning',
				content: optionalString(part.content ?? part.text),
			};
		case 'generic':
			return { type: 'generic', content: part.content ?? part };
		default:
			return part as MessagePart;
	}
}

function toThreadMessage(item: unknown): ThreadMessage {
	if (!isRecord(item)) {
		return { parts: [toPart(item)] };
	}
	const body = item.parts ?? item.content;
	return {
		role: optionalString(item.role),
		name: optionalString(item.name),
		finish_reason: optionalString(item.finish_reason),
		parts: Array.isArray(body) ? body.map(toPart) : [toPart(body ?? item)],
	};
}

/** Normalises formatted or raw `gen_ai.*.messages` values into thread messages. */
export function toThreadMessages(value: unknown): ThreadMessage[] {
	if (value === undefined || value === null) {
		return [];
	}
	return (Array.isArray(value) ? value : [value]).map(toThreadMessage);
}
