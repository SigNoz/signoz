import { ThreadMessage } from '../AIThreadMessage/types';
import { ThreadSpan } from '../TraceDetailsThread/types';

export interface SpanMessagesData {
	formattedInput: ThreadMessage[];
	formattedOutput: ThreadMessage[];
}

export function getSpanMessages(span: ThreadSpan): SpanMessagesData {
	// Spans from before the JSON column have no formatted messages.
	return {
		formattedInput: span.formattedInput ?? [],
		formattedOutput: span.formattedOutput ?? [],
	};
}

export function hasFormattedMessages(data: SpanMessagesData): boolean {
	return data.formattedInput.length > 0 || data.formattedOutput.length > 0;
}
