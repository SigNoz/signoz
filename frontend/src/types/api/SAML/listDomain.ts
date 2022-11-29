import { Organization } from '../user/getOrganization';

export interface SAMLConfig {
	samlEntity: string;
	samlIdp: string;
	samlCert: string;
}

export interface SAMLDomain {
	id: string;
	name: string;
	orgId: Organization['id'];
	ssoEnabled: boolean;
	ssoType: 'SAML';
	samlConfig: SAMLConfig;
}

export interface Props {
	orgId: Organization['id'];
}

export type PayloadProps = SAMLDomain[];
