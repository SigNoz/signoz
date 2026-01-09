/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALL_SELECTED_VALUE } from 'container/CreateAlertV2/constants';
import * as createAlertContext from 'container/CreateAlertV2/context';
import {
	INITIAL_ALERT_THRESHOLD_STATE,
	INITIAL_NOTIFICATION_SETTINGS_STATE,
} from 'container/CreateAlertV2/context/constants';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';

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
const TEST_QUERY_2 = 'test-query-2';
const TEST_GROUP_BY_FIELDS = [{ key: 'service' }, { key: 'environment' }];
const TRUE = 'true';
const FALSE = 'false';
const COMBOBOX_ROLE = 'combobox';
const ARIA_DISABLED_ATTR = 'aria-disabled';
const mockSetNotificationSettings = jest.fn();
const mockUseQueryBuilder = {
	currentQuery: {
		builder: {
			queryData: [
				{
					queryName: TEST_QUERY,
					groupBy: [],
				},
			],
		},
	},
};

const initialAlertThresholdState = createMockAlertContextState().thresholdState;
jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
	createMockAlertContextState({
		thresholdState: {
			...initialAlertThresholdState,
			selectedQuery: TEST_QUERY,
		},
		setNotificationSettings: mockSetNotificationSettings,
	}),
);

describe('MultipleNotifications', () => {
	const { useQueryBuilder } = jest.requireMock(
		'hooks/queryBuilder/useQueryBuilder',
	);

	beforeEach(() => {
		jest.clearAllMocks();
		useQueryBuilder.mockReturnValue(mockUseQueryBuilder);
	});

	it('should render the multiple notifications component with no grouping fields and disabled input by default', () => {
		render(<MultipleNotifications />);
		expect(screen.getByText('Group alerts by')).toBeInTheDocument();
		expect(
			screen.getByText(
				'Combine alerts with the same field values into a single notification.',
			),
		).toBeInTheDocument();
		expect(screen.getByText('No grouping fields available')).toBeInTheDocument();
		const select = screen.getByRole(COMBOBOX_ROLE);
		expect(select).toHaveAttribute(ARIA_DISABLED_ATTR, TRUE);
	});

	it('should render the multiple notifications component with grouping fields and enabled input when space aggregation options are set', () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: TEST_QUERY,
							groupBy: TEST_GROUP_BY_FIELDS,
						},
					],
				},
			},
		});
		render(<MultipleNotifications />);

		expect(
			screen.getByText(
				'Empty = all matching alerts combined into one notification',
			),
		).toBeInTheDocument();
		const select = screen.getByRole(COMBOBOX_ROLE);
		expect(select).toHaveAttribute(ARIA_DISABLED_ATTR, FALSE);
	});

	it('should render the multiple notifications component with grouping fields and enabled input when space aggregation options are set and multiple notifications are enabled', () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: TEST_QUERY,
							groupBy: TEST_GROUP_BY_FIELDS,
						},
					],
				},
			},
		});
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
			createMockAlertContextState({
				thresholdState: {
					...INITIAL_ALERT_THRESHOLD_STATE,
					selectedQuery: TEST_QUERY,
				},
				notificationSettings: {
					...INITIAL_NOTIFICATION_SETTINGS_STATE,
					multipleNotifications: ['service', 'environment'],
				},
				setNotificationSettings: mockSetNotificationSettings,
			}),
		);

		render(<MultipleNotifications />);

		expect(
			screen.getByText('Alerts with same service, environment will be grouped'),
		).toBeInTheDocument();
		const select = screen.getByRole(COMBOBOX_ROLE);
		expect(select).toHaveAttribute(ARIA_DISABLED_ATTR, FALSE);
	});

	it('should render unique group by options from all queries', async () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: 'test-query-1',
							groupBy: [{ key: 'http.status_code' }],
						},
						{
							queryName: TEST_QUERY_2,
							groupBy: [{ key: 'service' }],
						},
					],
				},
			},
		});

		render(<MultipleNotifications />);

		const select = screen.getByRole(COMBOBOX_ROLE);
		await userEvent.click(select);

		expect(
			screen.getByRole('option', { name: 'http.status_code' }),
		).toBeInTheDocument();
	});

	it('selecting the "all" option shows correct group by description', () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: TEST_QUERY_2,
							groupBy: [{ key: 'service' }],
						},
					],
				},
			},
		});
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
			createMockAlertContextState({
				notificationSettings: {
					...INITIAL_NOTIFICATION_SETTINGS_STATE,
					multipleNotifications: [ALL_SELECTED_VALUE],
				},
			}),
		);

		render(<MultipleNotifications />);

		expect(
			screen.getByText('All = grouping of alerts is disabled'),
		).toBeInTheDocument();
	});

	it('selecting "all" option should disable selection of other options', async () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: TEST_QUERY_2,
							groupBy: [{ key: 'service' }],
						},
					],
				},
			},
		});

		render(<MultipleNotifications />);

		const select = screen.getByRole(COMBOBOX_ROLE);
		await userEvent.click(select);

		const serviceOption = screen.getAllByTestId(
			'multiple-notifications-select-option',
		);
		expect(serviceOption).toHaveLength(2);
		expect(serviceOption[0]).not.toHaveClass('ant-select-item-option-disabled');
		expect(serviceOption[1]).toHaveClass('ant-select-item-option-disabled');
	});

	it('selecting "all" option should remove all other selected options', async () => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [
						{
							queryName: TEST_QUERY_2,
							groupBy: [{ key: 'service' }],
						},
					],
				},
			},
		});
		jest.spyOn(createAlertContext, 'useCreateAlertState').mockReturnValue(
			createMockAlertContextState({
				notificationSettings: {
					...INITIAL_NOTIFICATION_SETTINGS_STATE,
					multipleNotifications: ['service'],
				},
				setNotificationSettings: mockSetNotificationSettings,
			}),
		);

		render(<MultipleNotifications />);
		const select = screen.getByRole(COMBOBOX_ROLE);
		await userEvent.click(select);

		const serviceOption = screen.getAllByTestId(
			'multiple-notifications-select-option',
		);
		expect(serviceOption).toHaveLength(2);
		await userEvent.click(serviceOption[0]);
		expect(mockSetNotificationSettings).toHaveBeenCalledWith({
			type: 'SET_MULTIPLE_NOTIFICATIONS',
			payload: [ALL_SELECTED_VALUE],
		});
	});
});
