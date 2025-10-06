export interface UpdatableAuthDomain {
	config: {
		ssoEnabled: boolean;
		ssoType: string;
		samlConfig?: SAMLConfig;
		googleAuthConfig?: GoogleAuthConfig;
		oidcConfig?: OIDCConfig;
	};
	id: string;
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
