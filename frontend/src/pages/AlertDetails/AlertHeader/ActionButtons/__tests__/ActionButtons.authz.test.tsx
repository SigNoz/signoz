import { server } from 'mocks-server/server';
import { rest } from 'msw';
import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import * as createAlertState from 'container/CreateAlert/context';
import { createMockAlertContextState } from 'container/CreateAlert/EvaluationSettings/__tests__/testUtils';
import { useChannelOptions } from 'hooks/notificationChannels/useChannelOptions';
import { buildNotificationChannelAttachPermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleDeletePermission,
	buildRuleUpdatePermission,
	RuleAttachPermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { denyPermissions } from 'lib/authz/utils/authz-test-utils';
import AlertRuleProvider from 'providers/Alert';
import { defaultPostableAlertRuleV2 } from 'container/CreateAlert/constants';

import AlertActionButtons from '../ActionButtons';

jest.mock('lib/authz/hooks/useAuthZ/useAuthZ');

const RULE_ID = 'rule-1';
const CHANNELS_URL = 'http://localhost/api/v2/notification_channels';
const CHANNELS = [{ id: 'ch-ops', displayName: 'ops' }];

/** Reads the channel list the buttons read, so a test knows it has loaded. */
function ChannelsProbe(): JSX.Element {
	const { data } = useChannelOptions();
	return <output data-testid="channels-probe">{data.length}</output>;
}

const withSavedChannels = (savedChannelNames: string[]): void => {
	jest
		.spyOn(createAlertState, 'useCreateAlertState')
		.mockReturnValue(createMockAlertContextState({ savedChannelNames }));
};

const renderButtons = async (): Promise<void> => {
	render(
		<AlertRuleProvider>
			<ChannelsProbe />
			<AlertActionButtons
				ruleId={RULE_ID}
				alertDetails={{ ...defaultPostableAlertRuleV2, state: 'firing' }}
			/>
		</AlertRuleProvider>,
	);
	await waitFor(() =>
		expect(screen.getByTestId('channels-probe')).toHaveTextContent(
			String(CHANNELS.length),
		),
	);
};

const openMenu = async (): Promise<void> => {
	await userEvent
		.setup({ pointerEventsCheck: 0 })
		.click(screen.getByTestId('alert-actions-menu'));
	await screen.findByTestId('alert-details-action-clone');
};

const isLocked = (testId: string): boolean =>
	screen.getByTestId(testId).hasAttribute('data-disabled');

describe('AlertActionButtons - AuthZ', () => {
	beforeEach(() => {
		denyPermissions();
		withSavedChannels([]);
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
		jest.restoreAllMocks();
		server.resetHandlers();
	});

	it('leaves every action open with every permission', async () => {
		await renderButtons();
		await openMenu();

		expect(screen.getByTestId('alert-actions-toggle')).not.toHaveAttribute(
			'aria-disabled',
			'true',
		);
		expect(isLocked('alert-details-action-clone')).toBe(false);
		expect(isLocked('alert-details-action-delete')).toBe(false);
	});

	it('locks the enable toggle without update', async () => {
		denyPermissions(buildRuleUpdatePermission(RULE_ID));
		await renderButtons();

		expect(screen.getByTestId('alert-actions-toggle')).toHaveAttribute(
			'aria-disabled',
			'true',
		);
	});

	it('locks clone without create, leaving delete open', async () => {
		denyPermissions(RuleCreatePermission);
		await renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-clone')).toBe(true);
		expect(isLocked('alert-details-action-delete')).toBe(false);
	});

	it('locks delete without delete on the rule', async () => {
		denyPermissions(buildRuleDeletePermission(RULE_ID));
		await renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-delete')).toBe(true);
		expect(isLocked('alert-details-action-clone')).toBe(false);
	});

	it('locks clone without attach on the rule when the rule has channels', async () => {
		withSavedChannels(['ops']);
		denyPermissions(RuleAttachPermission);
		await renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-clone')).toBe(true);
		expect(isLocked('alert-details-action-delete')).toBe(false);
	});

	it('locks clone without attach on a channel of the rule', async () => {
		withSavedChannels(['ops']);
		denyPermissions(buildNotificationChannelAttachPermission('ch-ops'));
		await renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-clone')).toBe(true);
	});

	it('leaves clone open without attach when the rule has no channels', async () => {
		denyPermissions(
			RuleAttachPermission,
			buildNotificationChannelAttachPermission('ch-ops'),
		);
		await renderButtons();
		await openMenu();

		expect(isLocked('alert-details-action-clone')).toBe(false);
	});
});
