import { FeatureFlag } from 'types/reducer/app';

import { Organization } from '../user/getOrganization';

export interface SAMLDomain {
	id: string;
	name: string;
	orgId: Organization['id'];
	ssoEnforce: boolean;
	ssoType: keyof FeatureFlag;
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
