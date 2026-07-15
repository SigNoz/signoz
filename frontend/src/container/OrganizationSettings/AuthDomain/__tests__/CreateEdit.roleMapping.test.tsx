import { render, screen, userEvent, waitFor } from 'tests/test-utils';
import { rest, server } from 'mocks-server/server';
import {
	allRoles,
	listRolesSuccessResponse,
	managedRoles,
} from 'mocks-server/__mockdata__/roles';

import CreateEdit from '../CreateEdit/CreateEdit';
import {
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockDomainWithDirectRoleAttribute,
	mockDomainWithRoleMapping,
	mockSamlAuthDomain,
	mockUpdateSuccessResponse,
} from './mocks';

// TODO: https://github.com/SigNoz/platform-pod/issues/2602
// The @signozhq/ui Button uses Radix Slot and has CSS infinite animations that
// prevent form.validateFields() from resolving inside act(). Replacing with a
// simple native button avoids the issue.
jest.mock('@signozhq/ui/button', () => ({
	...jest.requireActual('@signozhq/ui/button'),
	Button: ({
		children,
		onClick,
		loading,
		disabled,
		'aria-label': ariaLabel,
		prefix,
		suffix,
	}: {
		children?: React.ReactNode;
		onClick?: React.MouseEventHandler<HTMLButtonElement>;
		loading?: boolean;
		disabled?: boolean;
		'aria-label'?: string;
		prefix?: React.ReactNode;
		suffix?: React.ReactNode;
	}) => (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled || loading}
			aria-label={ariaLabel}
		>
			{prefix}
			{children}
			{suffix}
		</button>
	),
}));

// These are heavy real-timer integration tests (antd Select dropdown render +
// form.validateFields() + a react-query mutation, all driven through userEvent).
// Under a CPU-saturated parallel `jest` run the wall-clock roughly triples, which
// pushes the longest tests past the 5000ms default and makes them flaky. Give the
// whole file a wider budget (matches LogsPanelComponent.test.tsx).
jest.setTimeout(20000);

const ROLES_ENDPOINT = '*/api/v1/roles';

type User = ReturnType<typeof userEvent.setup>;

// antd renders pointer-events:none on parts of its Select, so disable the
// userEvent pointer-events guard (mirrors CreateEdit.test.tsx).
const setupUser = (): User => userEvent.setup({ pointerEventsCheck: 0 });

function getRole(name: string): (typeof managedRoles)[number] {
	const role = managedRoles.find((r) => r.name === name);
	if (!role) {
		throw new Error(`missing mock role: ${name}`);
	}
	return role;
}

const viewerRole = getRole('signoz-viewer');
const editorRole = getRole('signoz-editor');

function mockRoles(
	response: Record<string, unknown> = listRolesSuccessResponse,
	status = 200,
): { count: () => number } {
	let requested = 0;
	server.use(
		rest.get(ROLES_ENDPOINT, (_req, res, ctx) => {
			requested += 1;
			return res(ctx.status(status), ctx.json(response));
		}),
	);
	return { count: (): number => requested };
}

function captureUpdatePayload(): { get: () => any } {
	let payload: unknown = null;
	server.use(
		rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
			payload = await req.json();
			return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
		}),
	);
	return { get: (): any => payload };
}

const expandRoleMapping = (user: User): Promise<void> =>
	user.click(screen.getByText(/role mapping \(advanced\)/i));

const openDefaultRoleSelect = (user: User): Promise<void> =>
	user.click(screen.getByLabelText(/default role/i));

const saveChanges = (user: User): Promise<void> =>
	user.click(screen.getByRole('button', { name: /save changes/i }));

