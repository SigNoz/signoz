import { fireEvent, render, screen } from '@testing-library/react';
import * as alertState from 'container/CreateAlertV2/context';

import AdvancedOptions from '../AdvancedOptions';
import { createMockAlertContextState } from './testUtils';

const mockSetAdvancedOptions = jest.fn();
jest.spyOn(alertState, 'useCreateAlertState').mockReturnValue(
	createMockAlertContextState({
		setAdvancedOptions: mockSetAdvancedOptions,
	}),
);

const ALERT_WHEN_DATA_STOPS_COMING_TEXT = 'Alert when data stops coming';
const MINIMUM_DATA_REQUIRED_TEXT = 'Minimum data required';
const ACCOUNT_FOR_DATA_DELAY_TEXT = 'Account for data delay';

describe('AdvancedOptions', () => {
	it('should render evaluation cadence and the advanced options minimized by default', () => {
		render(<AdvancedOptions />);
		expect(screen.getByText('ADVANCED OPTIONS')).toBeInTheDocument();
		expect(screen.queryByText('How often to check')).not.toBeInTheDocument();
		expect(
			screen.queryByText(ALERT_WHEN_DATA_STOPS_COMING_TEXT),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(MINIMUM_DATA_REQUIRED_TEXT),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(ACCOUNT_FOR_DATA_DELAY_TEXT),
		).not.toBeInTheDocument();
	});

	it('should be able to expand the advanced options', () => {
		render(<AdvancedOptions />);

		expect(
			screen.queryByText(ALERT_WHEN_DATA_STOPS_COMING_TEXT),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(MINIMUM_DATA_REQUIRED_TEXT),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(ACCOUNT_FOR_DATA_DELAY_TEXT),
		).not.toBeInTheDocument();

		const collapse = screen.getByRole('button', { name: /ADVANCED OPTIONS/i });
		fireEvent.click(collapse);

		expect(screen.getByText('How often to check')).toBeInTheDocument();
		expect(screen.getByText('Alert when data stops coming')).toBeInTheDocument();
		expect(screen.getByText('Minimum data required')).toBeInTheDocument();
		expect(screen.getByText('Account for data delay')).toBeInTheDocument();
	});

	it('"Alert when data stops coming" works as expected', () => {
		render(<AdvancedOptions />);

		const collapse = screen.getByRole('button', { name: /ADVANCED OPTIONS/i });
		fireEvent.click(collapse);

		const switches = screen.getAllByRole('switch');
		const alertWhenDataStopsComingSwitch = switches[0];

		fireEvent.click(alertWhenDataStopsComingSwitch);

		const toleranceInput = screen.getByPlaceholderText(
			'Enter tolerance limit...',
		);
		fireEvent.change(toleranceInput, { target: { value: '10' } });

		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_SEND_NOTIFICATION_IF_DATA_IS_MISSING',
			payload: {
				toleranceLimit: 10,
				timeUnit: 'min',
			},
		});
	});

	it('"Minimum data required" works as expected', () => {
		render(<AdvancedOptions />);

		const collapse = screen.getByRole('button', { name: /ADVANCED OPTIONS/i });
		fireEvent.click(collapse);

		const switches = screen.getAllByRole('switch');
		const minimumDataRequiredSwitch = switches[1];

		fireEvent.click(minimumDataRequiredSwitch);

		const minimumDataRequiredInput = screen.getByPlaceholderText(
			'Enter minimum datapoints...',
		);
		fireEvent.change(minimumDataRequiredInput, { target: { value: '10' } });

		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_ENFORCE_MINIMUM_DATAPOINTS',
			payload: {
				minimumDatapoints: 10,
			},
		});
	});

	it('"Account for data delay" works as expected', () => {
		render(<AdvancedOptions />);

		const collapse = screen.getByRole('button', { name: /ADVANCED OPTIONS/i });
		fireEvent.click(collapse);

		const switches = screen.getAllByRole('switch');
		const accountForDataDelaySwitch = switches[2];

		fireEvent.click(accountForDataDelaySwitch);

		const delayInput = screen.getByPlaceholderText('Enter delay...');
		fireEvent.change(delayInput, { target: { value: '10' } });

		expect(mockSetAdvancedOptions).toHaveBeenCalledWith({
			type: 'SET_DELAY_EVALUATION',
			payload: {
				delay: 10,
				timeUnit: 'min',
			},
		});
	});
});
