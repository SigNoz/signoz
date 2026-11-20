import logEvent from 'api/common/logEvent';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import {
	type AIAssistantStore,
	useAIAssistantStore,
} from 'container/AIAssistant/store/useAIAssistantStore';
import { Conversation } from 'container/AIAssistant/types';
import { ChatSupportState, useChatSupport } from 'hooks/useChatSupport';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { render, screen, userEvent } from 'tests/test-utils';

import SupportButton from '../../SupportButton/SupportButton';
import NozHistory from '../NozHistory';

jest.mock('hooks/useIsAIAssistantEnabled');
jest.mock('hooks/useChatSupport', () => ({
	...jest.requireActual('hooks/useChatSupport'),
	useChatSupport: jest.fn(),
}));

const mockEnabled = jest.mocked(useIsAIAssistantEnabled);
const mockLogEvent = jest.mocked(logEvent);

const MINUTE = 60_000;

const saved = (
	id: string,
	title: string,
	minutesAgo: number,
	extra: Partial<Conversation> = {},
): Conversation => ({
	id,
	threadId: id,
	title,
	messages: [],
	createdAt: Date.now() - minutesAgo * MINUTE,
	updatedAt: Date.now() - minutesAgo * MINUTE,
	...extra,
});

const THREADS = {
	kafka: saved('thread-kafka', 'Kafka consumer lag', 95),
	checkout: saved('thread-checkout', 'Checkout p99 regression', 4),
	archived: saved('thread-old', 'Old runbook questions', 30, { archived: true }),
	draft: { id: 'draft', messages: [], createdAt: Date.now() },
};

const SLOT = 'bottom-strip-noz-history';

const initialStoreState = useAIAssistantStore.getState();

function seed(
	conversations: Conversation[],
	state: { isDrawerOpen?: boolean; activeConversationId?: string | null } = {},
): jest.MockedFunction<AIAssistantStore['loadThread']> {
	const loadThread = jest.fn() as jest.MockedFunction<
		AIAssistantStore['loadThread']
	>;
	loadThread.mockResolvedValue();
	useAIAssistantStore.setState({
		conversations: Object.fromEntries(conversations.map((c) => [c.id, c])),
		isDrawerOpen: state.isDrawerOpen ?? false,
		activeConversationId: state.activeConversationId ?? null,
		loadThread,
	});
	return loadThread;
}

describe('NozHistory', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEnabled.mockReturnValue(true);
	});

	afterEach(() => {
		useAIAssistantStore.setState(initialStoreState, true);
	});

	describe('visibility', () => {
		it('renders nothing without a saved conversation, ignoring drafts and archived ones', () => {
			seed([THREADS.draft, THREADS.archived]);

			render(<NozHistory />);

			expect(screen.queryByTestId(SLOT)).not.toBeInTheDocument();
		});

		it('renders nothing when the assistant is disabled', () => {
			mockEnabled.mockReturnValue(false);
			seed([THREADS.checkout]);

			render(<NozHistory />);

			expect(screen.queryByTestId(SLOT)).not.toBeInTheDocument();
		});

		it('renders nothing on the Noz full page, whose sidebar lists the chats', () => {
			seed([THREADS.checkout]);

			render(<NozHistory />, undefined, {
				initialRoute: '/ai-assistant/thread-checkout',
			});

			expect(screen.queryByTestId(SLOT)).not.toBeInTheDocument();
		});

		it('closes the panel behind it when opened, leaving only the list', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			seed([THREADS.checkout], { isDrawerOpen: true });

			render(<NozHistory />);
			await user.click(screen.getByTestId('noz-history-trigger'));

			const rows = await screen.findAllByTestId('noz-history-item');
			expect(rows.map((row) => row.textContent)).toStrictEqual([
				'Checkout p99 regression4m',
			]);
			expect(useAIAssistantStore.getState().isDrawerOpen).toBe(false);
		});
	});

	describe('popover', () => {
		it('lists saved, unarchived chats newest first', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			seed([THREADS.kafka, THREADS.draft, THREADS.archived, THREADS.checkout]);

			render(<NozHistory />);
			await user.click(screen.getByTestId('noz-history-trigger'));

			const rows = await screen.findAllByTestId('noz-history-item');
			expect(rows.map((row) => row.textContent)).toStrictEqual([
				'Checkout p99 regression4m',
				'Kafka consumer lag1h',
			]);
		});

		it('filters by title and says when nothing matches', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			seed([THREADS.kafka, THREADS.checkout]);

			render(<NozHistory />);
			await user.click(screen.getByTestId('noz-history-trigger'));
			await user.type(await screen.findByTestId('noz-history-search'), 'KAFKA');

			expect(
				screen.getAllByTestId('noz-history-item').map((row) => row.textContent),
			).toStrictEqual(['Kafka consumer lag1h']);

			await user.type(screen.getByTestId('noz-history-search'), ' zzz');

			expect(screen.queryByTestId('noz-history-item')).not.toBeInTheDocument();
			expect(screen.getByTestId('noz-history-empty')).toHaveTextContent(
				'No conversations match “KAFKA zzz”',
			);
		});

		it('opens the picked chat in the panel and closes', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed([THREADS.kafka, THREADS.checkout], {
				activeConversationId: 'thread-checkout',
			});

			render(<NozHistory />);
			await user.click(screen.getByTestId('noz-history-trigger'));
			const [, kafka] = await screen.findAllByTestId('noz-history-item');
			await user.click(kafka);

			expect(loadThread).toHaveBeenCalledWith('thread-kafka');
			expect(useAIAssistantStore.getState().isDrawerOpen).toBe(true);
			expect(mockLogEvent).toHaveBeenCalledWith(
				AIAssistantEvents.ThreadOpenedFromHistory,
				expect.objectContaining({
					threadId: 'thread-kafka',
					source: AIAssistantOpenSource.BottomStrip,
				}),
			);
			expect(screen.queryByTestId('noz-history-search')).not.toBeInTheDocument();
		});

		it('does not count picking the open chat as opening one from history', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			seed([THREADS.checkout], { activeConversationId: 'thread-checkout' });

			render(<NozHistory />);
			await user.click(screen.getByTestId('noz-history-trigger'));
			await user.click(await screen.findByTestId('noz-history-item'));

			expect(mockLogEvent).not.toHaveBeenCalledWith(
				AIAssistantEvents.ThreadOpenedFromHistory,
				expect.anything(),
			);
			expect(useAIAssistantStore.getState().isDrawerOpen).toBe(true);
		});

		it('retries loading the open chat when its messages never arrived', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const loadThread = seed([THREADS.checkout], {
				activeConversationId: 'thread-checkout',
			});

			render(<NozHistory />);
			await user.click(screen.getByTestId('noz-history-trigger'));
			await user.click(await screen.findByTestId('noz-history-item'));

			expect(loadThread).toHaveBeenCalledWith('thread-checkout');
		});

		it('stays open while Support opens the support chat beside it', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			jest.mocked(useChatSupport).mockReturnValue(ChatSupportState.Pylon);
			seed([THREADS.checkout]);

			render(
				<>
					<NozHistory />
					<SupportButton />
				</>,
			);
			await user.click(screen.getByTestId('noz-history-trigger'));
			await screen.findByTestId('noz-history-item');
			await user.click(screen.getByTestId('bottom-strip-support'));

			expect(
				screen.getAllByTestId('noz-history-item').map((row) => row.textContent),
			).toStrictEqual(['Checkout p99 regression4m']);
		});
	});
});
