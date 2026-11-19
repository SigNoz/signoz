import {
	type AIAssistantStore,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import type { Conversation, Message } from 'container/AIAssistant/types';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { act, render, screen, userEvent, waitFor } from 'tests/test-utils';

import NozActiveChat from '../NozActiveChat';
import { useAIAssistantOpenConversationsStore } from 'container/AIAssistant/store/useAIAssistantOpenConversationsStore';

jest.mock('hooks/useIsAIAssistantEnabled');

const mockEnabled = jest.mocked(useIsAIAssistantEnabled);

const initialAIState = useAIAssistantStore.getState();
const initialTabsState = useAIAssistantOpenConversationsStore.getState();

const TABS = 'bottom-strip-noz-chats';
const OPEN_BUTTONS = /^bottom-strip-noz-chats-.+-open$/;

const message: Message = {
	id: 'm1',
	role: 'assistant',
	content: 'Hi',
	createdAt: 0,
};

const chat = (id: string, title: string, loaded = false): Conversation => ({
	id,
	threadId: id,
	title,
	messages: loaded ? [message] : [],
	createdAt: 0,
});

interface Seed {
	conversations: Conversation[];
	tabs?: string[];
	unread?: string[];
	activeConversationId?: string | null;
	isDrawerOpen?: boolean;
	hasLoadedThreads?: boolean;
}

function seed({
	conversations,
	tabs = [],
	unread = [],
	activeConversationId = null,
	isDrawerOpen = false,
	hasLoadedThreads = true,
}: Seed): jest.MockedFunction<AIAssistantStore['loadThread']> {
	const loadThread = jest.fn() as jest.MockedFunction<
		AIAssistantStore['loadThread']
	>;
	loadThread.mockResolvedValue();
	useAIAssistantStore.setState({
		conversations: Object.fromEntries(conversations.map((c) => [c.id, c])),
		unreadReplyIds: unread,
		activeConversationId,
		isDrawerOpen,
		hasLoadedThreads,
		loadThread,
	});
	useAIAssistantOpenConversationsStore.setState({ threadIds: tabs });
	return loadThread;
}

const tabLabels = (): (string | null)[] =>
	screen.queryAllByTestId(OPEN_BUTTONS).map((button) => button.textContent);

const openTabs = (): string[] =>
	useAIAssistantOpenConversationsStore.getState().threadIds;

describe('NozActiveChat', () => {
	const play = jest.spyOn(HTMLMediaElement.prototype, 'play');

	beforeEach(() => {
		jest.clearAllMocks();
		mockEnabled.mockReturnValue(true);
		play.mockResolvedValue();
	});

	afterEach(() => {
		useAIAssistantStore.setState(initialAIState, true);
		useAIAssistantOpenConversationsStore.setState(initialTabsState, true);
		localStorage.clear();
	});

	describe('tabs', () => {
		it('shows the open chats in open order, with a dot on an unseen reply', () => {
			seed({
				conversations: [chat('a', 'Alpha'), chat('b', 'Beta')],
				tabs: ['a', 'b'],
				unread: ['b'],
			});

			render(<NozActiveChat />);

			expect(tabLabels()).toStrictEqual(['Alpha', 'Beta']);
			expect(screen.getByTestId(`${TABS}-b-open`)).toHaveAttribute(
				'aria-label',
				'Noz replied in Beta',
			);
			expect(screen.getByTestId(`${TABS}-a-open`)).not.toHaveAttribute(
				'aria-label',
			);
		});

		it('renders nothing on the Noz full page', () => {
			seed({ conversations: [chat('a', 'Alpha')], tabs: ['a'] });

			render(<NozActiveChat />, undefined, { initialRoute: '/ai-assistant/a' });

			expect(screen.queryByTestId(TABS)).not.toBeInTheDocument();
		});

		it('renders nothing when the assistant is disabled', () => {
			mockEnabled.mockReturnValue(false);
			seed({ conversations: [chat('a', 'Alpha')], tabs: ['a'] });

			render(<NozActiveChat />);

			expect(screen.queryByTestId(TABS)).not.toBeInTheDocument();
		});
	});

	describe('what joins and leaves', () => {
		it('adds the chat the panel is showing, marked current', () => {
			seed({
				conversations: [chat('a', 'Alpha')],
				activeConversationId: 'a',
				isDrawerOpen: true,
			});

			render(<NozActiveChat />);

			expect(openTabs()).toStrictEqual(['a']);
			expect(screen.getByTestId(`${TABS}-a-open`)).toHaveAttribute(
				'aria-current',
				'true',
			);
		});

		it('adds a chat whose reply lands without a tab', () => {
			seed({ conversations: [chat('a', 'Alpha')] });
			render(<NozActiveChat />);

			act(() => {
				useAIAssistantStore.setState({ unreadReplyIds: ['a'] });
			});

			expect(openTabs()).toStrictEqual(['a']);
			expect(tabLabels()).toStrictEqual(['Alpha']);
		});

		it('keeps a chat evicted past the cap out as other chats change', () => {
			const chats = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => chat(id, id));
			seed({
				conversations: chats,
				tabs: ['a', 'b', 'c', 'd', 'e'],
				unread: ['a'],
			});
			render(<NozActiveChat />);

			act(() => {
				useAIAssistantOpenConversationsStore.getState().open('f');
			});
			act(() => {
				useAIAssistantStore.setState((s) => {
					s.conversations.f.messages = [message];
				});
			});

			expect(openTabs()).toStrictEqual(['b', 'c', 'd', 'e', 'f']);
		});

		it('closing a tab removes it and dismisses its unseen reply', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			seed({
				conversations: [chat('a', 'Alpha'), chat('b', 'Beta')],
				tabs: ['a', 'b'],
				unread: ['b'],
			});
			render(<NozActiveChat />);

			await user.click(screen.getByTestId(`${TABS}-b-close`));

			expect(openTabs()).toStrictEqual(['a']);
			expect(useAIAssistantStore.getState().unreadReplyIds).toStrictEqual([]);
			expect(tabLabels()).toStrictEqual(['Alpha']);
		});

		it('keeps a tab the thread list has not confirmed until the list loads', () => {
			seed({
				conversations: [chat('a', 'Alpha')],
				tabs: ['a', 'gone'],
				hasLoadedThreads: false,
			});
			render(<NozActiveChat />);

			expect(openTabs()).toStrictEqual(['a', 'gone']);
			expect(tabLabels()).toStrictEqual(['Alpha']);

			act(() => {
				useAIAssistantStore.setState({ hasLoadedThreads: true });
			});

			expect(openTabs()).toStrictEqual(['a']);
		});
	});

	describe('opening a tab', () => {
		it('loads a chat whose messages are not loaded yet and opens the panel', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed({
				conversations: [chat('a', 'Alpha')],
				tabs: ['a'],
			});
			render(<NozActiveChat />);

			await user.click(screen.getByTestId(`${TABS}-a-open`));

			expect(loadThread).toHaveBeenCalledWith('a');
			expect(useAIAssistantStore.getState().isDrawerOpen).toBe(true);
		});

		it('retries loading the selected chat when its messages never arrived', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed({
				conversations: [chat('a', 'Alpha')],
				tabs: ['a'],
				activeConversationId: 'a',
				isDrawerOpen: true,
			});
			render(<NozActiveChat />);

			await user.click(screen.getByTestId(`${TABS}-a-open`));

			expect(loadThread).toHaveBeenCalledWith('a');
		});

		it('loads a chat while another one is loading', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed({
				conversations: [chat('a', 'Alpha'), chat('b', 'Beta')],
				tabs: ['a', 'b'],
				activeConversationId: 'a',
			});
			useAIAssistantStore.setState({ loadingThreadIds: ['a'] });
			render(<NozActiveChat />);

			await user.click(screen.getByTestId(`${TABS}-b-open`));

			expect(loadThread).toHaveBeenCalledWith('b');
		});

		it('shows a chat that is still loading without requesting it again', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed({
				conversations: [chat('a', 'Alpha'), chat('b', 'Beta', true)],
				tabs: ['a', 'b'],
				activeConversationId: 'b',
			});
			useAIAssistantStore.setState({ loadingThreadIds: ['a'] });
			render(<NozActiveChat />);

			await user.click(screen.getByTestId(`${TABS}-a-open`));

			expect(loadThread).not.toHaveBeenCalled();
			expect(useAIAssistantStore.getState().activeConversationId).toBe('a');
		});

		it('switches to a loaded chat without refetching it', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed({
				conversations: [chat('a', 'Alpha', true)],
				tabs: ['a'],
			});
			render(<NozActiveChat />);

			await user.click(screen.getByTestId(`${TABS}-a-open`));

			expect(loadThread).not.toHaveBeenCalled();
			expect(useAIAssistantStore.getState().activeConversationId).toBe('a');
			expect(useAIAssistantStore.getState().isDrawerOpen).toBe(true);
		});
	});

	describe('reply sound', () => {
		it('chimes when a reply lands in a chat that is not on screen', async () => {
			seed({ conversations: [chat('a', 'Alpha')] });
			render(<NozActiveChat />);

			act(() => {
				useAIAssistantStore.setState({ unreadReplyIds: ['a'] });
			});

			await waitFor(() => expect(play).toHaveBeenCalledTimes(1));
		});

		it('stays quiet for replies it already knew about', async () => {
			seed({
				conversations: [chat('a', 'Alpha'), chat('b', 'Beta')],
				unread: ['a', 'b'],
			});
			render(<NozActiveChat />);

			act(() => {
				useAIAssistantStore.getState().markReplyRead('b');
			});
			await act(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 20);
					}),
			);

			expect(play).not.toHaveBeenCalled();
		});

		it('stays quiet when the reply is read before the chime', async () => {
			seed({ conversations: [chat('a', 'Alpha')] });
			render(<NozActiveChat />);

			act(() => {
				useAIAssistantStore.setState({ unreadReplyIds: ['a'] });
			});
			act(() => {
				useAIAssistantStore.getState().markReplyRead('a');
			});
			await act(
				() =>
					new Promise((resolve) => {
						setTimeout(resolve, 20);
					}),
			);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
