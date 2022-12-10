import { Organization } from '../user/getOrganization';

export interface SAMLConfig {
	samlEntity: string;
	samlIdp: string;
	samlCert: string;
}

export function isSAMLConfig(
	value: SAMLConfig | undefined,
): value is SAMLConfig {
	return (
		value?.samlEntity !== undefined ||
		value?.samlIdp !== undefined ||
		value?.samlCert !== undefined
	);
}

export interface GoogleAuthConfig {
	clientId: string;
	clientSecret: string;
}

export function isGoogleAuthConfig(
	value: GoogleAuthConfig | undefined,
): value is GoogleAuthConfig {
	return value?.clientId !== undefined || value?.clientSecret !== undefined;
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
