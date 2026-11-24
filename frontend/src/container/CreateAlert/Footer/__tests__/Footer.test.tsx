import type { AxiosError } from 'axios';
import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { act, render, screen, userEvent, waitFor } from 'tests/test-utils';
import type { RenderErrorResponseDTO } from 'api/generated/services/sigNoz.schemas';
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
import { denyPermissions } from 'lib/authz/utils/authz-test-utils';

import type { ICreateAlertContextProps } from '../../context/types';
import * as createAlertState from '../../context';
import Footer from '../Footer';

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

const { useQueryBuilder } = jest.requireMock(
	'hooks/queryBuilder/useQueryBuilder',
);

const CHANNELS_URL = 'http://localhost/api/v2/notification_channels';
const CHANNELS = [
	{ id: 'ch-test', displayName: 'test-channel' },
	{ id: 'ch-other', displayName: 'other-channel' },
];

const SAVE = 'save-alert-rule-button';
const TEST = 'test-notification-button';
const DISCARD = 'discard-alert-rule-button';

const mockCreateAlertRule = jest.fn();
const mockTestAlertRule = jest.fn();
const mockUpdateAlertRule = jest.fn();
const mockDiscardAlertRule = jest.fn();

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

const withState = (overrides: Partial<ICreateAlertContextProps>): void => {
	jest
		.spyOn(createAlertState, 'useCreateAlertState')
		.mockReturnValue({ ...mockAlertContextState, ...overrides });
};

const withoutChannels = (
	routingPolicies: boolean,
): Partial<ICreateAlertContextProps> => ({
	notificationSettings: {
		...mockAlertContextState.notificationSettings,
		routingPolicies,
	},
	thresholdState: {
		...mockAlertContextState.thresholdState,
		thresholds: [
			{ ...mockAlertContextState.thresholdState.thresholds[0], channels: [] },
		],
	},
});

/** Reads the channel list the footer reads, so a test knows it has loaded. */
function ChannelsProbe(): JSX.Element {
	const { data } = useChannelOptions();
	return <output data-testid="channels-probe">{data.length}</output>;
}

const renderFooter = async (): Promise<void> => {
	render(
		<>
			<ChannelsProbe />
			<Footer />
		</>,
	);
	await waitFor(() =>
		expect(screen.getByTestId('channels-probe')).toHaveTextContent(
			String(CHANNELS.length),
		),
	);
};

const user = (): ReturnType<typeof userEvent.setup> =>
	userEvent.setup({ pointerEventsCheck: 0 });

