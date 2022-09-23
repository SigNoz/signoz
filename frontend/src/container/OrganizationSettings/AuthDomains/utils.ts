import { SAMLDomain } from 'types/api/SAML/listDomain';

export const getIsValidCertificate = (
	config: SAMLDomain['samlConfig'],
): boolean =>
	config.samlCert.length !== 0 &&
	config.samlEntity.length !== 0 &&
	config.samlIdp.length !== 0;
