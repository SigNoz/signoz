/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';

import * as context from '../../context';
import { INITIAL_EVALUATION_WINDOW_STATE } from '../../context/constants';
import EvaluationSettings from '../EvaluationSettings';

const mockSetEvaluationWindow = jest.fn();
jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
	evaluationWindow: INITIAL_EVALUATION_WINDOW_STATE,
	setEvaluationWindow: mockSetEvaluationWindow,
} as any);

jest.mock('uplot', () => {
	const paths = {
		spline: jest.fn(),
		bars: jest.fn(),
	};
	const uplotMock = jest.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

jest.mock(
	'../AdvancedOptions',
	() =>
		function MockAdvancedOptions(): JSX.Element {
			return <div data-testid="advanced-options">Advanced Options</div>;
		},
);

describe('EvaluationSettings', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should render evaluation settings container', () => {
		render(<EvaluationSettings />);
		expect(screen.getByText('Evaluation settings')).toBeInTheDocument();
	});

	it('should render evaluation alert conditions text', () => {
		render(<EvaluationSettings />);

		expect(
			screen.getByText('Evaluate Alert Conditions over'),
		).toBeInTheDocument();

		const button = screen.getByRole('button');
		expect(button).toBeInTheDocument();
	});

	it('should display correct timeframe text for rolling window', () => {
		render(<EvaluationSettings />);

		expect(screen.getByText('Last 5 minutes')).toBeInTheDocument();
		expect(screen.getByText('Rolling')).toBeInTheDocument();
	});

	it('should display correct timeframe text for cumulative window', () => {
		jest.spyOn(context, 'useCreateAlertState').mockReturnValue({
			evaluationWindow: {
				...INITIAL_EVALUATION_WINDOW_STATE,
				windowType: 'cumulative',
				timeframe: 'currentDay',
			},
		} as any);
		render(<EvaluationSettings />);

		expect(screen.getByText('Current day')).toBeInTheDocument();
		expect(screen.getByText('Cumulative')).toBeInTheDocument();
	});
});
