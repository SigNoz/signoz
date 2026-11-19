import { rest } from 'msw';
import { AI_API_PATH } from 'api/AIAPIInstance';
import { useAIAssistantStore } from 'container/AIAssistant/store/useAIAssistantStore';
import type { ConversationStreamState } from 'container/AIAssistant/types';
import {
	MAX_OPEN_CONVERSATIONS,
	useAIAssistantOpenConversationsStore,
} from 'container/AIAssistant/store/useAIAssistantOpenConversationsStore';
import {
	chipsResponse,
	threadDetailResponse,
	threadListResponse,
} from 'pages/AIAssistantPage/stories/__story_mockdata__/aiAssistant';

import { countControl, toggleControl } from '../controls/controls';
import { defineStoryMocks } from '../controls/defineStoryMocks';
import type { StoryMockArgs } from '../controls/types';
import { nozGlobalConfigResponse } from '../msw/__story_mockdata__/appShell';
import { nozGlobalConfigHandler } from '../msw/appShellHandlers';

const NOZ = 'Noz';

/** The streams this module seeds, so it only ever removes its own. */
const AWAITING_PREFIX = 'storybook-awaiting-';

/** Open tabs are saved conversations, so the list holds at least as many as are open. */
const listedThreads = (saved: number, open: number): number =>
	Math.max(saved, open);

const awaitingStream = (): ConversationStreamState => ({
	isStreaming: false,
	streamingContent: '',
	streamingStatus: 'awaiting_approval',
	streamingEvents: [],
	streamingMessageId: null,
	streamingActions: null,
	pendingApproval: null,
	pendingClarification: null,
	startedAt: null,
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
		nozThreads: countControl('Conversations', {
			group: NOZ,
			description:
				'Saved conversations the thread list returns, which the history icon in the strip lists.',
			value: 0,
			max: 6,
		}),
		nozChats: countControl('Open chats', {
			group: NOZ,
			description:
				'Conversations open as tabs in the bottom strip, newest beside Ask Noz. Clicking one opens it in the panel.',
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
	handlers: ({ noz, nozThreads, nozChats }) =>
		noz
			? [
					nozGlobalConfigHandler,
					// The shell loads the thread list on every page, with Noz still closed.
					rest.get(
						`${nozGlobalConfigResponse.data.ai_assistant_url}${AI_API_PATH}/threads`,
						(req, res, ctx) =>
							res(
								ctx.status(200),
								ctx.json(
									threadListResponse(
										req.url.searchParams.get('archived') === 'true'
											? 0
											: listedThreads(nozThreads, nozChats),
										false,
									),
								),
							),
					),
					// A chat picked from the history or a tab opens in the panel.
					rest.get(
						`${nozGlobalConfigResponse.data.ai_assistant_url}${AI_API_PATH}/threads/:threadId`,
						(req, res, ctx) => {
							const threadId = String(req.params.threadId);
							const listed = threadListResponse(
								listedThreads(nozThreads, nozChats),
								false,
							).threads.find((thread) => thread.threadId === threadId);
							return res(
								ctx.status(200),
								ctx.json({
									...threadDetailResponse(['prose'], 'idle'),
									threadId,
									title: listed?.title,
								}),
							);
						},
					),
					rest.get(
						`${nozGlobalConfigResponse.data.ai_assistant_url}${AI_API_PATH}/empty-state/chips`,
						(_req, res, ctx) => res(ctx.status(200), ctx.json(chipsResponse())),
					),
				]
			: [],
	effect: ({ nozAwaiting, nozChats, nozUnread }) => {
		// Oldest first, so the newest tab sits beside Ask Noz.
		const openThreadIds = threadListResponse(nozChats, false)
			.threads.map((thread) => thread.threadId)
			.reverse();
		useAIAssistantOpenConversationsStore.setState({ threadIds: openThreadIds });

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

			// The store outlives a story, so a panel or history list it opened would still be open in the next.
			state.isDrawerOpen = false;
			state.isHistoryOpen = false;
			// A list loaded by the previous story would prune the seeded tabs before the remount refetches.
			state.hasLoadedThreads = false;

			state.unreadReplyIds = openThreadIds.slice(
				Math.max(0, openThreadIds.length - nozUnread),
			);
		});
	},
});

export type NozArgs = StoryMockArgs<typeof nozMocks>;
