import logEvent from 'api/common/logEvent';
import {
	AIAssistantEvents,
	AIAssistantOpenSource,
} from 'container/AIAssistant/events';
import { openAIAssistant } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { render, userEvent } from 'tests/test-utils';

import AskNoz from '../AskNoz';

jest.mock('hooks/useIsAIAssistantEnabled');
jest.mock('container/AIAssistant/store/useAIAssistantStore', () => ({
	openAIAssistant: jest.fn(),
	useAIAssistantStore: jest.fn(),
}));

const mockEnabled = useIsAIAssistantEnabled as jest.MockedFunction<
	typeof useIsAIAssistantEnabled
>;
const mockOpen = openAIAssistant as jest.MockedFunction<typeof openAIAssistant>;
const mockClose = jest.fn() as jest.MockedFunction<() => void>;

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
		closeDrawer: mockClose,
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

		it('stays pressed while the drawer is open', () => {
			mockStore({ isDrawerOpen: true });

			const { getByTestId } = render(<AskNoz />);

			expect(getByTestId(BUTTON)).toHaveAttribute('aria-pressed', 'true');
		});

		it('renders nothing on the Noz full page, where the drawer does not mount', () => {
			const { queryByTestId } = render(<AskNoz />, undefined, {
				initialRoute: '/ai-assistant/some-conversation-id',
			});

			expect(queryByTestId(SLOT)).not.toBeInTheDocument();
		});
	});

	describe('what it does', () => {
		it('opens the drawer on click', async () => {
			const user = userEvent.setup();
			const { getByTestId } = render(<AskNoz />);

			await user.click(getByTestId(BUTTON));

			expect(mockOpen).toHaveBeenCalledTimes(1);
		});

		it('closes the open drawer on the same chat instead of starting a new one', async () => {
			const user = userEvent.setup();
			mockStore({ isDrawerOpen: true });
			const { getByTestId } = render(<AskNoz />);

			await user.click(getByTestId(BUTTON));

			expect(mockClose).toHaveBeenCalledTimes(1);
			expect(mockOpen).not.toHaveBeenCalled();
			expect(logEvent).not.toHaveBeenCalled();
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
