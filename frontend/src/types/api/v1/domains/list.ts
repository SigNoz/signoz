export const SSOType = new Map<string, string>([
	['google_auth', 'Google Auth'],
	['saml', 'SAML'],
	['email_password', 'Email Password'],
	['oidc', 'OIDC'],
]);

export interface GettableAuthDomain {
	id: string;
	name: string;
	orgId: string;
	ssoEnabled: boolean;
	ssoType: string;
	authNProviderInfo: AuthNProviderInfo;
	samlConfig?: SAMLConfig;
	googleAuthConfig?: GoogleAuthConfig;
	oidcConfig?: OIDCConfig;
}

export interface SAMLAttributeMapping {
	nameAttribute?: string;
	groupsAttribute?: string;
	roleAttribute?: string;
}

export interface SAMLConfig {
	samlEntity: string;
	samlIdp: string;
	samlCert: string;
	insecureSkipAuthNRequestsSigned: boolean;
	attributeMapping?: SAMLAttributeMapping;
	roleMapping?: RoleMappingConfig;
}

export interface RoleMappingConfig {
	defaultRole?: 'VIEWER' | 'EDITOR' | 'ADMIN';
	useRoleAttributeDirectly?: boolean;
	groupMappings?: Array<{
		groupName: string;
		role: 'VIEWER' | 'EDITOR' | 'ADMIN';
	}>;
}

export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectURI: string;
	insecureSkipEmailVerified?: boolean;
	fetchGroups?: boolean;
	serviceAccountJson?: string;
	domainToAdminEmail?: Record<string, string>;
	fetchTransitiveGroupMembership?: boolean;
	allowedGroups?: string[];
	roleMapping?: RoleMappingConfig;
}

export interface OIDCConfig {
	issuer: string;
	issuerAlias: string;
	clientId: string;
	clientSecret: string;
	claimMapping: ClaimMapping;
	insecureSkipEmailVerified: boolean;
	getUserInfo: boolean;
	roleMapping?: RoleMappingConfig;
}

export interface ClaimMapping {
	email?: string;
	name?: string;
	groups?: string;
	role?: string;
}

export interface AuthNProviderInfo {
	relayStatePath: string;
}
