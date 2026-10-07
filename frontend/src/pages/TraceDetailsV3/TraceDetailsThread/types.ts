import { SpanV3 } from 'types/api/trace/getTraceV3';

export type MessagePart =
	| { type: 'text'; content: string }
	| { type: 'thinking'; content?: string }
	| {
			type: 'tool_call';
			id: string;
			name: string;
			arguments: unknown;
			server?: boolean;
	  }
	| {
			type: 'tool_result';
			toolCallId: string;
			name?: string;
			content: string;
			isError?: boolean;
	  }
	| {
			type: 'media';
			modality?: string;
			mimeType?: string;
			uri?: string;
			name?: string;
			sizeBytes?: number;
	  }
	| { type: 'generic'; content: string };

export interface ThreadMessage {
	// system | user | assistant | tool; any other value renders headerless.
	role?: string;
	content: MessagePart[];
	// stop | tool_call | length | content_filter | error, or provider-specific.
	finishReason?: string;
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
