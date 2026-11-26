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

function mockStore({
	isDrawerOpen = false,
}: { isDrawerOpen?: boolean } = {}): void {
	useAIAssistantStore.mockImplementation((selector: (s: unknown) => unknown) =>
		selector({ isDrawerOpen }),
	);
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

			expect(getByTestId(BUTTON)).toHaveTextContent('Ask Noz');
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
});
