/**
 * AI-owned. Generated and maintained by the `signoz-page-story` skill.
 * Do not hand-edit: regenerate instead.
 */

import { AI_API_PATH, setAIBackendUrl } from 'api/AIAPIInstance';
import ROUTES from 'constants/routes';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import { rest, type RequestHandler } from 'msw';

import {
	choiceControl,
	countControl,
	multiChoiceControl,
	toggleControl,
} from '@/storybook/controls/controls';
import { defineStoryMocks } from '@/storybook/controls/defineStoryMocks';
import { globalConfigResponse } from '@/storybook/msw/__story_mockdata__/appShell';
import { dashboardsForUserResponse } from '@/storybook/msw/__story_mockdata__/dashboards';
import type { MockResolver } from '@/storybook/msw/types';

import {
	AGENT_STATES,
	type AgentState,
	answeredBlocks,
	chipsResponse,
	EXECUTION_ID,
	executionEvents,
	newConversation,
	NEW_THREAD_ID,
	openConversation,
	THREAD_ID,
	streamingState,
	THREAD_PARTS,
	type ThreadPart,
	threadDetailResponse,
	threadListResponse,
} from './__story_mockdata__/aiAssistant';

const THREAD = 'AI assistant · thread';
const AGENT = 'AI assistant · agent';
const CONVERSATIONS = 'AI assistant · conversations';

/**
 * The assistant talks to its own backend, whose host comes from the global
 * config rather than being the SigNoz API. Pointing it at the same origin is
 * what puts its calls in front of the story's handlers.
 */
const AI_BACKEND_URL = 'http://localhost';

/** The analysis thread, without the turns that carry an interactive block. */
const ANALYSIS: ThreadPart[] = [
	'prose',
	'table',
	'code',
	'activity',
	'actions',
	'voted',
];

/** Suggestions the `@` picker offers under Dashboards. */
const CONTEXT_DASHBOARDS = [
	'Checkout overview',
	'Payments upstream',
	'Ingestion health',
];

/**
 * `useIsAIAssistantEnabled` pushes the assistant's host into the axios instance
 * during render, and pushes `null` for as long as the global config query is in
 * flight. Every call that leaves in that window goes out against an empty base
 * and lands on the page's own origin, so each endpoint answers on both paths
 * rather than the story showing the 404 the app puts there. Reported as an app
 * bug.
 */
const onBothBases = (
	method: 'get' | 'post' | 'patch',
	path: string,
	resolver: MockResolver,
): RequestHandler[] => [
	rest[method](`${AI_BACKEND_URL}${AI_API_PATH}${path}`, resolver),
	rest[method](path, resolver),
];

const ok: MockResolver = (_req, res, ctx) => res(ctx.status(200), ctx.json({}));

const startedExecution: MockResolver = (_req, res, ctx) =>
	res(ctx.status(200), ctx.json({ executionId: EXECUTION_ID }));

