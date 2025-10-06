import { fireEvent, render, screen } from '@testing-library/react';
import * as createAlertContext from 'container/CreateAlertV2/context';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';

import NotificationSettings from '../NotificationSettings';

jest.mock(
	'container/CreateAlertV2/NotificationSettings/MultipleNotifications',
	() => ({
		__esModule: true,
		default: (): JSX.Element => (
			<div data-testid="multiple-notifications">MultipleNotifications</div>
		),
	}),
);
jest.mock(
	'container/CreateAlertV2/NotificationSettings/NotificationMessage',
	() => ({
		__esModule: true,
		default: (): JSX.Element => (
			<div data-testid="notification-message">NotificationMessage</div>
		),
	}),
);

jest.mock('container/CreateAlertV2/utils', () => ({
	...jest.requireActual('container/CreateAlertV2/utils'),
}));

const initialNotificationSettings = createMockAlertContextState()
	.notificationSettings;
const mockSetNotificationSettings = jest.fn();
jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
	createMockAlertContextState({
		setNotificationSettings: mockSetNotificationSettings,
	}),
);

const REPEAT_NOTIFICATIONS_TEXT = 'Repeat notifications';
const ENTER_TIME_INTERVAL_TEXT = 'Enter time interval...';

describe('NotificationSettings', () => {
	it('renders the notification settings tab with step number 3 and default values', () => {
		render(<NotificationSettings />);
		expect(screen.getByText('Notification settings')).toBeInTheDocument();
		expect(screen.getByText('3')).toBeInTheDocument();
		expect(screen.getByTestId('multiple-notifications')).toBeInTheDocument();
		expect(screen.getByTestId('notification-message')).toBeInTheDocument();
		expect(screen.getByText(REPEAT_NOTIFICATIONS_TEXT)).toBeInTheDocument();
		expect(
			screen.getByText(
				'Send periodic notifications while the alert condition remains active.',
			),
		).toBeInTheDocument();
	});

	describe('Repeat notifications', () => {
		it('renders the repeat notifications with inputs hidden when the repeat notifications switch is off', () => {
			render(<NotificationSettings />);
			expect(screen.getByText(REPEAT_NOTIFICATIONS_TEXT)).toBeInTheDocument();
			expect(screen.getByText('Every')).not.toBeVisible();
			expect(
				screen.getByPlaceholderText(ENTER_TIME_INTERVAL_TEXT),
			).not.toBeVisible();
		});

		it('toggles the repeat notifications switch and shows the inputs', () => {
			render(<NotificationSettings />);
			expect(screen.getByText(REPEAT_NOTIFICATIONS_TEXT)).toBeInTheDocument();

			expect(screen.getByText('Every')).not.toBeVisible();
			expect(
				screen.getByPlaceholderText(ENTER_TIME_INTERVAL_TEXT),
			).not.toBeVisible();

			fireEvent.click(screen.getByRole('switch'));

			expect(screen.getByText('Every')).toBeVisible();
			expect(screen.getByPlaceholderText(ENTER_TIME_INTERVAL_TEXT)).toBeVisible();
		});

		it('updates state when the repeat notifications input is changed', () => {
			jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
				createMockAlertContextState({
					setNotificationSettings: mockSetNotificationSettings,
					notificationSettings: {
						...initialNotificationSettings,
						reNotification: {
							...initialNotificationSettings.reNotification,
							enabled: true,
						},
					},
				}),
			);

			render(<NotificationSettings />);
			expect(screen.getByText(REPEAT_NOTIFICATIONS_TEXT)).toBeInTheDocument();

			fireEvent.change(screen.getByPlaceholderText(ENTER_TIME_INTERVAL_TEXT), {
				target: { value: '13' },
			});

			expect(mockSetNotificationSettings).toHaveBeenLastCalledWith({
				type: 'SET_RE_NOTIFICATION',
				payload: {
					enabled: true,
					value: 13,
					unit: 'min',
					conditions: [],
				},
			});
		});
	});
});
