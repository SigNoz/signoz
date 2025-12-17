/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as createAlertContext from 'container/CreateAlertV2/context';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';

import NotificationSummary from '../NotificationSummary';

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
			summary: '',
		},
		setNotificationSettings: mockSetNotificationSettings,
	}),
);

describe('NotificationSummary', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('renders textarea with message and placeholder', () => {
		render(<NotificationSummary />);
		expect(screen.getByText('Notification Summary')).toBeInTheDocument();
		const textarea = screen.getByPlaceholderText('Enter notification summary...');
		expect(textarea).toBeInTheDocument();
	});

	it('updates notification summary when textarea value changes', async () => {
		const user = userEvent.setup();
		render(<NotificationSummary />);
		const textarea = screen.getByPlaceholderText('Enter notification summary...');
		await user.type(textarea, 'x');
		expect(mockSetNotificationSettings).toHaveBeenLastCalledWith({
			type: 'SET_SUMMARY',
			payload: 'x',
		});
	});

	it('displays existing description value', () => {
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
			() =>
				({
					notificationSettings: {
						summary: 'Existing summary',
					},
					setNotificationSettings: mockSetNotificationSettings,
				} as any),
		);

		render(<NotificationSummary />);

		const textarea = screen.getByDisplayValue('Existing summary');
		expect(textarea).toBeInTheDocument();
	});
});
