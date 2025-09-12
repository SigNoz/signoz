import { render, screen } from '@testing-library/react';
import * as createAlertContext from 'container/CreateAlertV2/context';

import NotificationSettings from '../NotificationSettings';

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
				multipleNotifications: {
					enabled: false,
					value: '',
				},
				reNotification: {
					enabled: false,
					value: 0,
					unit: 'seconds',
					conditions: [],
				},
				description: '',
			},
			setNotificationSettings: mockSetNotificationSettings,
			thresholdState: {
				selectedQuery: '',
				evaluationWindow: '',
				algorithm: '',
				seasonality: '',
			},
		} as any),
);

jest.mock('../NotificationMessage', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="notification-message">NotificationMessage</div>
	),
}));
jest.mock('../MultipleNotifications', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="multiple-notifications">MultipleNotifications</div>
	),
}));
jest.mock('../ReNotification', () => ({
	__esModule: true,
	default: (): JSX.Element => (
		<div data-testid="re-notification">ReNotification</div>
	),
}));

describe('NotificationSettings', () => {
	it('should render the sub components', () => {
		render(<NotificationSettings />);
		expect(screen.getByText('Notification settings')).toBeInTheDocument();
		expect(screen.getByTestId('notification-message')).toBeInTheDocument();
		expect(screen.getByTestId('multiple-notifications')).toBeInTheDocument();
		expect(screen.getByTestId('re-notification')).toBeInTheDocument();
	});
});
