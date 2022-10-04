import { SAMLDomain } from 'types/api/SAML/listDomain';

import { getIsValidCertificate } from './utils';

const inValidCase: SAMLDomain['samlConfig'][] = [
	{
		samlCert: '',
		samlEntity: '',
		samlIdp: '',
	},
	{
		samlCert: '',
		samlEntity: '',
		samlIdp: 'asd',
	},
	{
		samlCert: 'sample certificate',
		samlEntity: '',
		samlIdp: '',
	},
	{
		samlCert: 'sample cert',
		samlEntity: 'sample entity',
		samlIdp: '',
	},
];

const validCase: SAMLDomain['samlConfig'][] = [
	{
		samlCert: 'sample cert',
		samlEntity: 'sample entity',
		samlIdp: 'sample idp',
	},
];

describe('Utils', () => {
	inValidCase.forEach((config) => {
		it('should return invalid saml config', () => {
			expect(
				getIsValidCertificate({
					samlCert: config.samlCert,
					samlEntity: config.samlEntity,
					samlIdp: config.samlIdp,
				}),
			).toBe(false);
		});
	});

	validCase.forEach((config) => {
		it('should return invalid saml config', () => {
			expect(
				getIsValidCertificate({
					samlCert: config.samlCert,
					samlEntity: config.samlEntity,
					samlIdp: config.samlIdp,
				}),
			).toBe(true);
		});
	});
});
