import { Organization } from '../user/getOrganization';

export interface SAMLConfig {
	samlEntity: string;
	samlIdp: string;
	samlCert: string;
}

export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
}

export const SAML = 'SAML';
export const GOOGLE_AUTH = 'GOOGLE_AUTH';

export interface AuthDomain {
	id: string;
	name: string;
	orgId: Organization['id'];
	ssoEnabled: boolean;
	ssoType: 'SAML' | 'GOOGLE_AUTH';
	samlConfig?: SAMLConfig;
	googleAuthConfig?: GoogleAuthConfig;
}

export interface Props {
	orgId: Organization['id'];
}

export type PayloadProps = AuthDomain[];
