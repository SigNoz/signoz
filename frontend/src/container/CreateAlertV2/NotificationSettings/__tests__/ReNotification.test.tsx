/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as createAlertContext from 'container/CreateAlertV2/context';

import ReNotification from '../ReNotification';

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

const mockSetNotificationSettings = jest.fn();
jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
	() =>
		({
			notificationSettings: {
				reNotification: {
					enabled: false,
					value: 0,
					unit: 'seconds',
					conditions: [],
				},
			},
			setNotificationSettings: mockSetNotificationSettings,
		} as any),
);

describe('ReNotification', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders the re-notification title and description', () => {
		render(<ReNotification />);

		expect(screen.getByText('Re-notification')).toBeInTheDocument();
		expect(
			screen.getByText(/Send notifications for the alert status periodically/),
		).toBeInTheDocument();
	});

	it('renders switch to enable/disable re-notification', () => {
		render(<ReNotification />);

		const switchElement = screen.getByRole('switch');
		expect(switchElement).toBeInTheDocument();
		expect(switchElement).not.toBeChecked();
	});

	it('toggles re-notification when switch is clicked', async () => {
		const user = userEvent.setup();
		render(<ReNotification />);

		const switchElement = screen.getByRole('switch');
		await user.click(switchElement);

		expect(mockSetNotificationSettings).toHaveBeenCalledWith({
			type: 'SET_RE_NOTIFICATION',
			payload: {
				enabled: true,
				value: 0,
				unit: 'seconds',
				conditions: [],
			},
		});
	});

	it('renders disabled inputs when re-notification is disabled', () => {
		render(<ReNotification />);

		const timeInput = screen.getByPlaceholderText('Enter time interval...');
		const unitSelect = screen.getByText('seconds');

		expect(timeInput).toBeDisabled();
		expect(unitSelect.closest('.ant-select')).toHaveClass('ant-select-disabled');
	});

	it('renders enabled inputs when re-notification is enabled', () => {
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
			() =>
				({
					notificationSettings: {
						reNotification: {
							enabled: true,
							value: 5,
							unit: 'minutes',
							conditions: ['firing'],
						},
					},
					setNotificationSettings: mockSetNotificationSettings,
				} as any),
		);

		render(<ReNotification />);

		const timeInput = screen.getByDisplayValue('5');
		const unitSelect = screen.getByText('minutes');

		expect(timeInput).not.toBeDisabled();
		expect(unitSelect.closest('.ant-select')).not.toHaveClass(
			'ant-select-disabled',
		);
	});

	it('updates time value when input changes', async () => {
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
			() =>
				({
					notificationSettings: {
						reNotification: {
							enabled: true,
							value: 0,
							unit: 'seconds',
							conditions: [],
						},
					},
					setNotificationSettings: mockSetNotificationSettings,
				} as any),
		);

		const user = userEvent.setup();
		render(<ReNotification />);

		const timeInput = screen.getByPlaceholderText('Enter time interval...');
		await user.clear(timeInput);
		await user.type(timeInput, '10');

		expect(mockSetNotificationSettings).toHaveBeenLastCalledWith({
			type: 'SET_RE_NOTIFICATION',
			payload: {
				enabled: true,
				value: 1, // parseInt of '1' from the last character typed
				unit: 'seconds',
				conditions: [],
			},
		});
	});
});
