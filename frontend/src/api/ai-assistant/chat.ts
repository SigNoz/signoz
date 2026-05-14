/**
 * AI Assistant API client.
 *
 * Flow:
 *   1. POST /api/v1/assistant/threads                                           → { threadId }
 *   2. POST /api/v1/assistant/threads/{threadId}/messages                       → { executionId }
 *   3. GET  /api/v1/assistant/executions/{executionId}/events                    → SSE stream (closes on 'done')
 *
 * For subsequent messages in the same thread, repeat steps 2–3.
 * Approval/clarification events pause the stream; use approveExecution/clarifyExecution
 * to resume, which each return a new executionId to open a fresh SSE stream.
 *
 * Types in this file re-use the OpenAPI-generated DTOs in
 * `src/api/ai-assistant/sigNozAIAssistantAPI.schemas.ts`.
 * Local types are defined only when the UI needs a different shape — for
 * example, the SSE event union adds a literal `type` discriminator that the
 * generated event DTOs leave loose.
 *
 * REST calls go through `AIAssistantInstance` (an axios instance configured
 * with the same interceptor stack as the rest of the app) — that gives them
 * automatic 401-then-rotate behaviour for free. Only the SSE call is still
 * a raw `fetch` because axios doesn't expose `ReadableStream`; that one
 * path gets its own small auth wrapper.
 */

import axios from 'axios';
import getLocalStorageApi from 'api/browser/localstorage/get';
import { Logout } from 'api/utils';
import rotateSession from 'api/v2/sessions/rotate/post';
import afterLogin from 'AppRoutes/utils';
import type {
	ActionResultResponseDTO,
	ApprovalEventDTO,
	ApproveResponseDTO,
	CancelResponseDTO,
	ClarificationEventDTO,
	ClarifyResponseDTO,
	ConversationEventDTO,
	CreateMessageResponseDTO,
	CreateThreadResponseDTO,
	DoneEventDTO,
	ErrorEventDTO,
	ExecutionStateDTO,
	FeedbackRatingDTO,
	ListThreadsApiV1AssistantThreadsGetArchived,
	ListThreadsApiV1AssistantThreadsGetParams,
	MessageContextDTO,
	MessageContextDTOSource,
	MessageContextDTOType,
	MessageEventDTO,
	MessageSummaryDTO,
	RegenerateResponseDTO,
	StatusEventDTO,
	ThinkingEventDTO,
	ThreadDetailResponseDTO,
	ThreadListResponseDTO,
	ThreadSummaryDTO,
	ToolCallEventDTO,
	ToolResultEventDTO,
} from './sigNozAIAssistantAPI.schemas';
import { LOCALSTORAGE } from 'constants/localStorage';

import {
	AIAssistantInstance,
	getAIBaseUrl,
	SIGNOZ_URL_HEADER,
} from '../AIAPIInstance';
import { getSigNozInstanceUrl } from 'utils/signozInstanceUrl';

// ---------------------------------------------------------------------------
// SSE-only auth wrapper.
//
// REST calls go through `AIAssistantInstance` (axios) and get refresh-token
// behaviour from the shared `interceptorRejected`. The SSE call has to use
// raw `fetch` (axios can't stream a `ReadableStream`), so it can't ride that
// interceptor — this small wrapper handles 401 at SSE open time by hitting
// the same rotate endpoint and replaying the request once.
//
// In typical use a REST call (e.g. sendMessage / loadThread) precedes every
// stream open, so axios will already have refreshed the token and `fetch`
// just reads the fresh one from localStorage. The wrapper exists for the
// edge case where SSE is the first call to encounter a 401.
// ---------------------------------------------------------------------------

let pendingRotate: Promise<string | null> | null = null;

async function rotateAccessToken(): Promise<string | null> {
	if (pendingRotate) {
		return pendingRotate;
	}
	const refreshToken = getLocalStorageApi(LOCALSTORAGE.REFRESH_AUTH_TOKEN) || '';
	if (!refreshToken) {
		return null;
	}
	pendingRotate = (async (): Promise<string | null> => {
		try {
			const response = await rotateSession({ refreshToken });
			afterLogin(response.data.accessToken, response.data.refreshToken, true);
			return response.data.accessToken;
		} catch {
			Logout();
			return null;
		} finally {
			pendingRotate = null;
		}
	})();
	return pendingRotate;
}

