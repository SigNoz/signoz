import { fireEvent, render, screen, waitFor } from 'tests/test-utils';
import { setupAuthzAdmin } from 'lib/authz/utils/authz-test-utils';
import { rest, server } from 'mocks-server/server';
import {
	AuthtypesAuthDomainConfigGoogleDTO,
	AuthtypesGettableAuthDomainDTO,
} from 'api/generated/services/sigNoz.schemas';

import CreateEdit from '../CreateEdit/CreateEdit';
import {
	AUTH_DOMAINS_UPDATE_ENDPOINT,
	mockDomainWithRoleMapping,
	mockGoogleAuthDomain,
	mockGoogleAuthWithWorkspaceGroups,
	mockOidcWithClaimMapping,
	mockSamlWithAttributeMapping,
	mockUpdateSuccessResponse,
} from './mocks';

// @signozhq/ui/button internal effects block form.validateFields() in tests
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

type SavedPayload = {
	config: {
		kind?: string;
		spec?: Record<string, unknown>;
	};
	roleMapping?: Record<string, unknown>;
};

async function submitForm(
	record: AuthtypesGettableAuthDomainDTO,
): Promise<SavedPayload> {
	const requests: SavedPayload[] = [];

	server.use(
		setupAuthzAdmin(),
		rest.put(AUTH_DOMAINS_UPDATE_ENDPOINT, async (req, res, ctx) => {
			requests.push((await req.json()) as SavedPayload);
			return res(ctx.status(200), ctx.json(mockUpdateSuccessResponse));
		}),
	);

	render(<CreateEdit isCreate={false} record={record} onClose={jest.fn()} />);
	const saveButton = screen.getByRole('button', { name: /save changes/i });
	await waitFor(() => expect(saveButton).toBeEnabled());
	fireEvent.click(saveButton);
	await waitFor(() => expect(requests).toHaveLength(1));

	return requests[0];
}

describe('CreateEdit — payload sanitization', () => {
	afterEach(() => server.resetHandlers());

	describe('Google Auth', () => {
		it('sends core fields and omits workspace fields when fetchGroups is not set', async () => {
			const payload = await submitForm(mockGoogleAuthDomain);

			const g = payload.config.spec;
			expect(g?.clientId).toBe('test-client-id');
			expect(g?.clientSecret).toBe('test-client-secret');
			expect(g?.allowedGroups).toBeUndefined();
			expect(g?.serviceAccountJson).toBeUndefined();
			expect(g?.fetchTransitiveGroupMembership).toBeUndefined();
			expect(g?.domainToAdminEmail).toStrictEqual({});
		});

		it('strips workspace fields when fetchGroups is false', async () => {
			const googleConfig =
				mockGoogleAuthWithWorkspaceGroups.config as AuthtypesAuthDomainConfigGoogleDTO;
			const payload = await submitForm({
				...mockGoogleAuthWithWorkspaceGroups,
				config: {
					...googleConfig,
					spec: {
						...googleConfig.spec,
						fetchGroups: false,
					},
				},
			});

			const g = payload.config.spec;
			expect(g?.fetchGroups).toBe(false);
			expect(g?.allowedGroups).toBeUndefined();
			expect(g?.serviceAccountJson).toBeUndefined();
			expect(g?.fetchTransitiveGroupMembership).toBeUndefined();
			expect(g?.domainToAdminEmail).toStrictEqual({});
		});

		it('includes all workspace fields when fetchGroups is true', async () => {
			const payload = await submitForm(mockGoogleAuthWithWorkspaceGroups);

			const g = payload.config.spec;
			expect(g?.fetchGroups).toBe(true);
			expect(g?.serviceAccountJson).toBe('{"type": "service_account"}');
			expect(g?.fetchTransitiveGroupMembership).toBe(true);
			expect(g?.allowedGroups).toStrictEqual([
				'allowed-group-1',
				'allowed-group-2',
			]);
			expect(g?.domainToAdminEmail).toStrictEqual({
				'google-groups.com': 'admin@google-groups.com',
			});
		});
	});

	describe('SAML', () => {
		it('sends core and attributeMapping fields', async () => {
			const payload = await submitForm(mockSamlWithAttributeMapping);

			const s = payload.config.spec;
			expect(s?.location).toBe('https://idp.saml-attrs.com/sso');
			expect(s?.entityId).toBe('urn:saml-attrs:idp');
			expect(s?.certificate).toBe('MOCK_CERTIFICATE_ATTRS');
			expect(s?.insecureSkipAuthNRequestsSigned).toBe(true);

			const attr = s?.attributeMapping as Record<string, unknown>;
			expect(attr?.name).toBe('user_display_name');
			expect(attr?.groups).toBe('member_of');
			expect(attr?.role).toBe('signoz_role');
		});
	});

	describe('OIDC', () => {
		it('sends all fields including claimMapping', async () => {
			const payload = await submitForm(mockOidcWithClaimMapping);

			const o = payload.config.spec;
			expect(o?.issuer).toBe('https://oidc.claims.com');
			expect(o?.issuerAlias).toBe('https://alias.claims.com');
			expect(o?.clientId).toBe('claims-client-id');
			expect(o?.clientSecret).toBe('claims-client-secret');
			expect(o?.insecureSkipEmailVerified).toBe(true);
			expect(o?.getUserInfo).toBe(true);

			const claim = o?.claimMapping as Record<string, unknown>;
			expect(claim?.email).toBe('user_email');
			expect(claim?.name).toBe('display_name');
			expect(claim?.groups).toBe('user_groups');
			expect(claim?.role).toBe('user_role');
		});
	});

	describe('Role Mapping', () => {
		it('strips groupMappings when useRoleAttribute is true', async () => {
			const payload = await submitForm({
				...mockDomainWithRoleMapping,
				roleMapping: {
					...mockDomainWithRoleMapping.roleMapping,
					useRoleAttribute: true,
				},
			});

			expect(payload.roleMapping?.useRoleAttribute).toBe(true);
			expect(payload.roleMapping?.groupMappings).toBeUndefined();
		});

		it('sends groupMappings when useRoleAttribute is false', async () => {
			const payload = await submitForm(mockDomainWithRoleMapping);

			expect(payload.roleMapping?.useRoleAttribute).toBe(false);
			expect(payload.roleMapping?.groupMappings).toStrictEqual({
				'admin-group': 'signoz-admin',
				'dev-team': 'signoz-editor',
				viewers: 'signoz-viewer',
			});
		});
	});
});
