import { fireEvent, render, screen, within } from '@testing-library/react';
import { FeatureKeys } from 'constants/features';
import { getAppContextMockState } from 'container/RoutingPolicies/__tests__/testUtils';
import * as appHooks from 'providers/App/App';
import { AlertTypes } from 'types/api/alerts/alertTypes';

import SelectAlertType from '..';

const useAppContextSpy = jest.spyOn(appHooks, 'useAppContext');

describe('SelectAlertType', () => {
	const mockOnSelect = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useAppContextSpy.mockReturnValue(getAppContextMockState());
	});

	it('should render all alert type options when anomaly detection is enabled', () => {
		useAppContextSpy.mockReturnValue({
			...getAppContextMockState({}),
			featureFlags: [
				{
					name: FeatureKeys.ANOMALY_DETECTION,
					active: true,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
			],
		});

		render(<SelectAlertType onSelect={mockOnSelect} />);

		expect(screen.getByText('metric_based_alert')).toBeInTheDocument();
		expect(screen.getByText('log_based_alert')).toBeInTheDocument();
		expect(screen.getByText('traces_based_alert')).toBeInTheDocument();
		expect(screen.getByText('exceptions_based_alert')).toBeInTheDocument();
		expect(screen.getByText('ai_traces_based_alert')).toBeInTheDocument();
		expect(screen.getByText('anomaly_based_alert')).toBeInTheDocument();
	});

	it('should render all alert type options except anomaly based alert when anomaly detection is disabled', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);

		expect(screen.getByText('metric_based_alert')).toBeInTheDocument();
		expect(screen.getByText('log_based_alert')).toBeInTheDocument();
		expect(screen.getByText('traces_based_alert')).toBeInTheDocument();
		expect(screen.getByText('exceptions_based_alert')).toBeInTheDocument();
		expect(screen.getByText('ai_traces_based_alert')).toBeInTheDocument();
		expect(screen.queryByText('anomaly_based_alert')).not.toBeInTheDocument();
	});

	it('should call onSelect with metrics based alert type', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('metric_based_alert'));

		expect(mockOnSelect).toHaveBeenCalledWith(
			AlertTypes.METRICS_BASED_ALERT,
			false,
		);
	});

	it('should call onSelect with anomaly based alert type', () => {
		useAppContextSpy.mockReturnValue({
			...getAppContextMockState({}),
			featureFlags: [
				{
					name: FeatureKeys.ANOMALY_DETECTION,
					active: true,
					usage: 0,
					usage_limit: -1,
					route: '',
				},
			],
		});

		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('anomaly_based_alert'));

		expect(mockOnSelect).toHaveBeenCalledWith(
			AlertTypes.ANOMALY_BASED_ALERT,
			false,
		);
	});

	it('should call onSelect with log based alert type', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('log_based_alert'));

		expect(mockOnSelect).toHaveBeenCalledWith(AlertTypes.LOGS_BASED_ALERT, false);
	});

	it('should call onSelect with traces based alert type', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('traces_based_alert'));

		expect(mockOnSelect).toHaveBeenCalledWith(
			AlertTypes.TRACES_BASED_ALERT,
			false,
		);
	});

	it('should call onSelect with exceptions based alert type', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('exceptions_based_alert'));

		expect(mockOnSelect).toHaveBeenCalledWith(
			AlertTypes.EXCEPTIONS_BASED_ALERT,
			false,
		);
	});

	it('should call onSelect with AI traces based alert type', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('ai_traces_based_alert'));

		expect(mockOnSelect).toHaveBeenCalledWith(
			AlertTypes.AI_TRACES_BASED_ALERT,
			false,
		);
	});

	it('should ask for a new tab when the AI traces card is modifier-clicked', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		fireEvent.click(screen.getByText('ai_traces_based_alert'), { metaKey: true });

		expect(mockOnSelect).toHaveBeenCalledWith(
			AlertTypes.AI_TRACES_BASED_ALERT,
			true,
		);
	});

	it('should mark the AI traces card as beta', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		const card = screen.getByTestId(
			`alert-type-card-${AlertTypes.AI_TRACES_BASED_ALERT}`,
		);

		expect(within(card).getByText('Beta')).toBeInTheDocument();
	});

	it('should open the docs without selecting the AI traces card', () => {
		const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
		render(<SelectAlertType onSelect={mockOnSelect} />);
		const card = screen.getByTestId(
			`alert-type-card-${AlertTypes.AI_TRACES_BASED_ALERT}`,
		);
		fireEvent.click(
			within(card).getByText('Click here to see how to create a sample alert.'),
		);

		expect(openSpy).toHaveBeenCalledWith(
			expect.stringContaining('/docs/alerts-management/trace-based-alerts/'),
			'_blank',
		);
		expect(mockOnSelect).not.toHaveBeenCalled();
		openSpy.mockRestore();
	});

	it('should place the AI traces card after the traces card', () => {
		render(<SelectAlertType onSelect={mockOnSelect} />);
		const order = screen
			.getAllByTestId(/^alert-type-card-/)
			.map((card) => card.getAttribute('data-testid'));

		expect(order).toStrictEqual([
			`alert-type-card-${AlertTypes.METRICS_BASED_ALERT}`,
			`alert-type-card-${AlertTypes.LOGS_BASED_ALERT}`,
			`alert-type-card-${AlertTypes.TRACES_BASED_ALERT}`,
			`alert-type-card-${AlertTypes.AI_TRACES_BASED_ALERT}`,
			`alert-type-card-${AlertTypes.EXCEPTIONS_BASED_ALERT}`,
		]);
	});
});
