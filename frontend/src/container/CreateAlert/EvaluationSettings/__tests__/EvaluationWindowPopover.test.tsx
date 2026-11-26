import { fireEvent, render, screen } from 'tests/test-utils';
import { EvaluationWindowState } from 'container/CreateAlert/context/types';

import {
	EVALUATION_WINDOW_TIMEFRAME,
	EVALUATION_WINDOW_TYPE,
} from '../constants';
import EvaluationWindowPopover from '../EvaluationWindowPopover';
import { createMockEvaluationWindowState } from './testUtils';

const mockEvaluationWindow: EvaluationWindowState =
	createMockEvaluationWindowState();
const mockSetEvaluationWindow = jest.fn();

const ROLLING_OPTION_TEST_ID = 'window-type-option-rolling';
const CUMULATIVE_OPTION_TEST_ID = 'window-type-option-cumulative';
const LAST_5_MINUTES_OPTION_TEST_ID = 'timeframe-option-5m0s';
const EVALUATION_WINDOW_DETAILS_TEST_ID = 'evaluation-window-details';
const ENTER_VALUE_PLACEHOLDER = 'Enter value';
const EVALUATION_WINDOW_TEXT = 'EVALUATION WINDOW';

jest.mock('../EvaluationWindowPopover/EvaluationWindowDetails', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid={EVALUATION_WINDOW_DETAILS_TEST_ID}>
			<input placeholder={ENTER_VALUE_PLACEHOLDER} />
		</div>
	),
}));