// Backoff schedule for 429 retries on SSE open. Three attempts is enough to
// absorb the brief window between cancel→send→stream when the backend is
// rate-limiting the burst, without making real "you're saturated" errors
// take forever to surface.
const SSE_429_BACKOFF_MS = [400, 1200, 2500];

function parseRetryAfterMs(value: string | null): number | null {
	if (!value) {
		return null;
	}
	const seconds = Number(value);
	if (Number.isFinite(seconds)) {
		return Math.max(0, seconds * 1000);
	}
	const date = Date.parse(value);
	if (Number.isFinite(date)) {
		return Math.max(0, date - Date.now());
	}
	return null;
}

async function fetchSSEWithAuth(
	url: string,
	signal?: AbortSignal,
): Promise<Response> {
	const send = async (token: string | null): Promise<Response> => {
		const headers: Record<string, string> = {
			[SIGNOZ_URL_HEADER]: getSigNozInstanceUrl(),
		};
		if (token) {
			headers.Authorization = `Bearer ${token}`;
		}
		return fetch(url, { headers, signal });
	};

	const sendWithAuth = async (): Promise<Response> => {
		const initialToken = getLocalStorageApi(LOCALSTORAGE.AUTH_TOKEN) || '';
		const res = await send(initialToken);
		if (res.status !== 401) {
			return res;
		}
		const refreshed = await rotateAccessToken();
		if (!refreshed) {
			return res;
		}
		return send(refreshed);
	};

	let res = await sendWithAuth();
	for (const baseDelay of SSE_429_BACKOFF_MS) {
		if (res.status !== 429 || signal?.aborted) {
			return res;
		}
		const retryAfter = parseRetryAfterMs(res.headers.get('Retry-After'));
		const delay = retryAfter ?? baseDelay;
		// eslint-disable-next-line no-await-in-loop
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(resolve, delay);
			signal?.addEventListener(
				'abort',
				() => {
					clearTimeout(timer);
					reject(new DOMException('SSE 429 backoff aborted', 'AbortError'));
				},
				{ once: true },
			);
		});
		// eslint-disable-next-line no-await-in-loop
		res = await sendWithAuth();
	}
	return res;
}

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

/** String-literal view of `ExecutionStateDTO` for ergonomic comparisons. */
export type ExecutionState = `${ExecutionStateDTO}`;

// ---------------------------------------------------------------------------
// Re-exported DTOs — the wire shape, used directly without remapping.
// ---------------------------------------------------------------------------

export type ThreadSummary = ThreadSummaryDTO;
export type ThreadListResponse = ThreadListResponseDTO;
export type ThreadDetailResponse = ThreadDetailResponseDTO;
export type MessageSummary = MessageSummaryDTO;
export type CancelResponse = CancelResponseDTO;

/**
 * Construction-friendly view of `MessageContextDTO`: enum fields are widened
 * to their string-literal unions so call-sites can pass `'mention'` instead
 * of `MessageContextDTOSource.mention`.
 */
export type MessageContext = Omit<MessageContextDTO, 'source' | 'type'> & {
	source: `${MessageContextDTOSource}`;
	type: `${MessageContextDTOType}`;
};

/** Construction-friendly view of `ListThreadsApiV1AssistantThreadsGetParams`. */
export type ListThreadsOptions = Omit<
	ListThreadsApiV1AssistantThreadsGetParams,
	'archived'
> & {
	archived?: `${ListThreadsApiV1AssistantThreadsGetArchived}`;
};

/** String-literal view of `FeedbackRatingDTO` so call-sites can pass `'positive'`/`'negative'`. */
export type FeedbackRating = `${FeedbackRatingDTO}`;

// ---------------------------------------------------------------------------
// Thread listing & detail
// ---------------------------------------------------------------------------

