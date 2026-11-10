import { fireEvent } from '@testing-library/react';
import logEvent from 'api/common/logEvent';
import { ChatSupportState, useChatSupport } from 'hooks/useChatSupport';
import { render } from 'tests/test-utils';

import { BottomStripEvents, BottomStripSupportType } from '../../events';
import SupportButton from '../SupportButton';

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: jest.fn(),
}));

jest.mock('hooks/useChatSupport', () => ({
	...jest.requireActual('hooks/useChatSupport'),
	useChatSupport: jest.fn(),
}));

const mockChatSupport = useChatSupport as jest.MockedFunction<
	typeof useChatSupport
>;

const BUTTON = 'bottom-strip-support';
const MODAL_TITLE = 'Add Credit Card for Chat Support';

describe('SupportButton', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		window.Pylon = jest.fn() as never;
	});

	describe('when Pylon is available', () => {
		beforeEach(() => mockChatSupport.mockReturnValue(ChatSupportState.Pylon));

		it('shows the button', () => {
			const { getByTestId } = render(<SupportButton />);

			expect(getByTestId(BUTTON)).toBeInTheDocument();
		});

		it('opens the Pylon widget on click', () => {
			const { getByTestId } = render(<SupportButton />);

			fireEvent.click(getByTestId(BUTTON));

			expect(window.Pylon).toHaveBeenCalledWith('show');
			expect(logEvent).toHaveBeenCalledWith(BottomStripEvents.SupportClicked, {
				type: BottomStripSupportType.Pylon,
			});
		});

		it('does not open the credit card modal', () => {
			const { getByTestId, queryByText } = render(<SupportButton />);

			fireEvent.click(getByTestId(BUTTON));

			expect(queryByText(MODAL_TITLE)).not.toBeInTheDocument();
		});
	});

	describe('when the user needs a card', () => {
		beforeEach(() => mockChatSupport.mockReturnValue(ChatSupportState.NeedsCard));

		it('shows the same button', () => {
			const { getByTestId } = render(<SupportButton />);

			expect(getByTestId(BUTTON)).toBeInTheDocument();
		});

		it('opens the credit card modal on click, not Pylon', () => {
			const { getByTestId, getByText } = render(<SupportButton />);

			fireEvent.click(getByTestId(BUTTON));

			expect(getByText(MODAL_TITLE)).toBeInTheDocument();
			expect(window.Pylon).not.toHaveBeenCalled();
			expect(logEvent).toHaveBeenCalledWith(BottomStripEvents.SupportClicked, {
				type: BottomStripSupportType.AddCard,
			});
		});
	});

	describe('when support is unavailable', () => {
		beforeEach(() =>
			mockChatSupport.mockReturnValue(ChatSupportState.Unavailable),
		);

		it('renders nothing at all', () => {
			const { queryByTestId } = render(<SupportButton />);

			expect(queryByTestId(BUTTON)).not.toBeInTheDocument();
		});
	});
});
