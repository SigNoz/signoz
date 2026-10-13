import { SpanV3 } from 'types/api/trace/getTraceV3';

// OTel GenAI message parts; keys the schema marks required may still be missing.
export type MessagePart =
	| { type: 'text'; content: string }
	| { type: 'reasoning'; content?: string }
	| { type: 'compaction'; id?: string | null; content?: string | null }
	| { type: 'tool_call'; name?: string; id?: string | null; arguments?: unknown }
	| { type: 'tool_call_response'; id?: string | null; response?: unknown }
	| {
			type: 'server_tool_call';
			name?: string;
			id?: string | null;
			server_tool_call?: Record<string, unknown>;
	  }
	| {
			type: 'server_tool_call_response';
			id?: string | null;
			server_tool_call_response?: Record<string, unknown>;
	  }
	| {
			type: 'blob' | 'file' | 'uri';
			modality?: string;
			mime_type?: string | null;
			content?: string;
			file_id?: string;
			uri?: string;
	  }
	| { type: 'generic'; content?: unknown };

export type MessagePartType = MessagePart['type'];

export interface ThreadMessage {
	// system | developer | user | assistant | tool; any other value renders headerless.
	role?: string;
	parts: MessagePart[];
	name?: string;
	// stop | tool_call | length | content_filter | error, or provider-specific.
	finish_reason?: string;
}

export type ThreadSpan = SpanV3 & {
	formatted_input?: ThreadMessage[];
	formatted_output?: ThreadMessage[];
};

export enum ThreadView {
	Formatted = 'formatted',
	Json = 'json',
}

export enum AnchorStatus {
	None = 'none',
	Loading = 'loading',
	Found = 'found',
	// Backend anchors on the span's position but drops it for lacking messages.
	NoMessages = 'noMessages',
	NotFound = 'notFound',
}
