import { Organization } from '../user/getOrganization';

export interface SAMLDomain {
	id: string;
	name: string;
	orgId: Organization['id'];
	ssoEnabled: boolean;
	ssoType: 'SAML';
	samlConfig: {
		samlEntity: string;
		samlIdp: string;
		samlCert: string;
	};
}

export interface Props {
	orgId: Organization['id'];
}

export type PayloadProps = SAMLDomain[];
