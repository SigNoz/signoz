import { AuthtypesGettableAuthDomainDTO } from 'api/generated/services/sigNoz.schemas';

// API Endpoints
export const AUTH_DOMAINS_LIST_ENDPOINT = '*/api/v1/domains';
export const AUTH_DOMAINS_CREATE_ENDPOINT = '*/api/v1/domains';
export const AUTH_DOMAINS_UPDATE_ENDPOINT = '*/api/v1/domains/:id';
export const AUTH_DOMAINS_DELETE_ENDPOINT = '*/api/v1/domains/:id';

// Mock Auth Domain with Google Auth
export const mockGoogleAuthDomain: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-1',
	name: 'signoz.io',
	ssoEnabled: true,
	ssoType: 'google_auth',
	googleAuthConfig: {
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-1',
	},
};

// Mock Auth Domain with SAML
export const mockSamlAuthDomain: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-2',
	name: 'example.com',
	ssoEnabled: false,
	ssoType: 'saml',
	samlConfig: {
		samlIdp: 'https://idp.example.com/sso',
		samlEntity: 'urn:example:idp',
		samlCert: 'MOCK_CERTIFICATE',
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-2',
	},
};

// Mock Auth Domain with OIDC
export const mockOidcAuthDomain: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-3',
	name: 'corp.io',
	ssoEnabled: true,
	ssoType: 'oidc',
	oidcConfig: {
		issuer: 'https://oidc.corp.io',
		clientId: 'oidc-client-id',
		clientSecret: 'oidc-client-secret',
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-3',
	},
};

// Mock Auth Domain with Role Mapping
export const mockDomainWithRoleMapping: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-4',
	name: 'enterprise.com',
	ssoEnabled: true,
	ssoType: 'saml',
	samlConfig: {
		samlIdp: 'https://idp.enterprise.com/sso',
		samlEntity: 'urn:enterprise:idp',
		samlCert: 'MOCK_CERTIFICATE',
	},
	roleMapping: {
		defaultRole: 'EDITOR',
		useRoleAttribute: false,
		groupMappings: {
			'admin-group': 'ADMIN',
			'dev-team': 'EDITOR',
			viewers: 'VIEWER',
		},
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-4',
	},
};

// Mock Auth Domain with useRoleAttribute enabled
export const mockDomainWithDirectRoleAttribute: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-5',
	name: 'direct-role.com',
	ssoEnabled: true,
	ssoType: 'oidc',
	oidcConfig: {
		issuer: 'https://oidc.direct-role.com',
		clientId: 'direct-role-client-id',
		clientSecret: 'direct-role-client-secret',
	},
	roleMapping: {
		defaultRole: 'VIEWER',
		useRoleAttribute: true,
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-5',
	},
};

// Mock OIDC domain with claim mapping
export const mockOidcWithClaimMapping: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-6',
	name: 'oidc-claims.com',
	ssoEnabled: true,
	ssoType: 'oidc',
	oidcConfig: {
		issuer: 'https://oidc.claims.com',
		issuerAlias: 'https://alias.claims.com',
		clientId: 'claims-client-id',
		clientSecret: 'claims-client-secret',
		insecureSkipEmailVerified: true,
		getUserInfo: true,
		claimMapping: {
			email: 'user_email',
			name: 'display_name',
			groups: 'user_groups',
			role: 'user_role',
		},
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-6',
	},
};

// Mock SAML domain with attribute mapping
export const mockSamlWithAttributeMapping: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-7',
	name: 'saml-attrs.com',
	ssoEnabled: true,
	ssoType: 'saml',
	samlConfig: {
		samlIdp: 'https://idp.saml-attrs.com/sso',
		samlEntity: 'urn:saml-attrs:idp',
		samlCert: 'MOCK_CERTIFICATE_ATTRS',
		insecureSkipAuthNRequestsSigned: true,
		attributeMapping: {
			name: 'user_display_name',
			groups: 'member_of',
			role: 'signoz_role',
		},
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-7',
	},
};

// Mock Google Auth with workspace groups
export const mockGoogleAuthWithWorkspaceGroups: AuthtypesGettableAuthDomainDTO = {
	id: 'domain-8',
	name: 'google-groups.com',
	ssoEnabled: true,
	ssoType: 'google_auth',
	googleAuthConfig: {
		clientId: 'google-groups-client-id',
		clientSecret: 'google-groups-client-secret',
		insecureSkipEmailVerified: false,
		fetchGroups: true,
		serviceAccountJson: '{"type": "service_account"}',
		domainToAdminEmail: {
			'google-groups.com': 'admin@google-groups.com',
		},
		fetchTransitiveGroupMembership: true,
		allowedGroups: ['allowed-group-1', 'allowed-group-2'],
	},
	authNProviderInfo: {
		relayStatePath: 'api/v1/sso/relay/domain-8',
	},
};

// Mock empty list response
export const mockEmptyDomainsResponse = {
	status: 'success',
	data: [],
};

// Mock list response with domains
export const mockDomainsListResponse = {
	status: 'success',
	data: [mockGoogleAuthDomain, mockSamlAuthDomain, mockOidcAuthDomain],
};

// Mock single domain list response
export const mockSingleDomainResponse = {
	status: 'success',
	data: [mockGoogleAuthDomain],
};

// Mock success responses
export const mockCreateSuccessResponse = {
	status: 'success',
	data: mockGoogleAuthDomain,
};

export const mockUpdateSuccessResponse = {
	status: 'success',
	data: { ...mockGoogleAuthDomain, ssoEnabled: false },
};

export const mockDeleteSuccessResponse = {
	status: 'success',
	data: 'Domain deleted successfully',
};

// Mock error responses
export const mockErrorResponse = {
	error: {
		code: 'internal_error',
		message: 'Failed to perform operation',
		url: '',
	},
};

export const mockValidationErrorResponse = {
	error: {
		code: 'invalid_input',
		message: 'Domain name is required',
		url: '',
	},
};
