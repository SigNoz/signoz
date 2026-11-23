import { randomUUID } from 'node:crypto';

import type { Page, Route } from '@playwright/test';

import type { GetGlobalConfig200 } from '../schemas';
import type {
	ChipsResponseDTO,
	CreateMessageRequestDTO,
	CreateMessageResponseDTO,
	CreateThreadResponseDTO,
	ExecutionStateDTO,
	MessageRoleDTO,
	MessageSummaryDTO,
	SSEEvent,
	ThreadDetailResponseDTO,
	ThreadListResponseDTO,
} from './schemas';

export interface SentMessage {
	threadId: string;
	body: CreateMessageRequestDTO;
}

export interface FakeAssistant {
	/** Queue the text of the next reply; a send with nothing queued gets a 500. */
	replyWith(text: string): void;
	/** Bodies the app POSTed to `/threads/:id/messages`, oldest first. */
	sentMessages(): SentMessage[];
}

const ASSISTANT_PATH = '/api/v1/assistant';

// Calls made before the global config loads go out with an empty base URL.
const UNPREFIXED = /^\/(threads|executions|empty-state)(\/|$)/;

/** The path under the assistant API, or `null` for any other request. */
function assistantPath(url: URL): string | null {
	const at = url.pathname.indexOf(`${ASSISTANT_PATH}/`);
	if (at >= 0) {
		return url.pathname.slice(at + ASSISTANT_PATH.length);
	}
	return UNPREFIXED.test(url.pathname) ? url.pathname : null;
}

const json = (route: Route, body: unknown, status = 200): Promise<void> =>
	route.fulfill({ status, json: body });

// The generated enums are TS enums; a literal typed by their values can't drift.
const role = (value: `${MessageRoleDTO}`): MessageRoleDTO =>
	value as MessageRoleDTO;
const state = (value: `${ExecutionStateDTO}`): ExecutionStateDTO =>
	value as ExecutionStateDTO;

function replyEvents(
	executionId: string,
	messageId: string,
	text: string,
): SSEEvent[] {
	return [
		{ type: 'status', executionId, state: state('running') },
		{ type: 'message', executionId, messageId, delta: text, done: false },
		{ type: 'message', executionId, messageId, delta: '', done: true },
		{ type: 'done', executionId, tokenInput: 0, tokenOutput: 0, latencyMs: 0 },
	];
}

const sse = (events: SSEEvent[]): string =>
	events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('');

/** Fakes the AI service the stack doesn't run, and enables Noz for this page only. */
export async function installFakeAssistant(page: Page): Promise<FakeAssistant> {
	const threads = new Map<string, ThreadDetailResponseDTO>();
	const executions = new Map<string, SSEEvent[]>();
	const replies: string[] = [];
	const sent: SentMessage[] = [];

	const now = (): string => new Date().toISOString();

	const message = (
		messageRole: `${MessageRoleDTO}`,
		content: string,
		extra: Partial<MessageSummaryDTO> = {},
	): MessageSummaryDTO => ({
		messageId: randomUUID(),
		role: role(messageRole),
		content,
		complete: true,
		createdAt: now(),
		updatedAt: now(),
		...extra,
	});

	const createThread = (): CreateThreadResponseDTO => {
		const threadId = randomUUID();
		threads.set(threadId, {
			threadId,
			title: null,
			state: null,
			activeExecutionId: null,
			archived: false,
			createdAt: now(),
			updatedAt: now(),
			messages: [],
		});
		return { threadId };
	};

	const listThreads = (url: URL): ThreadListResponseDTO => {
		const archived = url.searchParams.get('archived') === 'true';
		return {
			threads: [...threads.values()]
				.filter((thread) => Boolean(thread.archived) === archived)
				.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
				.map((thread) => ({
					threadId: thread.threadId,
					title: thread.title,
					state: thread.state,
					archived: thread.archived,
					createdAt: thread.createdAt,
					updatedAt: thread.updatedAt,
				})),
			hasMore: false,
			nextCursor: null,
		};
	};

	const postMessage = async (
		route: Route,
		thread: ThreadDetailResponseDTO,
	): Promise<void> => {
		const body = route.request().postDataJSON() as CreateMessageRequestDTO;
		sent.push({ threadId: thread.threadId, body });
		const text = replies.shift();
		if (text === undefined) {
			await json(route, { error: 'no scripted reply' }, 500);
			return;
		}
		const executionId = randomUUID();
		const reply = message('assistant', text, { executionId });
		executions.set(executionId, replyEvents(executionId, reply.messageId, text));
		thread.messages?.push(
			message('user', body.content, { contexts: body.contexts }),
			reply,
		);
		thread.title ??= body.content;
		thread.state = state('completed');
		thread.updatedAt = now();
		const response: CreateMessageResponseDTO = { executionId };
		await json(route, response);
	};

	const handle = async (route: Route): Promise<void> => {
		const url = new URL(route.request().url());
		const method = route.request().method();
		const path = assistantPath(url) ?? '';
		const [, resource, id, sub] = path.split('/');
		const thread = id ? threads.get(id) : undefined;

		if (resource === 'threads' && !id && method === 'POST') {
			return json(route, createThread());
		}
		if (resource === 'threads' && !id && method === 'GET') {
			return json(route, listThreads(url));
		}
		if (resource === 'threads' && thread && !sub && method === 'GET') {
			return json(route, thread);
		}
		if (resource === 'threads' && thread && sub === 'messages') {
			return postMessage(route, thread);
		}
		if (resource === 'executions' && id && executions.has(id)) {
			return route.fulfill({
				status: 200,
				contentType: 'text/event-stream',
				body: sse(executions.get(id) ?? []),
			});
		}
		if (resource === 'empty-state') {
			const chips: ChipsResponseDTO = { chips: [] };
			return json(route, chips);
		}
		return json(route, { error: `fake assistant: ${method} ${path}` }, 404);
	};

	await page.route((url) => assistantPath(url) !== null, handle);

	await page.route(
		(url) => url.pathname.endsWith('/api/v1/global/config'),
		async (route) => {
			const response = await route.fetch();
			const body = (await response.json()) as GetGlobalConfig200;
			body.data.ai_assistant_url = new URL(route.request().url()).origin;
			await route.fulfill({ response, json: body });
		},
	);

	return {
		replyWith: (text) => {
			replies.push(text);
		},
		sentMessages: () => [...sent],
	};
}
