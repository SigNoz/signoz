export interface PostableAuthDomain {
	name: string;
	config: Config;
}

export interface Config {
	ssoEnabled: boolean;
	ssoType: string;
	samlConfig?: SAMLConfig;
	googleAuthConfig?: GoogleAuthConfig;
	oidcConfig?: OIDCConfig;
	roleMapping?: RoleMapping;
}

export interface SAMLConfig {
	samlEntity: string;
	samlIdp: string;
	samlCert: string;
	insecureSkipAuthNRequestsSigned: boolean;
	attributeMapping?: AttributeMapping;
}

export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectURI: string;
	fetchGroups: boolean;
	serviceAccountJson?: string;
	domainToAdminEmail?: Record<string, string>;
	fetchTransitiveGroupMembership?: boolean;
	allowedGroups?: string[];
	insecureSkipEmailVerified: boolean;
}

export interface OIDCConfig {
	issuer: string;
	issuerAlias: string;
	clientId: string;
	clientSecret: string;
	claimMapping?: AttributeMapping;
	insecureSkipEmailVerified: boolean;
	getUserInfo: boolean;
}

export interface AttributeMapping {
	email: string;
	name: string;
	groups: string;
	role: string;
}

export interface RoleMapping {
	defaultRole: string;
	groupMappings: Record<string, string>;
	useRoleAttribute: boolean;
}
