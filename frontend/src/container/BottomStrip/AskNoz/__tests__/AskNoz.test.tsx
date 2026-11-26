import logEvent from 'api/common/logEvent';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import { openNewAIAssistantChat } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { render, userEvent } from 'tests/test-utils';

import AskNoz from '../AskNoz';

jest.mock('hooks/useIsAIAssistantEnabled');
jest.mock('container/AIAssistant/store/useAIAssistantStore', () => ({
	openNewAIAssistantChat: jest.fn(),
	useAIAssistantStore: jest.fn(),
}));

const mockEnabled = useIsAIAssistantEnabled as jest.MockedFunction<
	typeof useIsAIAssistantEnabled
>;
const mockOpenNew = jest.mocked(openNewAIAssistantChat);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { useAIAssistantStore } = jest.requireMock(
	'container/AIAssistant/store/useAIAssistantStore',
) as { useAIAssistantStore: jest.Mock };

/** The component reads the store through three separate selector calls. */
function mockStore({
	isDrawerOpen = false,
	isModalOpen = false,
	pendingCount = 0,
}: {
	isDrawerOpen?: boolean;
	isModalOpen?: boolean;
	pendingCount?: number;
} = {}): void {
	const state = {
		isDrawerOpen,
		isModalOpen,
		streams: {},
	};
	useAIAssistantStore.mockImplementation((selector: (s: unknown) => unknown) => {
		const picked = selector(state);
		// `selectPendingUserInputStreamCount` walks `streams`, which is empty here,
		// so stand in the count we want to assert against.
		return typeof picked === 'number' ? pendingCount : picked;
	});
}

const SLOT = 'bottom-strip-ask-noz';
const BUTTON = 'bottom-strip-ask-noz-button';

describe('AskNoz', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEnabled.mockReturnValue(true);
		mockStore();
	});

	describe('visibility', () => {
		it('renders when the assistant is enabled', () => {
			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toBeInTheDocument();
		});

		it('renders nothing when the assistant is disabled', () => {
			mockEnabled.mockReturnValue(false);

			const { queryByTestId } = render(<AskNoz />);

			expect(queryByTestId(SLOT)).not.toBeInTheDocument();
		});

		it('stays while the drawer is open, to start another chat', () => {
			mockStore({ isDrawerOpen: true });

			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute('aria-label', 'Ask Noz');
		});

		it('renders nothing on the Noz full page, where the drawer does not mount', () => {
			const { queryByTestId } = render(<AskNoz />, undefined, {
				initialRoute: '/ai-assistant/some-conversation-id',
			});

			expect(queryByTestId(SLOT)).not.toBeInTheDocument();
		});
	});

	describe('what it does', () => {
		it('opens the drawer on a new chat', async () => {
			const user = userEvent.setup();
			const { getByTestId } = render(<AskNoz />);

			await user.click(getByTestId(BUTTON));

			expect(mockOpenNew).toHaveBeenCalledTimes(1);
		});

		it('starts a new chat from the open drawer and reports it as one', async () => {
			const user = userEvent.setup();
			mockStore({ isDrawerOpen: true });
			const { getByTestId } = render(<AskNoz />);

			await user.click(getByTestId(BUTTON));

			expect(mockOpenNew).toHaveBeenCalledTimes(1);
			expect(logEvent).toHaveBeenCalledWith(
				AIAssistantEvents.NewChatClicked,
				expect.objectContaining({
					mode: 'sidepane',
					source: AIAssistantOpenSource.BottomStrip,
				}),
			);
			expect(logEvent).not.toHaveBeenCalledWith(
				AIAssistantEvents.Opened,
				expect.anything(),
			);
		});

		it('reports the open as coming from the strip', async () => {
			const user = userEvent.setup();
			const { getByTestId } = render(<AskNoz />);

			await user.click(getByTestId(BUTTON));

			expect(logEvent).toHaveBeenCalledWith(
				AIAssistantEvents.Opened,
				expect.objectContaining({ source: AIAssistantOpenSource.BottomStrip }),
			);
		});
	});

	describe('pending badge', () => {
		it('announces the count when Noz is waiting on the user', () => {
			mockStore({ pendingCount: 2 });

			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute(
				'aria-label',
				'Ask Noz, 2 actions need your response',
			);
		});

		it('uses the singular for one pending action', () => {
			mockStore({ pendingCount: 1 });

			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute(
				'aria-label',
				'Ask Noz, 1 action needs your response',
			);
		});

		it('stays quiet when nothing is pending', () => {
			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute('aria-label', 'Ask Noz');
		});

		it('stays quiet while the drawer is open, Noz is already on screen', () => {
			mockStore({ isDrawerOpen: true, pendingCount: 3 });

			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute('aria-label', 'Ask Noz');
		});

		it('stays quiet while the modal is open, Noz is already on screen', () => {
			mockStore({ isModalOpen: true, pendingCount: 3 });

			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute('aria-label', 'Ask Noz');
		});
	});
});