export const aiAssistantMocks = defineStoryMocks({
	controls: {
		conversation: toggleControl('Open conversation', {
			group: THREAD,
			description:
				'Off is the empty thread a first visit lands on, with the suggested prompts instead of an exchange.',
			value: true,
		}),
		contents: multiChoiceControl<ThreadPart>('Thread contents', {
			group: THREAD,
			description:
				'What the open thread holds. Each interactive block arrives as its own turn, and `voted` is a rating already on the last answer.',
			options: THREAD_PARTS,
			value: ANALYSIS,
		}),
		answered: toggleControl('Interactive blocks answered', {
			group: THREAD,
			description:
				'The question, confirm and action blocks after the user has picked. The choice lives in the store, keyed by message, so it survives a remount.',
			value: false,
		}),
		agent: choiceControl<AgentState>('Agent', {
			group: AGENT,
			description:
				'What the agent is doing when the thread opens. Both waiting states block the composer until the user answers.',
			options: AGENT_STATES,
			value: 'idle',
		}),
		history: countControl('Past conversations', {
			group: CONVERSATIONS,
			description:
				'Threads the sidebar lists, the first being the open one, so an open conversation holds the count at one. Their ages spread across every date group.',
			value: 6,
			max: 12,
		}),
		archived: countControl('Archived conversations', {
			group: CONVERSATIONS,
			description: 'Threads under the archived group at the foot of the sidebar.',
			value: 2,
			max: 6,
		}),
	},
	handlers: (values, response) => [
		rest.get('http://localhost/api/v1/global/config', (_req, res, ctx) =>
			res(
				ctx.json({
					...globalConfigResponse,
					data: {
						...globalConfigResponse.data,
						ai_assistant_url: AI_BACKEND_URL,
					},
				}),
			),
		),

		...onBothBases(
			'get',
			'/threads',
			response.json((req) =>
				req.url.searchParams.get('archived') === 'true'
					? threadListResponse(values.archived, true)
					: // A thread the sidebar does not list is one the server does not
						// know, and the store drops those, so an open conversation is
						// always the first row.
						threadListResponse(
							values.conversation ? Math.max(1, values.history) : values.history,
							false,
						),
			),
		),
		...onBothBases(
			'get',
			'/threads/:threadId',
			response.json(() => threadDetailResponse(values.contents, values.agent)),
		),
		...onBothBases(
			'get',
			'/empty-state/chips',
			response.json(() => chipsResponse()),
		),

		// Everything the user can set off from the page. They answer plainly rather
		// than through `response`, so a click still lands while the Data control
		// holds the page's own endpoints on loading or error.
		// The first send of a new conversation mints a thread, and the page puts the
		// id it gets back in the pathname: the overlay reports that as a navigation
		// the story cannot follow, with the answer still streaming underneath.
		...onBothBases('post', '/threads', (_req, res, ctx) =>
			res(ctx.status(200), ctx.json({ threadId: THREAD_ID })),
		),
		...onBothBases('patch', '/threads/:threadId', ok),
		...onBothBases('post', '/threads/:threadId/messages', startedExecution),
		...onBothBases('post', '/messages/:messageId/regenerate', startedExecution),
		...onBothBases('post', '/messages/:messageId/feedback', ok),
		...onBothBases('post', '/approve', startedExecution),
		...onBothBases('post', '/clarify', startedExecution),
		...onBothBases('post', '/reject', ok),
		...onBothBases('post', '/cancel', ok),
		...onBothBases('post', '/undo', ok),
		...onBothBases('post', '/revert', ok),
		...onBothBases('post', '/restore', ok),
		...onBothBases('get', '/executions/:executionId/events', (_req, res, ctx) =>
			res(
				ctx.status(200),
				ctx.set('Content-Type', 'text/event-stream'),
				ctx.body(executionEvents()),
			),
		),

		// The composer's `@` picker. Alert rules and services are answered by the
		// shared handlers already; the dashboard list is not.
		rest.get(
			'http://localhost/api/v2/users/me/dashboards',
			response.json(() => dashboardsForUserResponse(CONTEXT_DASHBOARDS)),
		),
	],
	config: (values) => ({
		// The bare `/ai-assistant` always rewrites itself to the thread it opens,
		// so a story starts on the thread rather than on the redirect.
		route: ROUTES.AI_ASSISTANT.replace(
			':conversationId',
			values.conversation ? THREAD_ID : NEW_THREAD_ID,
		),
	}),
	effect: (values) => {
		// The layout fetches the thread list in its mount effect, before the global
		// config query it takes the assistant's host from has answered, so the
		// first call would go out against an empty base. Setting it here is what
		// the config response does, one render earlier.
		setAIBackendUrl(AI_BACKEND_URL);

		// The store is a zustand singleton and persists the answered blocks and the
		// active thread, so a story's state is put there before the tree mounts
		// rather than inherited from whichever story ran last.
		const conversation = values.conversation
			? openConversation()
			: newConversation();

		useAIAssistantStore.setState({
			conversations: { [conversation.id]: conversation },
			activeConversationId: conversation.id,
			isLoadingThread: false,
			isLoadingThreads: false,
			answeredBlocks: values.answered ? answeredBlocks() : {},
			// A stream is client state with no response behind it: the events the
			// reducer folds into it only exist while the SSE connection is open.
			streams:
				values.agent === 'streaming' ? { [conversation.id]: streamingState() } : {},
		});
	},
});
