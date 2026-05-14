import { Events } from 'constants/events';
import { DEFAULT_PIN_TOOLTIP_KEY } from 'lib/uPlotV2/plugins/TooltipPlugin/types';
import { render, screen, userEvent } from 'tests/test-utils';

import TooltipFooter from '../TooltipFooter';

const mockLogEvent = jest.fn();

jest.mock('api/common/logEvent', () => ({
	__esModule: true,
	default: (...args: unknown[]): unknown => mockLogEvent(...args),
}));

describe('TooltipFooter', () => {
	const defaultProps = {
		id: 'panel-123',
		isPinned: false,
		dismiss: jest.fn(),
	};

	describe('when not pinned', () => {
		it('renders the drilldown and pin hints by default', () => {
			render(<TooltipFooter {...defaultProps} />);

			expect(screen.getByText('Click to drilldown')).toBeInTheDocument();
			expect(screen.getByText('to pin the tooltip')).toBeInTheDocument();
			expect(
				screen.getByText(DEFAULT_PIN_TOOLTIP_KEY.toUpperCase()),
			).toBeInTheDocument();
		});

		it('hides the drilldown hint when canDrilldown is false', () => {
			render(<TooltipFooter {...defaultProps} canDrilldown={false} />);

			expect(screen.queryByText('Click to drilldown')).not.toBeInTheDocument();
			expect(screen.getByText('to pin the tooltip')).toBeInTheDocument();
		});

		it('renders a custom pin key in uppercase', () => {
			render(<TooltipFooter {...defaultProps} pinKey="x" />);

			expect(screen.getByText('X')).toBeInTheDocument();
		});

		it('does not render the unpin button', () => {
			render(<TooltipFooter {...defaultProps} />);

			expect(screen.queryByTestId('uplot-tooltip-unpin')).not.toBeInTheDocument();
		});
	});

	describe('when pinned', () => {
		it('renders the unpin hint with pin key and Esc', () => {
			render(<TooltipFooter {...defaultProps} isPinned />);

			expect(screen.getByText('to unpin')).toBeInTheDocument();
			expect(
				screen.getByText(DEFAULT_PIN_TOOLTIP_KEY.toUpperCase()),
			).toBeInTheDocument();
			expect(screen.getByText('Esc')).toBeInTheDocument();
		});

		it('renders the unpin button', () => {
			render(<TooltipFooter {...defaultProps} isPinned />);

			expect(screen.getByTestId('uplot-tooltip-unpin')).toBeInTheDocument();
			expect(
				screen.getByRole('button', { name: /unpin tooltip/i }),
			).toBeInTheDocument();
		});

		it('hides the drilldown and pin-instruction hints', () => {
			render(<TooltipFooter {...defaultProps} isPinned />);

			expect(screen.queryByText('Click to drilldown')).not.toBeInTheDocument();
			expect(screen.queryByText('to pin the tooltip')).not.toBeInTheDocument();
		});

		it('calls dismiss and logs the unpin event when the unpin button is clicked', async () => {
			const user = userEvent.setup({ pointerEventsCheck: 0 });
			const dismiss = jest.fn();

			render(<TooltipFooter {...defaultProps} dismiss={dismiss} isPinned />);

			await user.click(screen.getByTestId('uplot-tooltip-unpin'));

			expect(mockLogEvent).toHaveBeenCalledWith(Events.TOOLTIP_UNPINNED, {
				id: 'panel-123',
			});
			expect(dismiss).toHaveBeenCalledTimes(1);
		});
	});
});
