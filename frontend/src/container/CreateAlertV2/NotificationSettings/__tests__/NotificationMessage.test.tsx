import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as createAlertContext from 'container/CreateAlertV2/context';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';

import NotificationMessage from '../NotificationMessage';

vi.mock('uplot', () => {
	const paths = {
		spline: vi.fn(),
		bars: vi.fn(),
	};
	const uplotMock = vi.fn(() => ({
		paths,
	}));
	return {
		paths,
		default: uplotMock,
	};
});

const mockSetNotificationSettings = vi.fn();
const initialNotificationSettingsState =
	createMockAlertContextState().notificationSettings;

// Browser mode has no SSR transform, so a real ESM namespace is frozen and
// `vi.spyOn` on it throws. `vi.mock(..., { spy: true })` routes the module
// through the mocker instead, which works in both environments.
vi.mock('container/CreateAlertV2/context', { spy: true });

vi.mocked(createAlertContext.useCreateAlertState).mockReturnValue(
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
		vi.clearAllMocks();
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
		vi.mocked(createAlertContext.useCreateAlertState).mockImplementation(
			() =>
				({
					notificationSettings: {
						description: 'Existing message',
					},
					setNotificationSettings: mockSetNotificationSettings,
				}) as any,
		);

		render(<NotificationMessage />);

		const textarea = screen.getByDisplayValue('Existing message');
		expect(textarea).toBeInTheDocument();
	});
});