export async function listThreads(
	options: ListThreadsOptions = {},
): Promise<ThreadListResponse> {
	const {
		archived = 'false',
		limit = 20,
		cursor = null,
		sort = 'updated_desc',
	} = options;
	const response = await AIAssistantInstance.get<ThreadListResponse>(
		'/threads',
		{
			params: {
				archived,
				limit,
				sort,
				...(cursor ? { cursor } : {}),
			},
		},
	);
	return response.data;
}

export async function updateThread(
	threadId: string,
	update: { title?: string | null; archived?: boolean | null },
): Promise<ThreadSummary> {
	const response = await AIAssistantInstance.patch<ThreadSummary>(
		`/threads/${threadId}`,
		update,
	);
	return response.data;
}

export async function getThreadDetail(
	threadId: string,
): Promise<ThreadDetailResponse> {
	const response = await AIAssistantInstance.get<ThreadDetailResponse>(
		`/threads/${threadId}`,
	);
	return response.data;
}

// ---------------------------------------------------------------------------
// Step 1 — Create thread
// POST /api/v1/assistant/threads → { threadId }
// ---------------------------------------------------------------------------

export async function createThread(signal?: AbortSignal): Promise<string> {
	const response = await AIAssistantInstance.post<CreateThreadResponseDTO>(
		'/threads',
		{},
		{ signal },
	);
	return response.data.threadId;
}

// ---------------------------------------------------------------------------
// Step 2 — Send message
// POST /api/v1/assistant/threads/{threadId}/messages → { executionId }
// ---------------------------------------------------------------------------

/** Fetches the thread's active executionId for reconnect on thread_busy (409). */
async function getActiveExecutionId(threadId: string): Promise<string | null> {
	try {
		const response = await AIAssistantInstance.get<ThreadDetailResponseDTO>(
			`/threads/${threadId}`,
		);
		return response.data.activeExecutionId ?? null;
	} catch {
		return null;
	}
}

export async function sendMessage(
	threadId: string,
	content: string,
	contexts?: MessageContext[],
	signal?: AbortSignal,
): Promise<string> {
	try {
		const response = await AIAssistantInstance.post<CreateMessageResponseDTO>(
			`/threads/${threadId}/messages`,
			{
				content,
				...(contexts && contexts.length > 0 ? { contexts } : {}),
			},
			{ signal },
		);
		return response.data.executionId;
	} catch (err) {
		// Thread already has an active execution — reconnect to it instead of
		// failing the user's send.
		if (axios.isAxiosError(err) && err.response?.status === 409) {
			const executionId = await getActiveExecutionId(threadId);
			if (executionId) {
				return executionId;
			}
		}
		throw err;
	}
}

// ---------------------------------------------------------------------------
// Step 3 — Stream execution events
// GET /api/v1/assistant/executions/{executionId}/events → SSE
// ---------------------------------------------------------------------------

function parseSSELine(line: string): SSEEvent | null {
	if (!line.startsWith('data: ')) {
		return null;
	}
	const json = line.slice('data: '.length).trim();
	if (!json || json === '[DONE]') {
		return null;
	}
	try {
		return JSON.parse(json) as SSEEvent;
	} catch {
		return null;
	}
}

function parseSSEChunk(chunk: string): SSEEvent[] {
	return chunk
		.split('\n\n')
		.map((part) => part.split('\n').find((l) => l.startsWith('data: ')) ?? '')
		.map(parseSSELine)
		.filter((e): e is SSEEvent => e !== null);
}

async function* readSSEReader(
	reader: ReadableStreamDefaultReader<Uint8Array>,
): AsyncGenerator<SSEEvent> {
	const decoder = new TextDecoder();
	let lineBuffer = '';
	try {
		// eslint-disable-next-line no-constant-condition
		while (true) {
			// eslint-disable-next-line no-await-in-loop
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			lineBuffer += decoder.decode(value, { stream: true });
			const parts = lineBuffer.split('\n\n');
			lineBuffer = parts.pop() ?? '';
			yield* parts.flatMap(parseSSEChunk);
		}
		yield* parseSSEChunk(lineBuffer);
	} finally {
		reader.releaseLock();
	}
}

