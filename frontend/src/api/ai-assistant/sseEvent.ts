import type {
	ApprovalEventDTO,
	ClarificationEventDTO,
	ConversationEventDTO,
	DoneEventDTO,
	ErrorEventDTO,
	MessageEventDTO,
	StatusEventDTO,
	ThinkingEventDTO,
	ToolCallEventDTO,
	ToolResultEventDTO,
} from '@signozhq/noz-client';

// ---------------------------------------------------------------------------
// SSE event types
//
// The generated event DTOs each declare `type?: string` (loose). The UI needs
// a discriminated union, so we intersect each variant with a string-literal
// `type` to enable narrowing via `event.type === 'status'`.
// ---------------------------------------------------------------------------

export type SSEEvent =
	| (StatusEventDTO & { type: 'status' })
	| (MessageEventDTO & { type: 'message' })
	| (ThinkingEventDTO & { type: 'thinking' })
	| (ToolCallEventDTO & { type: 'tool_call' })
	| (ToolResultEventDTO & { type: 'tool_result' })
	| (ApprovalEventDTO & { type: 'approval' })
	| (ClarificationEventDTO & { type: 'clarification' })
	| (ErrorEventDTO & { type: 'error' })
	| (ConversationEventDTO & { type: 'conversation' })
	| (DoneEventDTO & { type: 'done' });
