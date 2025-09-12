/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as createAlertContext from 'container/CreateAlertV2/context';

import MultipleNotifications from '../MultipleNotifications';

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

jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

const TEST_QUERY = 'test-query';

const mockSetNotificationSettings = jest.fn();
const mockUseQueryBuilder = {
	currentQuery: {
		builder: {
			queryData: [
				{
					queryName: TEST_QUERY,
					groupBy: [{ key: 'service' }, { key: 'environment' }],
				},
			],
		},
	},
};

jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
	() =>
		({
			notificationSettings: {
				multipleNotifications: {
					enabled: false,
					value: '',
				},
			},
			thresholdState: {
				selectedQuery: TEST_QUERY,
			},
			setNotificationSettings: mockSetNotificationSettings,
		} as any),
);

describe('MultipleNotifications', () => {
	const { useQueryBuilder } = jest.requireMock(
		'hooks/queryBuilder/useQueryBuilder',
	);

	beforeEach(() => {
		jest.clearAllMocks();
		useQueryBuilder.mockReturnValue(mockUseQueryBuilder);
	});

	it('renders single and multiple notification options', () => {
		render(<MultipleNotifications />);

		expect(screen.getByText('Single Alert Notification')).toBeInTheDocument();
		expect(screen.getByText('Multiple Alert Notifications')).toBeInTheDocument();
	});

	it('renders descriptions for both options', () => {
		render(<MultipleNotifications />);

		expect(
			screen.getByText(/Send a single alert notification when the query meets/),
		).toBeInTheDocument();
		expect(screen.getByText(/Send a notification for each/)).toBeInTheDocument();
	});

	it('renders select dropdown for multiple notifications', () => {
		render(<MultipleNotifications />);

		const selectElement = screen.getByText('SELECT VALUE');
		expect(selectElement).toBeInTheDocument();
	});

	it('switches to multiple notifications when radio is clicked', async () => {
		const user = userEvent.setup();
		render(<MultipleNotifications />);

		const multipleRadio = screen.getByDisplayValue('multiple');
		await user.click(multipleRadio);

		expect(mockSetNotificationSettings).toHaveBeenCalledWith({
			type: 'SET_MULTIPLE_NOTIFICATIONS',
			payload: {
				enabled: true,
				value: 'service', // First option from groupBy
			},
		});
	});

	it('switches to single notification when radio is clicked', async () => {
		// First enable multiple notifications, then switch back to single
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockImplementation(
			() =>
				({
					notificationSettings: {
						multipleNotifications: {
							enabled: true,
							value: 'service',
						},
					},
					thresholdState: {
						selectedQuery: TEST_QUERY,
					},
					setNotificationSettings: mockSetNotificationSettings,
				} as any),
		);

		const user = userEvent.setup();
		render(<MultipleNotifications />);

		const singleRadio = screen.getByDisplayValue('single');
		await user.click(singleRadio);

		expect(mockSetNotificationSettings).toHaveBeenCalledWith({
			type: 'SET_MULTIPLE_NOTIFICATIONS',
			payload: {
				enabled: false,
				value: '',
			},
		});
	});

	it('disables radio options when no groupBy options are available', () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: 'test-query',
							groupBy: [],
						},
					],
				},
			},
		});

		render(<MultipleNotifications />);

		const singleRadio = screen.getByDisplayValue('single');
		const multipleRadio = screen.getByDisplayValue('multiple');

		expect(singleRadio).toBeDisabled();
		expect(multipleRadio).toBeDisabled();
	});
});
