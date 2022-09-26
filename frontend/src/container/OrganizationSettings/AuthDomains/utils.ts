export const getIsValidCertificate = (
	config: Record<string, string>,
): boolean =>
	config?.samlCert.length !== 0 &&
	config?.samlEntity.length !== 0 &&
	config?.samlIdp.length !== 0;
