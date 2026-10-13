import { MediaMessagePart, ThreadMessage } from './types';

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

export type MessageTone = 'success' | 'warning' | 'error';

const FINISH_REASON_TONES: Record<string, MessageTone> = {
	length: 'warning',
	content_filter: 'warning',
	error: 'error',
};

/** Undefined for missing or unknown roles, which render headerless. */
export function getRoleLabel(role?: string): string | undefined {
	return role ? ROLE_LABELS[role] : undefined;
}

export function getFinishReasonTone(reason?: string | null): MessageTone {
	return (reason && FINISH_REASON_TONES[reason.toLowerCase()]) || 'success';
}

/** Parses objects and arrays only; scalars and invalid JSON return undefined. */
export function parseJsonObject(text: string): object | undefined {
	const trimmed = text.trim();
	if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
		return undefined;
	}
	try {
		const parsed: unknown = JSON.parse(trimmed);
		return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
	} catch {
		return undefined;
	}
}

export function toDisplayText(value: unknown): string {
	if (value === undefined || value === null) {
		return '';
	}
	return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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

export function collectToolCallIds(messages: ThreadMessage[]): string[] {
	return messages.flatMap((message) =>
		message.parts.flatMap((part) =>
			(part.type === 'tool_call' || part.type === 'server_tool_call') && part.id
				? [part.id]
				: [],
		),
	);
}
