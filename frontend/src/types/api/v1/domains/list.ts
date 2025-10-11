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
	samlConfig?: SAMLConfig;
	googleAuthConfig?: GoogleAuthConfig;
	oidcConfig?: OIDCConfig;
}

export interface SAMLConfig {
	samlEntity: string;
	samlIdp: string;
	samlCert: string;
	insecureSkipAuthNRequestsSigned: boolean;
}

export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
	redirectURI: string;
}

export interface OIDCConfig {
	issuer: string;
	issuerAlias: string;
	clientId: string;
	clientSecret: string;
	claimMapping: ClaimMapping;
	insecureSkipEmailVerified: boolean;
	getUserInfo: boolean;
}

export interface ClaimMapping {
	email: string;
}
