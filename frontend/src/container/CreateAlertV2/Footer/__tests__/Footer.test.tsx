import { fireEvent, render, screen } from '@testing-library/react';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from 'container/CreateAlertV2/context/types';
import { createMockAlertContextState } from 'container/CreateAlertV2/EvaluationSettings/__tests__/testUtils';

import * as createAlertState from '../../context';
import Footer from '../Footer';

// Mock the hooks used by Footer component
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));

jest.mock('hooks/useSafeNavigate', () => ({
	useSafeNavigate: jest.fn(),
}));

const mockCreateAlertRule = jest.fn();
const mockTestAlertRule = jest.fn();
const mockUpdateAlertRule = jest.fn();
const mockDiscardAlertRule = jest.fn();

// Import the mocked hooks
const { useQueryBuilder } = jest.requireMock(
	'hooks/queryBuilder/useQueryBuilder',
);
const { useSafeNavigate } = jest.requireMock('hooks/useSafeNavigate');

const mockAlertContextState = createMockAlertContextState({
	createAlertRule: mockCreateAlertRule,
	testAlertRule: mockTestAlertRule,
	updateAlertRule: mockUpdateAlertRule,
	discardAlertRule: mockDiscardAlertRule,
	alertState: {
		name: 'Test Alert',
		labels: {},
		yAxisUnit: undefined,
	},
	thresholdState: {
		selectedQuery: 'A',
		operator: AlertThresholdOperator.ABOVE_BELOW,
		matchType: AlertThresholdMatchType.AT_LEAST_ONCE,
		evaluationWindow: '5m0s',
		algorithm: 'standard',
		seasonality: 'hourly',
		thresholds: [
			{
				id: '1',
				label: 'CRITICAL',
				thresholdValue: 0,
				recoveryThresholdValue: null,
				unit: '',
				channels: ['test-channel'],
				color: '#ff0000',
			},
		],
	},
});

jest
	.spyOn(createAlertState, 'useCreateAlertState')
	.mockReturnValue(mockAlertContextState);

const SAVE_ALERT_RULE_TEXT = 'Save Alert Rule';
const TEST_NOTIFICATION_TEXT = 'Test Notification';
const DISCARD_TEXT = 'Discard';

const LOADER_ICON_SELECTOR = 'svg.lucide-loader';
const CHECK_ICON_SELECTOR = 'svg.lucide-check';
const PLAY_ICON_SELECTOR = 'svg.lucide-play';

describe('Footer', () => {
	beforeEach(() => {
		useQueryBuilder.mockReturnValue({
			currentQuery: {
				builder: {
					queryData: [],
					queryFormulas: [],
				},
				promql: [],
				clickhouse_sql: [],
				queryType: 'builder',
			},
		});

		useSafeNavigate.mockReturnValue({
			safeNavigate: jest.fn(),
		});
	});

	it('should render the component with 3 buttons', () => {
		render(<Footer />);
		expect(screen.getByText(SAVE_ALERT_RULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(TEST_NOTIFICATION_TEXT)).toBeInTheDocument();
		expect(screen.getByText(DISCARD_TEXT)).toBeInTheDocument();
	});

	it('discard action works correctly', () => {
		render(<Footer />);
		fireEvent.click(screen.getByText(DISCARD_TEXT));
		expect(mockDiscardAlertRule).toHaveBeenCalled();
	});

	it('save alert rule action works correctly', () => {
		render(<Footer />);
		fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
		expect(mockCreateAlertRule).toHaveBeenCalled();
	});

	it('update alert rule action works correctly', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isEditMode: true,
		});
		render(<Footer />);
		fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
		expect(mockUpdateAlertRule).toHaveBeenCalled();
	});

	it('test notification action works correctly', () => {
		render(<Footer />);
		fireEvent.click(screen.getByText(TEST_NOTIFICATION_TEXT));
		expect(mockTestAlertRule).toHaveBeenCalled();
	});

	it('all buttons are disabled when creating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isCreatingAlertRule: true,
		});
		render(<Footer />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toBeDisabled();
		expect(screen.getByRole('button', { name: /discard/i })).toBeDisabled();
	});

	it('all buttons are disabled when updating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isUpdatingAlertRule: true,
		});
		render(<Footer />);

		// Target the button elements directly instead of the text spans inside them
		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toBeDisabled();
		expect(screen.getByRole('button', { name: /discard/i })).toBeDisabled();
	});

	it('all buttons are disabled when testing alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isTestingAlertRule: true,
		});
		render(<Footer />);

		// Target the button elements directly instead of the text spans inside them
		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toBeDisabled();
		expect(screen.getByRole('button', { name: /discard/i })).toBeDisabled();
	});

	it('create and test buttons are disabled when alert name is missing', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			alertState: {
				...mockAlertContextState.alertState,
				name: '',
			},
		});
		render(<Footer />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toBeDisabled();
	});

	it('create and test buttons are disabled when notifcation channels are missing and routing policies are disabled', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			notificationSettings: {
				...mockAlertContextState.notificationSettings,
				routingPolicies: false,
			},
			thresholdState: {
				...mockAlertContextState.thresholdState,
				thresholds: [
					{
						...mockAlertContextState.thresholdState.thresholds[0],
						channels: [],
					},
				],
			},
		});

		render(<Footer />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toBeDisabled();
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toBeDisabled();
	});

	it('buttons are enabled even with no notification channels when routing policies are enabled', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			notificationSettings: {
				...mockAlertContextState.notificationSettings,
				routingPolicies: true,
			},
			thresholdState: {
				...mockAlertContextState.thresholdState,
				thresholds: [
					{
						...mockAlertContextState.thresholdState.thresholds[0],
						channels: [],
					},
				],
			},
		});

		render(<Footer />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toBeEnabled();
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toBeEnabled();
		expect(screen.getByRole('button', { name: /discard/i })).toBeEnabled();
	});

	it('should show loader icon on test notification button when testing alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isTestingAlertRule: true,
		});
		const { container } = render(<Footer />);

		// When testing alert rule, the play icon is replaced with a loader icon
		const playIconForTestNotificationButton = container.querySelector(
			PLAY_ICON_SELECTOR,
		);
		expect(playIconForTestNotificationButton).not.toBeInTheDocument();

		const loaderIconForTestNotificationButton = container.querySelector(
			LOADER_ICON_SELECTOR,
		);
		expect(loaderIconForTestNotificationButton).toBeInTheDocument();
	});

	it('should not show check icon on save alert rule button when updating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isUpdatingAlertRule: true,
		});
		const { container } = render(<Footer />);

		// When updating alert rule, the check icon is replaced with a loader icon
		const checkIconForSaveAlertRuleButton = container.querySelector(
			CHECK_ICON_SELECTOR,
		);
		expect(checkIconForSaveAlertRuleButton).not.toBeInTheDocument();

		const loaderIconForSaveAlertRuleButton = container.querySelector(
			LOADER_ICON_SELECTOR,
		);
		expect(loaderIconForSaveAlertRuleButton).toBeInTheDocument();
	});

	it('should not show check icon on save alert rule button when creating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isCreatingAlertRule: true,
		});
		const { container } = render(<Footer />);

		// When creating alert rule, the check icon is replaced with a loader icon
		const checkIconForSaveAlertRuleButton = container.querySelector(
			CHECK_ICON_SELECTOR,
		);
		expect(checkIconForSaveAlertRuleButton).not.toBeInTheDocument();

		const loaderIconForSaveAlertRuleButton = container.querySelector(
			LOADER_ICON_SELECTOR,
		);
		expect(loaderIconForSaveAlertRuleButton).toBeInTheDocument();
	});
});
