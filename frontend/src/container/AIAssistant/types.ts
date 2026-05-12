/**
 * UI types for the AI Assistant.
 *
 * Wherever the OpenAPI-generated DTOs in
 * `src/api/ai-assistant/sigNozAIAssistantAPI.schemas.ts`
 * already capture the right shape, this module re-exports them.
 *
 * A type is defined locally only when the UI needs a different shape than
 * the API — typically because:
 *   • the DTO is too loose to render against (e.g. `blocks` is `unknown[]`)
 *   • the UI uses numeric millisecond timestamps instead of ISO strings
 *   • the UI mints a synthetic `id` before the server has assigned a `threadId`
 *   • client-only state (attachments, streaming aggregations) has no API form
 */
import type {
	ApprovalEventDTO,
	ClarificationEventDTO,
	FeedbackRatingDTO,
	MessageActionDTO,
	MessageActionKindDTO,
} from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';

/** Client-only file attachment — no API equivalent (uploads happen via data URLs). */
export interface MessageAttachment {
	name: string;
	type: string;
	/** data URI for images, or a download URL for other files */
	dataUrl: string;
}

/** Narrowed from DTO `MessageSummaryDTO.role: string`. The UI only cares about user/assistant. */
export type MessageRole = 'user' | 'assistant';

/** String-literal view of `MessageActionKindDTO` for ergonomic comparisons in switch statements. */
export type ActionKind = `${MessageActionKindDTO}`;

/** String-literal view of `FeedbackRatingDTO` so call-sites can pass `'positive'`/`'negative'` directly. */
export type FeedbackRating = `${FeedbackRatingDTO}`;

// ---------------------------------------------------------------------------
// Message blocks — the DTO models blocks as `unknown[]`. The UI needs a
// typed discriminated union to render each block kind.
// ---------------------------------------------------------------------------

export interface TextBlock {
	type: 'text';
	content: string;
}

export interface ThinkingBlock {
	type: 'thinking';
	content: string;
}

export interface ToolCallBlock {
	type: 'tool_call';
	toolCallId: string;
	toolName: string;
	toolInput: unknown;
	result?: unknown;
	success?: boolean;
	/**
	 * Optional human-friendly title from the `ToolCallEventDTO`. When present
	 * the UI prefers it over a derived label built from `toolName`.
	 */
	displayText?: string | null;
}

export type MessageBlock = TextBlock | ThinkingBlock | ToolCallBlock;

/**
 * UI shape for an assistant or user message. Differs from `MessageSummaryDTO`:
 *   • `id` instead of `messageId`
 *   • `createdAt` is a millisecond epoch instead of ISO string
 *   • `blocks` is the typed discriminated union above
 *   • streaming-only fields are excluded (those live in `ConversationStreamState`)
 */
export interface Message {
	id: string;
	role: MessageRole;
	content: string;
	attachments?: MessageAttachment[];
	/** Ordered content blocks for structured rendering of assistant replies. */
	blocks?: MessageBlock[];
	/** Suggested follow-up actions returned by the assistant (final message only). */
	actions?: MessageActionDTO[];
	/** Persisted feedback rating — set after user votes and the API confirms. */
	feedbackRating?: FeedbackRating | null;
	createdAt: number;
}

/**
 * UI shape for a conversation. Differs from `ThreadDetailResponseDTO`:
 *   • UI-minted `id` (assigned before the server returns a `threadId`)
 *   • `createdAt`/`updatedAt` are ms epochs
 *   • `messages` is the typed `Message[]` above
 */
export interface Conversation {
	id: string;
	/** Opaque thread ID assigned by the backend after first message. */
	threadId?: string;
	messages: Message[];
	createdAt: number;
	updatedAt?: number;
	title?: string;
	/** When true, thread is hidden from the main list and shown under Archived. */
	archived?: boolean;
	/**
	 * Set transiently on rehydrate when we restore an empty entry for the
	 * persisted active conversation. Cleared once `fetchThreads` resolves —
	 * either by the entry being overwritten with the server-mapped one, or
	 * by an explicit cleanup pass for ids the server doesn't know. Lets the
	 * UI distinguish "loading the previous thread" from "fresh new chat" so
	 * the skeleton is shown only in the former case.
	 */
	isHydrating?: boolean;
}

// ---------------------------------------------------------------------------
// Streaming-only types — live during an active SSE stream, never persisted.
// No DTO equivalents: these aggregate multiple SSE event DTOs into UI-friendly
// records (e.g. one StreamingToolCall combines a `tool_call` + `tool_result`).
// ---------------------------------------------------------------------------

/** A single tool invocation tracked during streaming. */
export interface StreamingToolCall {
	/** Matches the toolName field in SSE tool_call / tool_result events. */
	toolName: string;
	input: unknown;
	result?: unknown;
	/** True once the corresponding tool_result event has been received. */
	done: boolean;
	/**
	 * Optional human-friendly title from the `ToolCallEventDTO`. When present
	 * the UI prefers it over a derived label built from `toolName`.
	 */
	displayText?: string | null;
}

/**
 * An ordered item in the streaming event timeline.
 * Text and tool calls are interleaved in arrival order so the UI renders
 * them chronologically rather than grouping all tools above all text.
 */
export type StreamingEventItem =
	| { kind: 'text'; content: string }
	| { kind: 'thinking'; content: string }
	| { kind: 'tool'; toolCall: StreamingToolCall };

/**
 * Per-conversation streaming state. Present in the store's `streams` map only
 * while active. `pendingApproval`/`pendingClarification` are the SSE event
 * DTOs straight from the wire; the persisted summary DTOs (returned by
 * `GET /threads/{id}`) are structurally compatible and are assigned in
 * verbatim during cold-start.
 */
export interface ConversationStreamState {
	isStreaming: boolean;
	streamingContent: string;
	streamingStatus: string;
	streamingEvents: StreamingEventItem[];
	streamingMessageId: string | null;
	/** Actions sent on the final SSE `message` event (`done: true`). */
	streamingActions: MessageActionDTO[] | null;
	pendingApproval: ApprovalEventDTO | null;
	pendingClarification: ClarificationEventDTO | null;
}
