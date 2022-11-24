import { SAMLConfig } from 'types/api/SAML/listDomain';

export const getIsValidCertificate = (config: SAMLConfig): boolean => {
	if (config === null) {
		return false;
	}

	return (
		config?.samlCert?.length !== 0 &&
		config?.samlEntity?.length !== 0 &&
		config?.samlIdp?.length !== 0
	);
};
