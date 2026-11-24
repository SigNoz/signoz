import { act, fireEvent, render, screen } from 'tests/test-utils';
import {
	AlertThresholdMatchType,
	AlertThresholdOperator,
} from 'container/CreateAlert/context/types';
import { createMockAlertContextState } from 'container/CreateAlert/EvaluationSettings/__tests__/testUtils';

import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';
import { buildNotificationChannelAttachPermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { mockUseAuthZDeny } from 'lib/authz/utils/authz-test-utils';

import * as createAlertState from '../../context';
import Footer from '../Footer';
import MockQueryClientProvider from 'providers/test/MockQueryClientProvider';

// Mock the hooks used by Footer component
jest.mock('hooks/queryBuilder/useQueryBuilder', () => ({
	useQueryBuilder: jest.fn(),
}));
const mockShowErrorModal = jest.fn();
jest.mock('providers/ErrorModalProvider', () => ({
	...jest.requireActual('providers/ErrorModalProvider'),
	useErrorModal: (): { showErrorModal: jest.Mock } => ({
		showErrorModal: mockShowErrorModal,
	}),
}));

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');
jest.mock('hooks/notificationChannels/useChannelOptions');

const CHANNELS = [
	{ id: 'ch-test', name: 'test-channel' },
	{ id: 'ch-other', name: 'other-channel' },
];

const deny = (...permissions: BrandedPermission[]): void => {
	jest.mocked(useAuthZ).mockImplementation(mockUseAuthZDeny(...permissions));
};

const mockChannels = (isLoading = false): void => {
	jest.mocked(useChannelOptions).mockReturnValue({
		data: isLoading ? [] : CHANNELS,
		isLoading,
	} as unknown as ReturnType<typeof useChannelOptions>);
};

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

const WrappedFooter = (): JSX.Element => (
	<MockQueryClientProvider>
		<Footer />
	</MockQueryClientProvider>
);

jest
	.spyOn(createAlertState, 'useCreateAlertState')
	.mockReturnValue(mockAlertContextState);

const SAVE_ALERT_RULE_TEXT = 'Save Alert Rule';
const TEST_NOTIFICATION_TEXT = 'Test Notification';
const DISCARD_TEXT = 'Discard';

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
		deny();
		mockChannels();
	});

	it('should render the component with 3 buttons', () => {
		render(<WrappedFooter />);
		expect(screen.getByText(SAVE_ALERT_RULE_TEXT)).toBeInTheDocument();
		expect(screen.getByText(TEST_NOTIFICATION_TEXT)).toBeInTheDocument();
		expect(screen.getByText(DISCARD_TEXT)).toBeInTheDocument();
	});

	it('discard action works correctly', () => {
		render(<WrappedFooter />);
		fireEvent.click(screen.getByText(DISCARD_TEXT));
		expect(mockDiscardAlertRule).toHaveBeenCalled();
	});

	it('save alert rule action works correctly', () => {
		render(<WrappedFooter />);
		fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
		expect(mockCreateAlertRule).toHaveBeenCalled();
	});

	it('update alert rule action works correctly', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isEditMode: true,
		});
		render(<WrappedFooter />);
		fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
		expect(mockUpdateAlertRule).toHaveBeenCalled();
	});

	it('test notification action works correctly', () => {
		render(<WrappedFooter />);
		fireEvent.click(screen.getByText(TEST_NOTIFICATION_TEXT));
		expect(mockTestAlertRule).toHaveBeenCalled();
	});

	it('all buttons are disabled when creating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isCreatingAlertRule: true,
		});
		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByRole('button', { name: /discard/i })).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('all buttons are disabled when updating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isUpdatingAlertRule: true,
		});
		render(<WrappedFooter />);

		// Target the button elements directly instead of the text spans inside them
		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByRole('button', { name: /discard/i })).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('all buttons are disabled when testing alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isTestingAlertRule: true,
		});
		render(<WrappedFooter />);

		// Target the button elements directly instead of the text spans inside them
		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByRole('button', { name: /discard/i })).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('create and test buttons are disabled when alert name is missing', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			alertState: {
				...mockAlertContextState.alertState,
				name: '',
			},
		});
		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toHaveAttribute('aria-disabled', 'true');
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

		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toHaveAttribute('aria-disabled', 'true');
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

		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).not.toHaveAttribute('aria-disabled', 'true');
		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).not.toHaveAttribute('aria-disabled', 'true');
		expect(screen.getByRole('button', { name: /discard/i })).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('should show loading state on test notification button when testing alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isTestingAlertRule: true,
		});
		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /test notification/i }),
		).toHaveAttribute('aria-busy', 'true');
	});

	it('should show loading state on save alert rule button when updating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isUpdatingAlertRule: true,
		});
		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-busy', 'true');
	});

	it('should show loading state on save alert rule button when creating alert rule', () => {
		jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValueOnce({
			...mockAlertContextState,
			isCreatingAlertRule: true,
		});
		render(<WrappedFooter />);

		expect(
			screen.getByRole('button', { name: /save alert rule/i }),
		).toHaveAttribute('aria-busy', 'true');
	});

	describe('authz', () => {
		const RULE_ID = 'rule-1';
		const SAVE = 'save-alert-rule-button';
		const TEST = 'test-notification-button';

		const renderEdit = (savedChannels: string[]): void => {
			jest.spyOn(createAlertState, 'useCreateAlertState').mockReturnValue({
				...mockAlertContextState,
				isEditMode: true,
				ruleId: RULE_ID,
				savedChannels,
			});
			render(<WrappedFooter />);
		};

		afterEach(() => {
			jest
				.spyOn(createAlertState, 'useCreateAlertState')
				.mockReturnValue(mockAlertContextState);
		});

		it('locks Save and Test without create, naming it', () => {
			deny(RuleCreatePermission);
			render(<WrappedFooter />);

			for (const testId of [SAVE, TEST]) {
				expect(screen.getByTestId(testId)).toHaveAttribute('aria-disabled', 'true');
				expect(screen.getByTestId(testId)).toHaveAttribute(
					'data-denied-permissions',
					RuleCreatePermission,
				);
			}
		});

		it('locks Save without attach on a picked channel', () => {
			const attach = buildNotificationChannelAttachPermission('ch-test');
			deny(attach);
			render(<WrappedFooter />);

			expect(screen.getByTestId(SAVE)).toHaveAttribute(
				'data-denied-permissions',
				attach,
			);
		});

		it('saves an edit with update alone when the channels are unchanged', () => {
			deny(buildNotificationChannelAttachPermission('ch-test'));
			renderEdit(['test-channel']);

			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-disabled', 'false');
		});

		it('locks Save on an edit without update, leaving Test open', () => {
			const update = buildRuleUpdatePermission(RULE_ID);
			deny(update);
			renderEdit(['test-channel']);

			expect(screen.getByTestId(SAVE)).toHaveAttribute(
				'data-denied-permissions',
				update,
			);
			expect(screen.getByTestId(TEST)).toHaveAttribute('aria-disabled', 'false');
		});

		it('needs attach on a channel the edit adds', () => {
			const attach = buildNotificationChannelAttachPermission('ch-test');
			deny(attach);
			renderEdit(['other-channel']);

			expect(screen.getByTestId(SAVE)).toHaveAttribute(
				'data-denied-permissions',
				expect.stringContaining(attach),
			);
		});

		it('keeps Save and Test locked while the channel list loads', () => {
			mockChannels(true);
			render(<WrappedFooter />);

			for (const testId of [SAVE, TEST]) {
				expect(screen.getByTestId(testId)).toHaveAttribute('aria-disabled', 'true');
				expect(screen.getByTestId(testId)).not.toHaveAttribute(
					'data-denied-permissions',
				);
			}
		});
	});

	describe('server denials', () => {
		const DENIAL =
			'user/u-1 is not authorized to perform metric:read on resource "cpu"';
		const axiosError = (status: number, code: string): unknown => ({
			isAxiosError: true,
			response: {
				status,
				data: { error: { code, message: DENIAL } },
			},
		});
		const failSave = (error: unknown): void => {
			const [, { onError }] = mockCreateAlertRule.mock.calls.at(-1);
			act(() => onError(error));
		};

		beforeEach(() => {
			mockCreateAlertRule.mockClear();
			mockShowErrorModal.mockClear();
		});

		it('names a permission the server refused in a callout', () => {
			render(<WrappedFooter />);
			fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
			failSave(axiosError(403, 'authz_forbidden'));

			expect(screen.getByText(DENIAL)).toBeInTheDocument();
			expect(mockShowErrorModal).not.toHaveBeenCalled();
		});

		it('clears the callout on the next attempt', () => {
			render(<WrappedFooter />);
			fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
			failSave(axiosError(403, 'authz_forbidden'));
			fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));

			expect(screen.queryByText(DENIAL)).not.toBeInTheDocument();
		});

		it('keeps the error modal for every other failure', () => {
			render(<WrappedFooter />);
			fireEvent.click(screen.getByText(SAVE_ALERT_RULE_TEXT));
			failSave(axiosError(500, 'internal'));

			expect(mockShowErrorModal).toHaveBeenCalled();
			expect(screen.queryByText(DENIAL)).not.toBeInTheDocument();
		});
	});
});
