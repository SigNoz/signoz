import { fireEvent, render, screen } from '@testing-library/react';
import { UniversalYAxisUnit } from 'components/YAxisUnitSelector/types';

import EvaluationWindowDetails from '../EvaluationWindowPopover/EvaluationWindowDetails';
import { createMockEvaluationWindowState } from './testUtils';

const mockEvaluationWindowState = createMockEvaluationWindowState();
const mockSetEvaluationWindow = jest.fn();

describe('EvaluationWindowDetails', () => {
	it('should render the evaluation window details for rolling mode with custom timeframe', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'rolling',
					timeframe: 'custom',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						number: '5',
						unit: UniversalYAxisUnit.MINUTES,
					},
				})}
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
		expect(screen.getByText('Specify custom duration')).toBeInTheDocument();
		expect(screen.getByText('Last 5 Minutes')).toBeInTheDocument();
	});

	it('renders the evaluation window details for cumulative mode with current hour', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentHour',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						number: '1',
						timezone: 'UTC',
					},
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		expect(
			screen.getByText('Current hour, starting at minute 1 (UTC)'),
		).toBeInTheDocument();
	});

	it('renders the evaluation window details for cumulative mode with current day', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentDay',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						time: '00:00:00',
						timezone: 'UTC',
					},
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		expect(
			screen.getByText('Current day, starting from 00:00:00 (UTC)'),
		).toBeInTheDocument();
	});

	it('renders the evaluation window details for cumulative mode with current month', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentMonth',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						number: '1',
						time: '00:00:00',
						timezone: 'UTC',
					},
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);
		expect(
			screen.getByText('Current month, starting from day 1 at 00:00:00 (UTC)'),
		).toBeInTheDocument();
	});

	it('should be able to change the value in rolling mode with custom timeframe', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'rolling',
					timeframe: 'custom',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						number: '5',
						unit: UniversalYAxisUnit.MINUTES,
					},
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);

		const valueInput = screen.getByPlaceholderText('Enter value');
		fireEvent.change(valueInput, { target: { value: '10' } });
		expect(mockSetEvaluationWindow).toHaveBeenCalledWith({
			type: 'SET_STARTING_AT',
			payload: { ...mockEvaluationWindowState.startingAt, number: '10' },
		});
	});

	it('should be able to change the value in cumulative mode with current hour', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentHour',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						number: '1',
						timezone: 'UTC',
					},
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);

		const selectComponent = screen.getByRole('combobox');
		fireEvent.mouseDown(selectComponent);
		const option = screen.getByText('10');
		fireEvent.click(option);
		expect(mockSetEvaluationWindow).toHaveBeenCalledWith({
			type: 'SET_STARTING_AT',
			payload: {
				...mockEvaluationWindowState.startingAt,
				number: 10,
				timezone: 'UTC',
			},
		});
	});

	it('should be able to change the value in cumulative mode with current day', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentDay',
					startingAt: {
						...mockEvaluationWindowState.startingAt,
						time: '00:00:00',
						timezone: 'UTC',
					},
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);

		const timeInputs = screen.getAllByDisplayValue('00');
		const hoursInput = timeInputs[0];
		fireEvent.change(hoursInput, { target: { value: '10' } });
		expect(mockSetEvaluationWindow).toHaveBeenCalledWith({
			type: 'SET_STARTING_AT',
			payload: {
				...mockEvaluationWindowState.startingAt,
				time: '10:00:00',
				timezone: 'UTC',
			},
		});
	});

	it('should be able to change the value in cumulative mode with current month', () => {
		render(
			<EvaluationWindowDetails
				evaluationWindow={createMockEvaluationWindowState({
					windowType: 'cumulative',
					timeframe: 'currentMonth',
				})}
				setEvaluationWindow={mockSetEvaluationWindow}
			/>,
		);

		const comboboxes = screen.getAllByRole('combobox');
		const daySelectComponent = comboboxes[0];
		fireEvent.mouseDown(daySelectComponent);
		const option = screen.getByText('10');
		fireEvent.click(option);
		expect(mockSetEvaluationWindow).toHaveBeenCalledWith({
			type: 'SET_STARTING_AT',
			payload: { ...mockEvaluationWindowState.startingAt, number: 10 },
		});
	});
});
