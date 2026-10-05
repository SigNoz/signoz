import { fireEvent } from '@testing-library/react';
import { openAIAssistant } from 'container/AIAssistant/store/useAIAssistantStore';
import { useIsAIAssistantEnabled } from 'hooks/useIsAIAssistantEnabled';
import { render } from 'tests/test-utils';

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
	const state = { isDrawerOpen, isModalOpen, streams: {} };
	useAIAssistantStore.mockImplementation((selector: (s: unknown) => unknown) => {
		const picked = selector(state);
		// `selectPendingUserInputStreamCount` walks `streams`, which is empty here,
		// so stand in the count we want to assert against.
		return typeof picked === 'number' ? pendingCount : picked;
	});
}

// `TooltipSimple` replaces its trigger's props, so the testId lives on the
// wrapper and the button itself is reached by role — there is only ever one.
const SLOT = 'bottom-strip-ask-noz';

describe('AskNoz', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockEnabled.mockReturnValue(true);
		mockStore();
	});

	describe('visibility', () => {
		it('renders when the assistant is enabled', () => {
			const { getByRole } = render(<AskNoz />);

			expect(getByRole('button')).toBeInTheDocument();
		});

		it('renders nothing when the assistant is disabled', () => {
			mockEnabled.mockReturnValue(false);

			const { queryByTestId } = render(<AskNoz />);

			expect(queryByTestId(SLOT)).not.toBeInTheDocument();
		});

		it('renders nothing while the drawer is open', () => {
			mockStore({ isDrawerOpen: true });

			const { queryByTestId } = render(<AskNoz />);

			expect(queryByTestId(SLOT)).not.toBeInTheDocument();
		});

		it('renders nothing on the Noz full page, where the drawer does not mount', () => {
			const { queryByTestId } = render(<AskNoz />, undefined, {
				initialRoute: '/ai-assistant/some-conversation-id',
			});

			expect(queryByTestId(SLOT)).not.toBeInTheDocument();
		});
	});

	describe('what it does', () => {
		it('opens the drawer on click', () => {
			const { getByRole } = render(<AskNoz />);

			fireEvent.click(getByRole('button'));

			expect(mockOpen).toHaveBeenCalledTimes(1);
		});
	});

	describe('pending badge', () => {
		it('announces the count when Noz is waiting on the user', () => {
			mockStore({ pendingCount: 2 });

			const { getByRole } = render(<AskNoz />);

			expect(getByRole('button')).toHaveAttribute(
				'aria-label',
				'Ask Noz, 2 actions need your response',
			);
		});

		it('uses the singular for one pending action', () => {
			mockStore({ pendingCount: 1 });

			const { getByRole } = render(<AskNoz />);

			expect(getByRole('button')).toHaveAttribute(
				'aria-label',
				'Ask Noz, 1 action needs your response',
			);
		});

		it('stays quiet when nothing is pending', () => {
			const { getByRole } = render(<AskNoz />);

			expect(getByRole('button')).toHaveAttribute('aria-label', 'Ask Noz');
		});

		it('stays quiet while the modal is open, Noz is already on screen', () => {
			mockStore({ isModalOpen: true, pendingCount: 3 });

			const { getByRole } = render(<AskNoz />);

			expect(getByRole('button')).toHaveAttribute('aria-label', 'Ask Noz');
		});
	});
});
