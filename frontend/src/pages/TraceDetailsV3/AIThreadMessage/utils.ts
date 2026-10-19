import { attempt, isError, isObjectLike } from 'lodash-es';

import { MediaMessagePart, MessagePart, ThreadMessage } from './types';

export const MAX_TEXT_LENGTH = 1000;

const MAX_BLOB_PREVIEW_LENGTH = 100;

export const MAX_INLINE_RESULT_LENGTH = 80;

export const TOOL_CALL_ID_ATTR = 'data-tool-call-id';

const ROLE_LABELS: Record<string, string> = {
	system: 'System',
	developer: 'Developer',
	user: 'User',
	assistant: 'Assistant',
	tool: 'Tool',
};

export type MessageTone = 'success' | 'warning' | 'error' | 'info';

// Provider values the backend could not map fall back to info.
const FINISH_REASON_TONES: Record<string, MessageTone> = {
	stop: 'success',
	tool_call: 'success',
	length: 'warning',
	content_filter: 'warning',
	compaction: 'info',
	error: 'error',
};

/** Undefined for missing or unknown roles, which render headerless. */
export function getRoleLabel(role?: string): string | undefined {
	return role ? ROLE_LABELS[role] : undefined;
}

export function getFinishReasonTone(reason?: string | null): MessageTone {
	return (reason && FINISH_REASON_TONES[reason.toLowerCase()]) || 'info';
}

/** Parses objects and arrays only; scalars and invalid JSON return undefined. */
export function parseJsonObject(text: string): object | undefined {
	const parsed: unknown = attempt(JSON.parse, text);
	return isObjectLike(parsed) && !isError(parsed)
		? (parsed as object)
		: undefined;
}

export function toDisplayText(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}
	return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

/** Text and generic parts with only whitespace have nothing to render. */
export function isEmptyPart(part: MessagePart): boolean {
	if (part.type === 'text') {
		return part.content.trim() === '';
	}
	if (part.type === 'generic') {
		return toDisplayText(part.content).trim() === '';
	}
	return false;
}

/** Blob content is inline base64; only a prefix is shown. */
export function truncateBlobContent(part: MediaMessagePart): MediaMessagePart {
	if (
		part.type !== 'blob' ||
		!part.content ||
		part.content.length <= MAX_BLOB_PREVIEW_LENGTH
	) {
		return part;
	}
	return {
		...part,
		content: `${part.content.slice(0, MAX_BLOB_PREVIEW_LENGTH)}…`,
	};
}

// Server and client calls can share an id, so links match on kind too.
export function toToolCallKey(id: string, isServer: boolean): string {
	return `${isServer ? 'server' : 'client'}:${id}`;
}

export function collectToolCallKeys(messages: ThreadMessage[]): string[] {
	return messages.flatMap((message) =>
		message.parts.flatMap((part) =>
			(part.type === 'tool_call' || part.type === 'server_tool_call') && part.id
				? [toToolCallKey(part.id, part.type === 'server_tool_call')]
				: [],
		),
	);
}
