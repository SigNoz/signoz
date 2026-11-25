import { render, screen, userEvent, waitFor } from 'tests/test-utils';

import CreateEdit from '../CreateEdit/CreateEdit';
import { captureUpdatePayload } from './createEditTestUtils';
import {
	mockDomainWithRoleMapping,
	mockGoogleAuthWithWorkspaceGroups,
} from './mocks';

// TODO: https://github.com/SigNoz/platform-pod/issues/2602
// The real @signozhq/ui/button has internal effects that prevent form.validateFields()
// from resolving inside act(). Mirror the pattern from SSOEnforcementToggle.test.tsx
// which mocks @signozhq/ui/switch for the same reason.
jest.mock('@signozhq/ui/button', () =>
	jest.requireActual('./createEditTestUtils').buttonModuleMock(),
);

describe('CreateEdit — save payload correctness', () => {
	it('sends groupMappings: {} when all group mappings are deleted', async () => {
		const user = userEvent.setup();
		const payload = captureUpdatePayload();

		render(
			<CreateEdit
				isCreate={false}
				record={mockDomainWithRoleMapping}
				onClose={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('role-mapping-header'));

		const removeButtons = await screen.findAllByTestId('role-mapping-remove');
		expect(removeButtons).toHaveLength(3);
		for (let i = 0; i < removeButtons.length; i += 1) {
			await user.click(screen.getAllByTestId('role-mapping-remove')[0]);
		}
		expect(screen.queryAllByTestId('role-mapping-remove')).toHaveLength(0);

		await user.click(screen.getByTestId('auth-domain-save'));

		await waitFor(() => expect(payload.get()).not.toBeNull());
		expect(payload.get()).toMatchObject({
			roleMapping: expect.objectContaining({ groupMappings: {} }),
		});
	});

	it('sends domainToAdminEmail: {} when all domain mappings are deleted', async () => {
		const user = userEvent.setup();
		const payload = captureUpdatePayload();

		render(
			<CreateEdit
				isCreate={false}
				record={mockGoogleAuthWithWorkspaceGroups}
				onClose={jest.fn()}
			/>,
		);

		await user.click(screen.getByTestId('google-auth-workspace-groups-header'));
		await user.click(await screen.findByTestId('domain-mapping-remove'));
		expect(screen.queryByTestId('domain-mapping-remove')).not.toBeInTheDocument();

		await user.click(screen.getByTestId('auth-domain-save'));

		await waitFor(() => expect(payload.get()).not.toBeNull());
		expect(payload.get()).toMatchObject({
			config: expect.objectContaining({
				spec: expect.objectContaining({
					domainToAdminEmail: {},
				}),
			}),
		});
	});
});
