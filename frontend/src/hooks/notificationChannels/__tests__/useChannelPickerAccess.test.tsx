import { server } from 'mocks-server/server';
import { act, AllTheProviders, renderHook, waitFor } from 'tests/test-utils';
import { buildNotificationChannelAttachPermission } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import { formatPermission } from 'lib/authz/hooks/useAuthZ/utils';
import { setupAuthzDeny } from 'lib/authz/utils/authz-test-utils';

import { useChannelPickerAccess } from '../useChannelPickerAccess';

const CHANNELS = [
	{ id: 'c1', name: 'ops-slack' },
	{ id: 'c2', name: 'oncall-pagerduty' },
];

describe('useChannelPickerAccess', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('names each option, and gives a denied one its reason', async () => {
		const denied = buildNotificationChannelAttachPermission('c2');
		server.use(setupAuthzDeny(denied));
		const { result } = renderHook(
			() =>
				useChannelPickerAccess({
					savedChannelNames: [],
					channels: CHANNELS,
					testIdPrefix: 'picker-option',
				}),
			{ wrapper: AllTheProviders },
		);
		act(() => result.current.onPickerVisibleChange(true));

		await waitFor(() =>
			expect(result.current.options[1].reason).toContain(formatPermission(denied)),
		);
		const [open, locked] = result.current.options;
		expect(open).toMatchObject({
			value: 'ops-slack',
			label: 'ops-slack',
			disabled: false,
			testId: 'picker-option-c1',
		});
		expect(locked).toMatchObject({ disabled: true, denied: true });
		expect(locked.reason).toContain(formatPermission(denied));
	});
});
