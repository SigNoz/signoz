import { SpanV3 } from 'types/api/trace/getTraceV3';

import { ThreadMessage } from '../AIThreadMessage/types';

export type ThreadSpan = SpanV3 & {
	formatted_input?: ThreadMessage[];
	formatted_output?: ThreadMessage[];
};

export enum ThreadView {
	Formatted = 'formatted',
	Json = 'json',
}

export enum InterestedSpanStatus {
	None = 'none',
	Loading = 'loading',
	Found = 'found',
	// Backend anchors on the span's position but drops it for lacking messages.
	NoMessages = 'noMessages',
	NotFound = 'notFound',
}