/**
 * Thrown by `streamEvents` when the SSE open returns a non-2xx response.
 * Carries the HTTP status so callers can branch on rate-limit vs. other
 * failures (e.g. show a "please wait a moment" message on 429).
 */
export class SSEStreamError extends Error {
	status: number;

	constructor(status: number, statusText: string) {
		super(`SSE stream failed: ${status} ${statusText}`);
		this.name = 'SSEStreamError';
		this.status = status;
	}
}

export async function* streamEvents(
	executionId: string,
	signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
	const res = await fetchSSEWithAuth(
		`${getAIBaseUrl()}/executions/${executionId}/events`,
		signal,
	);
	if (!res.ok || !res.body) {
		throw new SSEStreamError(res.status, res.statusText);
	}
	yield* readSSEReader(res.body.getReader());
}

// ---------------------------------------------------------------------------
// Approval / Clarification / Cancel actions
// ---------------------------------------------------------------------------

/** Approve a pending action. Returns a new executionId — open a fresh SSE stream for it. */
export async function approveExecution(
	approvalId: string,
	signal?: AbortSignal,
): Promise<string> {
	const response = await AIAssistantInstance.post<ApproveResponseDTO>(
		'/approve',
		{ approvalId },
		{ signal },
	);
	return response.data.executionId;
}

/** Reject a pending action. */
export async function rejectExecution(
	approvalId: string,
	signal?: AbortSignal,
): Promise<void> {
	await AIAssistantInstance.post('/reject', { approvalId }, { signal });
}

/** Submit clarification answers. Returns a new executionId — open a fresh SSE stream for it. */
export async function clarifyExecution(
	clarificationId: string,
	answers: Record<string, unknown>,
	signal?: AbortSignal,
): Promise<string> {
	const response = await AIAssistantInstance.post<ClarifyResponseDTO>(
		'/clarify',
		{ clarificationId, answers },
		{ signal },
	);
	return response.data.executionId;
}

/**
 * Clean-slate regeneration of an assistant response. The backend rewinds the
 * conversation up to (excluding) the supplied messageId and starts a fresh
 * execution. Returns the new executionId — open an SSE stream for it the
 * same way `sendMessage` and `approve` do.
 */
export async function regenerateMessage(
	messageId: string,
	signal?: AbortSignal,
): Promise<string> {
	const response = await AIAssistantInstance.post<RegenerateResponseDTO>(
		`/messages/${messageId}/regenerate`,
		undefined,
		{ signal },
	);
	return response.data.executionId;
}

export async function cancelExecution(
	threadId: string,
	signal?: AbortSignal,
): Promise<CancelResponse> {
	const response = await AIAssistantInstance.post<CancelResponse>(
		'/cancel',
		{ threadId },
		{ signal },
	);
	return response.data;
}

// ---------------------------------------------------------------------------
// Rollback actions — undo / revert / restore
// All three POST `{ actionMetadataId }` and return `ActionResultResponseDTO`.
// ---------------------------------------------------------------------------

async function postRollback(
	endpoint: 'undo' | 'revert' | 'restore',
	actionMetadataId: string,
	signal?: AbortSignal,
): Promise<ActionResultResponseDTO> {
	const response = await AIAssistantInstance.post<ActionResultResponseDTO>(
		`/${endpoint}`,
		{ actionMetadataId },
		{ signal },
	);
	return response.data;
}

export const undoExecution = (
	actionMetadataId: string,
	signal?: AbortSignal,
): Promise<ActionResultResponseDTO> =>
	postRollback('undo', actionMetadataId, signal);

export const revertExecution = (
	actionMetadataId: string,
	signal?: AbortSignal,
): Promise<ActionResultResponseDTO> =>
	postRollback('revert', actionMetadataId, signal);

export const restoreExecution = (
	actionMetadataId: string,
	signal?: AbortSignal,
): Promise<ActionResultResponseDTO> =>
	postRollback('restore', actionMetadataId, signal);

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export async function submitFeedback(
	messageId: string,
	rating: FeedbackRating,
	comment?: string,
): Promise<void> {
	await AIAssistantInstance.post(`/messages/${messageId}/feedback`, {
		rating,
		comment: comment ?? null,
	});
}