const lockOf = (testId: string): string | null =>
	screen.getByTestId(testId).getAttribute('aria-disabled');

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
		denyPermissions();
		withState({});
		server.use(
			rest.get(CHANNELS_URL, (_req, res, ctx) =>
				res(
					ctx.json({
						status: 'success',
						data: { channels: CHANNELS, total: CHANNELS.length },
					}),
				),
			),
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
		server.resetHandlers();
	});

	it('should render the component with 3 buttons', async () => {
		await renderFooter();
		expect(screen.getByTestId(SAVE)).toBeInTheDocument();
		expect(screen.getByTestId(TEST)).toBeInTheDocument();
		expect(screen.getByTestId(DISCARD)).toBeInTheDocument();
	});

	it('discard action works correctly', async () => {
		await renderFooter();
		await user().click(screen.getByTestId(DISCARD));
		expect(mockDiscardAlertRule).toHaveBeenCalled();
	});

	it('save alert rule action works correctly', async () => {
		await renderFooter();
		await user().click(screen.getByTestId(SAVE));
		expect(mockCreateAlertRule).toHaveBeenCalled();
	});

	it('update alert rule action works correctly', async () => {
		withState({ isEditMode: true });
		await renderFooter();
		await user().click(screen.getByTestId(SAVE));
		expect(mockUpdateAlertRule).toHaveBeenCalled();
	});

	it('test notification action works correctly', async () => {
		await renderFooter();
		await user().click(screen.getByTestId(TEST));
		expect(mockTestAlertRule).toHaveBeenCalled();
	});

	it.each([
		['creating', { isCreatingAlertRule: true }],
		['updating', { isUpdatingAlertRule: true }],
		['testing', { isTestingAlertRule: true }],
	])('all buttons are disabled when %s alert rule', async (_label, state) => {
		withState(state);
		await renderFooter();

		expect(lockOf(SAVE)).toBe('true');
		expect(lockOf(TEST)).toBe('true');
		expect(lockOf(DISCARD)).toBe('true');
	});

	it('create and test buttons are disabled when alert name is missing', async () => {
		withState({
			alertState: { ...mockAlertContextState.alertState, name: '' },
		});
		await renderFooter();

		expect(lockOf(SAVE)).toBe('true');
		expect(lockOf(TEST)).toBe('true');
	});

	it('create and test buttons are disabled when notifcation channels are missing and routing policies are disabled', async () => {
		withState(withoutChannels(false));
		await renderFooter();

		expect(lockOf(SAVE)).toBe('true');
		expect(lockOf(TEST)).toBe('true');
	});

	it('buttons are enabled even with no notification channels when routing policies are enabled', async () => {
		withState(withoutChannels(true));
		await renderFooter();

		expect(lockOf(SAVE)).toBe('false');
		expect(lockOf(TEST)).toBe('false');
		expect(lockOf(DISCARD)).toBe('false');
	});

	it('should show loading state on test notification button when testing alert rule', async () => {
		withState({ isTestingAlertRule: true });
		await renderFooter();

		expect(screen.getByTestId(TEST)).toHaveAttribute('aria-busy', 'true');
	});

	it.each([
		['updating', { isUpdatingAlertRule: true }],
		['creating', { isCreatingAlertRule: true }],
	])(
		'should show loading state on save alert rule button when %s alert rule',
		async (_label, state) => {
			withState(state);
			await renderFooter();

			expect(screen.getByTestId(SAVE)).toHaveAttribute('aria-busy', 'true');
		},
	);

	describe('authz', () => {
		const RULE_ID = 'rule-1';

		const editing = (savedChannelNames: string[]): void => {
			withState({ isEditMode: true, ruleId: RULE_ID, savedChannelNames });
		};

		it('locks Save and Test without create, naming it', async () => {
			denyPermissions(RuleCreatePermission);
			await renderFooter();

			for (const testId of [SAVE, TEST]) {
				expect(lockOf(testId)).toBe('true');
				expect(screen.getByTestId(testId)).toHaveAttribute(
					'data-denied-permissions',
					expect.stringContaining(RuleCreatePermission),
				);
			}
		});

		it('locks Save without attach on a picked channel', async () => {
			const attach = buildNotificationChannelAttachPermission('ch-test');
			denyPermissions(attach);
			await renderFooter();

			expect(screen.getByTestId(SAVE)).toHaveAttribute(
				'data-denied-permissions',
				attach,
			);
		});

		it('saves an edit with update alone when the channels are unchanged', async () => {
			denyPermissions(buildNotificationChannelAttachPermission('ch-test'));
			editing(['test-channel']);
			await renderFooter();

			expect(lockOf(SAVE)).toBe('false');
		});

		it('locks Save on an edit without update, leaving Test open', async () => {
			const update = buildRuleUpdatePermission(RULE_ID);
			denyPermissions(update);
			editing(['test-channel']);
			await renderFooter();

			expect(screen.getByTestId(SAVE)).toHaveAttribute(
				'data-denied-permissions',
				update,
			);
			expect(lockOf(TEST)).toBe('false');
		});

		it('needs attach on a channel the edit adds', async () => {
			const attach = buildNotificationChannelAttachPermission('ch-test');
			denyPermissions(attach);
			editing(['other-channel']);
			await renderFooter();

			expect(screen.getByTestId(SAVE)).toHaveAttribute(
				'data-denied-permissions',
				expect.stringContaining(attach),
			);
		});

		it('keeps Save and Test locked while the channel list loads', () => {
			server.use(
				rest.get(CHANNELS_URL, (_req, res, ctx) => res(ctx.delay('infinite'))),
			);
			render(<Footer />);

			for (const testId of [SAVE, TEST]) {
				expect(lockOf(testId)).toBe('true');
				expect(screen.getByTestId(testId)).not.toHaveAttribute(
					'data-denied-permissions',
				);
			}
		});
	});

	describe('server denials', () => {
		const DENIAL =
			'user/u-1 is not authorized to perform metric:read on resource "cpu"';
		const axiosError = (
			status: number,
			code: string,
		): AxiosError<RenderErrorResponseDTO> =>
			({
				isAxiosError: true,
				response: {
					status,
					data: { status: 'error', error: { code, message: DENIAL } },
				},
			}) as AxiosError<RenderErrorResponseDTO>;
		const failSave = async (
			error: AxiosError<RenderErrorResponseDTO>,
		): Promise<void> => {
			const [, { onError }] = mockCreateAlertRule.mock.calls.at(-1);
			await act(async () => {
				onError(error);
			});
		};

		it('names a permission the server refused in a callout', async () => {
			await renderFooter();
			await user().click(screen.getByTestId(SAVE));
			await failSave(axiosError(403, 'authz_forbidden'));

			expect(screen.getByText(DENIAL)).toBeInTheDocument();
			expect(mockShowErrorModal).not.toHaveBeenCalled();
		});

		it('clears the callout on the next attempt', async () => {
			await renderFooter();
			await user().click(screen.getByTestId(SAVE));
			await failSave(axiosError(403, 'authz_forbidden'));
			await user().click(screen.getByTestId(SAVE));

			expect(screen.queryByText(DENIAL)).not.toBeInTheDocument();
		});

		it('keeps the error modal for every other failure', async () => {
			await renderFooter();
			await user().click(screen.getByTestId(SAVE));
			await failSave(axiosError(500, 'internal'));

			expect(mockShowErrorModal).toHaveBeenCalled();
			expect(screen.queryByText(DENIAL)).not.toBeInTheDocument();
		});
	});
});
