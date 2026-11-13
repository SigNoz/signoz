import { rest } from 'msw';
import { AI_API_PATH } from 'api/AIAPIInstance';
import type {
	ThreadDetailResponse,
	ThreadListResponse,
	ThreadSummary,
} from 'api/ai-assistant/chat';
import { MessageRoleDTO } from 'api/ai-assistant/sigNozAIAssistantAPI.schemas';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import type { ConversationStreamState } from 'container/AIAssistant/types';
import {
	MAX_OPEN_CONVERSATIONS,
	useNozOpenConversationsStore,
} from 'container/BottomStrip/NozActiveChat/store/useNozOpenConversationsStore';

import { countControl, toggleControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import type { StoryMockArgs } from '../controls/types';
import { nozGlobalConfigResponse } from '../msw/__story_mockdata__/appShell';
import { nozGlobalConfigHandler } from '../msw/appShellHandlers';

const NOZ = 'Noz';

/** The streams this module seeds, so it only ever removes its own. */
const AWAITING_PREFIX = 'storybook-awaiting-';

/** The chats this module opens as strip tabs, so it only ever removes its own. */
const CHAT_PREFIX = 'storybook-chat-';

const CHAT_TITLES = [
	'Why is checkout p99 latency spiking?',
	'Top noisy log patterns in prod',
	'Draft an alert for Kafka consumer lag',
	'Error rate before and after the 14:05 deploy',
	'Which dashboard panels load slowest?',
];

const threadsUrl = `${nozGlobalConfigResponse.data.ai_assistant_url}${AI_API_PATH}/threads`;

const noThreads: ThreadListResponse = { threads: [], hasMore: false };

const chatThreadIds = (count: number): string[] =>
	CHAT_TITLES.slice(0, count).map((_, index) => `${CHAT_PREFIX}${index}`);

const chatThread = (threadId: string): ThreadSummary => {
	const index = Number(threadId.slice(CHAT_PREFIX.length));
	return {
		threadId,
		title: CHAT_TITLES[index] ?? null,
		archived: false,
		createdAt: '2026-11-13T09:00:00Z',
		updatedAt: `2026-11-13T09:0${index}:00Z`,
	};
};

const chatThreadDetail = (threadId: string): ThreadDetailResponse => {
	const thread = chatThread(threadId);
	return {
		...thread,
		messages: [
			{
				messageId: `${threadId}-question`,
				role: MessageRoleDTO.user,
				content: thread.title,
				createdAt: thread.createdAt,
				updatedAt: thread.createdAt,
			},
			{
				messageId: `${threadId}-answer`,
				role: MessageRoleDTO.assistant,
				content:
					'Here is what I found. This is a placeholder reply seeded by the Storybook Noz mocks.',
				createdAt: thread.updatedAt,
				updatedAt: thread.updatedAt,
			},
		],
	};
};

const awaitingStream = (): ConversationStreamState => ({
	isStreaming: false,
	streamingContent: '',
	streamingStatus: 'awaiting_approval',
	streamingEvents: [],
	streamingMessageId: null,
	streamingActions: null,
	pendingApproval: null,
	pendingClarification: null,
});

/**
 * The AI assistant's entry points across the shell. A page that answers the
 * global config itself, such as the Noz page, wins over `noz`.
 */
export const nozMocks = defineStoryMocks({
	controls: {
		noz: toggleControl('Noz', {
			group: NOZ,
			description:
				'Answers the global config with an `ai_assistant_url`, which is what turns the assistant on.',
			value: false,
		}),
		nozAwaiting: countControl('Awaiting you', {
			group: NOZ,
			description:
				'Conversations blocked on an approval, which is what the pending badge on the Noz entry points counts.',
			value: 0,
			max: 3,
		}),
		nozChats: countControl('Open chats', {
			group: NOZ,
			description:
				'Conversations open as tabs in the bottom strip, newest beside Ask Noz. Clicking one opens it in the drawer.',
			value: 0,
			max: MAX_OPEN_CONVERSATIONS,
		}),
		nozUnread: countControl('Unseen replies', {
			group: NOZ,
			description:
				'How many of the newest open chats carry a reply the user has not seen yet, marked with a dot.',
			value: 0,
			max: MAX_OPEN_CONVERSATIONS,
		}),
	},
	handlers: ({ noz, nozChats }) =>
		noz
			? [
					nozGlobalConfigHandler,
					// The drawer loads the thread list on mount, while it is still closed.
					rest.get(threadsUrl, (req, res, ctx) =>
						res(
							ctx.status(200),
							ctx.json(
								req.url.searchParams.get('archived') === 'true'
									? noThreads
									: {
											threads: chatThreadIds(nozChats).map(chatThread),
											hasMore: false,
										},
							),
						),
					),
					rest.get(`${threadsUrl}/:threadId`, (req, res, ctx) =>
						res(
							ctx.status(200),
							ctx.json(chatThreadDetail(String(req.params.threadId))),
						),
					),
				]
			: [],
	effect: ({ nozAwaiting, nozChats, nozUnread }) => {
		const threadIds = chatThreadIds(nozChats);
		const unreadIds = threadIds.slice(Math.max(0, threadIds.length - nozUnread));

		useNozOpenConversationsStore.setState((state) => ({
			threadIds: [
				...state.threadIds.filter((id) => !id.startsWith(CHAT_PREFIX)),
				...threadIds,
			],
		}));

		// The store is a singleton another story's mocks may have seeded, so
		// only this module's own streams are replaced.
		useAIAssistantStore.setState((state) => {
			Object.keys(state.streams)
				.filter((id) => id.startsWith(AWAITING_PREFIX))
				.forEach((id) => {
					delete state.streams[id];
				});

			for (let index = 0; index < nozAwaiting; index += 1) {
				state.streams[`${AWAITING_PREFIX}${index}`] = awaitingStream();
			}

			state.unreadReplyIds = [
				...state.unreadReplyIds.filter((id) => !id.startsWith(CHAT_PREFIX)),
				...unreadIds,
			];
		});
	},
});

export type NozArgs = StoryMockArgs<typeof nozMocks>;