describe('EvaluationWindowPopover', () => {
	it('should render the evaluation window popover with 3 sections', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={mockEvaluationWindow}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		expect(screen.getByText(EVALUATION_WINDOW_TEXT)).toBeInTheDocument();
	});

	it('offers only rolling windows when rollingOnly is set', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={mockEvaluationWindow}
				setEvaluationWindow={mockSetEvaluationWindow}
				rollingOnly
			/>,
		);
		expect(screen.getByText('Rolling')).toBeInTheDocument();
		expect(screen.queryByText('Cumulative')).not.toBeInTheDocument();
	});

	it('should render all window type options with rolling selected', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={mockEvaluationWindow}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		EVALUATION_WINDOW_TYPE.forEach((option) => {
			expect(screen.getByText(option.label)).toBeInTheDocument();
		});
		const rollingItem = screen.getByTestId(ROLLING_OPTION_TEST_ID);
		expect(rollingItem).toHaveClass('active');

		const cumulativeItem = screen.getByTestId(CUMULATIVE_OPTION_TEST_ID);
		expect(cumulativeItem).not.toHaveClass('active');
	});

	it('should render all window type options with cumulative selected', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		EVALUATION_WINDOW_TYPE.forEach((option) => {
			expect(screen.getByText(option.label)).toBeInTheDocument();
		});

		const cumulativeItem = screen.getByTestId(CUMULATIVE_OPTION_TEST_ID);
		expect(cumulativeItem).toHaveClass('active');
		const rollingItem = screen.getByTestId(ROLLING_OPTION_TEST_ID);
		expect(rollingItem).not.toHaveClass('active');
	});

	it('should render all timeframe options in rolling mode with last 5 minutes selected by default', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={mockEvaluationWindow}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		EVALUATION_WINDOW_TIMEFRAME.rolling.forEach((option) => {
			expect(screen.getByText(option.label)).toBeInTheDocument();
		});
		const last5MinutesItem = screen.getByTestId(LAST_5_MINUTES_OPTION_TEST_ID);
		expect(last5MinutesItem).toHaveClass('active');
	});

	it('should render all timeframe options in cumulative mode with current hour selected by default', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentHour',
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		EVALUATION_WINDOW_TIMEFRAME.cumulative.forEach((option) => {
			expect(screen.getByText(option.label)).toBeInTheDocument();
		});
		const currentHourItem = screen.getByTestId('timeframe-option-currentHour');
		expect(currentHourItem).toHaveClass('active');
	});

	it('renders help text in details section for rolling mode with non-custom timeframe', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={mockEvaluationWindow}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		expect(
			screen.getAllByText(
				(_, element) =>
					element?.textContent?.includes(
						'Monitors data over a fixed time period that moves forward continuously',
					) ?? false,
			)[0],
		).toBeInTheDocument();
		expect(
			screen.queryByTestId(EVALUATION_WINDOW_DETAILS_TEST_ID),
		).not.toBeInTheDocument();
	});

	it('renders EvaluationWindowDetails component in details section for rolling mode with custom timeframe', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={createMockEvaluationWindowState({
					timeframe: 'custom',
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);

		expect(
			screen.queryByText(
				'A Rolling Window has a fixed size and shifts its starting point over time based on when the rules are evaluated.',
			),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId(EVALUATION_WINDOW_DETAILS_TEST_ID),
		).toBeInTheDocument();
	});

	it('renders EvaluationWindowDetails component in details section for cumulative mode', () => {
		render(
			<EvaluationWindowPopover
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentHour',
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		expect(
			screen.queryByText(
				'A Cumulative Window has a fixed starting point and expands over time.',
			),
		).not.toBeInTheDocument();
		expect(
			screen.getByTestId(EVALUATION_WINDOW_DETAILS_TEST_ID),
		).toBeInTheDocument();
	});

	describe('keyboard navigation', () => {
		it('should navigate down through window type options', () => {
			render(
				<EvaluationWindowPopover
					evaluationWindow={mockEvaluationWindow}
					setEvaluationWindow={mockSetEvaluationWindow}
				/>,
			);

			const rollingItem = screen.getByTestId(ROLLING_OPTION_TEST_ID);
			rollingItem.focus();

			fireEvent.keyDown(rollingItem, { key: 'ArrowDown' });
			const cumulativeItem = screen.getByTestId(CUMULATIVE_OPTION_TEST_ID);
			expect(cumulativeItem).toHaveFocus();
		});

		it('should navigate up through window type options', () => {
			render(
				<EvaluationWindowPopover
					evaluationWindow={mockEvaluationWindow}
					setEvaluationWindow={mockSetEvaluationWindow}
				/>,
			);

			const cumulativeItem = screen.getByTestId(CUMULATIVE_OPTION_TEST_ID);
			cumulativeItem.focus();

			fireEvent.keyDown(cumulativeItem, { key: 'ArrowUp' });
			const rollingItem = screen.getByTestId(ROLLING_OPTION_TEST_ID);
			expect(rollingItem).toHaveFocus();
		});

		it('should navigate right from window type to timeframe', () => {
			render(
				<EvaluationWindowPopover
					evaluationWindow={mockEvaluationWindow}
					setEvaluationWindow={mockSetEvaluationWindow}
				/>,
			);

			const rollingItem = screen.getByTestId(ROLLING_OPTION_TEST_ID);
			rollingItem.focus();

			fireEvent.keyDown(rollingItem, { key: 'ArrowRight' });
			const timeframeItem = screen.getByTestId(LAST_5_MINUTES_OPTION_TEST_ID);
			expect(timeframeItem).toHaveFocus();
		});

		it('should navigate left from timeframe to window type', () => {
			render(
				<EvaluationWindowPopover
					evaluationWindow={mockEvaluationWindow}
					setEvaluationWindow={mockSetEvaluationWindow}
				/>,
			);

			const timeframeItem = screen.getByTestId(LAST_5_MINUTES_OPTION_TEST_ID);
			timeframeItem.focus();

			fireEvent.keyDown(timeframeItem, { key: 'ArrowLeft' });
			const rollingItem = screen.getByTestId(ROLLING_OPTION_TEST_ID);
			expect(rollingItem).toHaveFocus();
		});

		it('should select option with Enter key', () => {
			render(
				<EvaluationWindowPopover
					evaluationWindow={mockEvaluationWindow}
					setEvaluationWindow={mockSetEvaluationWindow}
				/>,
			);

			const cumulativeItem = screen.getByTestId(CUMULATIVE_OPTION_TEST_ID);
			cumulativeItem.focus();

			fireEvent.keyDown(cumulativeItem, { key: 'Enter' });
			expect(mockSetEvaluationWindow).toHaveBeenCalledWith({
				type: 'SET_WINDOW_TYPE',
				payload: 'cumulative',
			});
		});

		it('should select option with Space key', () => {
			render(
				<EvaluationWindowPopover
					evaluationWindow={mockEvaluationWindow}
					setEvaluationWindow={mockSetEvaluationWindow}
				/>,
			);

			const cumulativeItem = screen.getByTestId(CUMULATIVE_OPTION_TEST_ID);
			cumulativeItem.focus();

			fireEvent.keyDown(cumulativeItem, { key: ' ' });
			expect(mockSetEvaluationWindow).toHaveBeenCalledWith({
				type: 'SET_WINDOW_TYPE',
				payload: 'cumulative',
			});
		});
	});
});