describe('CreateEdit — role mapping uses API roles', () => {
	afterEach(() => {
		server.resetHandlers();
	});

	it('fetches the roles list from the API when the form mounts', async () => {
		const roles = mockRoles();

		render(
			<CreateEdit
				isCreate={false}
				record={mockDomainWithDirectRoleAttribute}
				onClose={jest.fn()}
			/>,
		);

		await waitFor(() => expect(roles.count()).toBeGreaterThan(0));
	});

	it('renders the default-role options from the API (managed + custom), not the old hardcoded VIEWER/EDITOR/ADMIN', async () => {
		const user = setupUser();
		mockRoles();

		// mockSamlAuthDomain has no stored defaultRole, so nothing stale (e.g.
		// "VIEWER") is rendered as a selected tag to pollute the title lookups.
		render(
			<CreateEdit
				isCreate={false}
				record={mockSamlAuthDomain}
				onClose={jest.fn()}
			/>,
		);

		await expandRoleMapping(user);

		// Open the Select and wait for the async roles fetch to populate it.
		await openDefaultRoleSelect(user);
		await screen.findByTitle(allRoles[0].name);

		// Every role returned by the API is offered as an option, including the
		// custom (non-managed) roles — the whole point of the refactor. Use
		// getAllByTitle: the preselected default role also renders its name on
		// the selection item, so a role may legitimately appear more than once.
		allRoles.forEach((role) => {
			expect(screen.getAllByTitle(role.name).length).toBeGreaterThan(0);
		});

		// The old hardcoded uppercase role values must NOT appear as options.
		expect(screen.queryByTitle('VIEWER')).not.toBeInTheDocument();
		expect(screen.queryByTitle('EDITOR')).not.toBeInTheDocument();
		expect(screen.queryByTitle('ADMIN')).not.toBeInTheDocument();
	});

	it('submits the selected role name (not the role id) as defaultRole', async () => {
		const user = setupUser();
		mockRoles();
		const payload = captureUpdatePayload();

		render(
			<CreateEdit
				isCreate={false}
				record={mockDomainWithDirectRoleAttribute}
				onClose={jest.fn()}
			/>,
		);

		await expandRoleMapping(user);

		await openDefaultRoleSelect(user);
		await user.click(await screen.findByTitle(editorRole.name));

		await saveChanges(user);

		await waitFor(() => expect(payload.get()).not.toBeNull());

		// SSO role mapping matches roles by name, so the payload carries the
		// role *name*, not the opaque id.
		expect(payload.get().config.roleMapping.defaultRole).toBe(editorRole.name);
		expect(payload.get().config.roleMapping.defaultRole).not.toBe(editorRole.id);
	});

	it('defaults a fresh role mapping to the signoz-viewer role name', async () => {
		const user = setupUser();
		const roles = mockRoles();
		const payload = captureUpdatePayload();

		// mockSamlAuthDomain has no roleMapping, so the defaultRole field falls
		// back to the Form.Item initialValue (viewerRole.name). That initialValue
		// is only applied when the field mounts, so the roles fetch MUST resolve
		// before the panel is expanded — otherwise viewerRole is still undefined.
		render(
			<CreateEdit
				isCreate={false}
				record={mockSamlAuthDomain}
				onClose={jest.fn()}
			/>,
		);

		await waitFor(() => expect(roles.count()).toBeGreaterThan(0));
		// Flush the react-query commit so `useRoles` exposes the loaded roles
		// before the collapse panel (and thus the default-role field) mounts.
		await screen.findByText(/edit saml authentication/i);

		await expandRoleMapping(user);
		await screen.findByText(/default role/i);

		await saveChanges(user);

		await waitFor(() => expect(payload.get()).not.toBeNull());

		expect(payload.get().config.roleMapping.defaultRole).toBe(viewerRole.name);
		expect(payload.get().config.roleMapping.defaultRole).not.toBe(viewerRole.id);
	});

	it('still defaults to signoz-viewer when the roles fetch returns empty', async () => {
		const user = setupUser();
		// signoz-viewer is a managed role that always exists server-side, so even
		// a degenerate/empty roles response must not strip the hardcoded default.
		mockRoles({ status: 'success', data: [] });
		const payload = captureUpdatePayload();

		render(
			<CreateEdit
				isCreate={false}
				record={mockSamlAuthDomain}
				onClose={jest.fn()}
			/>,
		);

		// Section still renders without crashing even though the fetch was empty.
		await expandRoleMapping(user);
		await expect(screen.findByText(/default role/i)).resolves.toBeInTheDocument();

		await saveChanges(user);

		await waitFor(() => expect(payload.get()).not.toBeNull());

		// The Form.Item initialValue (signoz-viewer) survives an empty roles list.
		expect(payload.get().config.roleMapping.defaultRole).toBe(viewerRole.name);
	});

	it('loads a stored role mapping by role name and round-trips it on save', async () => {
		const user = setupUser();
		mockRoles();
		const payload = captureUpdatePayload();

		// mockDomainWithRoleMapping stores defaultRole "signoz-editor" plus three
		// group mappings, all keyed by role *name*. Editing must surface each
		// stored value as the matching option and submit it unchanged — the
		// backward-compatible read path for already-saved SSO domains.
		render(
			<CreateEdit
				isCreate={false}
				record={mockDomainWithRoleMapping}
				onClose={jest.fn()}
			/>,
		);

		await expandRoleMapping(user);

		// The stored default role renders as a real selection, not a raw token.
		await waitFor(() =>
			expect(screen.getAllByTitle(editorRole.name).length).toBeGreaterThan(0),
		);

		await saveChanges(user);

		await waitFor(() => expect(payload.get()).not.toBeNull());

		expect(payload.get().config.roleMapping.defaultRole).toBe(editorRole.name);
		expect(payload.get().config.roleMapping.groupMappings).toStrictEqual({
			'admin-group': 'signoz-admin',
			'dev-team': 'signoz-editor',
			viewers: 'signoz-viewer',
		});
	});

	it('shows an error state in the default-role select when the roles request fails', async () => {
		const user = setupUser();
		mockRoles(
			{ error: { code: 'internal_error', message: 'boom', url: '' } },
			500,
		);

		render(
			<CreateEdit
				isCreate={false}
				record={mockSamlAuthDomain}
				onClose={jest.fn()}
			/>,
		);

		await expandRoleMapping(user);

		// Open the select and confirm the error UI (with retry) is surfaced
		// instead of crashing the form. The error message comes straight from
		// the failed request; the Retry affordance is always present.
		await openDefaultRoleSelect(user);

		await expect(screen.findByTitle('Retry')).resolves.toBeInTheDocument();
		expect(screen.getByText('boom')).toBeInTheDocument();
	});
});
