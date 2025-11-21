/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as createAlertContext from 'container/CreateAlertV2/context';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';

import NotificationMessage from '../NotificationMessage';

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
const initialNotificationSettingsState = createMockAlertContextState()
	.notificationSettings;
jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
	createMockAlertContextState({
		notificationSettings: {
			...initialNotificationSettingsState,
			description: '',
		},
		setNotificationSettings: mockSetNotificationSettings,
	}),
);

describe('NotificationMessage', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders textarea with message and placeholder', () => {
		render(<NotificationMessage />);
		expect(screen.getByText('Notification Message')).toBeInTheDocument();
		const textarea = screen.getByPlaceholderText('Enter notification message...');
		expect(textarea).toBeInTheDocument();
	});

	it('updates notification settings when textarea value changes', async () => {
		const user = userEvent.setup();
		render(<NotificationMessage />);
		const textarea = screen.getByPlaceholderText('Enter notification message...');
		await user.type(textarea, 'x');
		expect(mockSetNotificationSettings).toHaveBeenLastCalledWith({
			type: 'SET_DESCRIPTION',
			payload: 'x',
		});
	});

	it('displays existing description value', () => {
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
			() =>
				({
					notificationSettings: {
						description: 'Existing message',
					},
					setNotificationSettings: mockSetNotificationSettings,
				} as any),
		);

		render(<NotificationMessage />);

		const textarea = screen.getByDisplayValue('Existing message');
		expect(textarea).toBeInTheDocument();
	});
});
