import { AuthDomain, SAML } from 'types/api/SAML/listDomain';

import { isSSOConfigValid } from './helpers';

const inValidCase: AuthDomain['samlConfig'][] = [
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

const validCase: AuthDomain['samlConfig'][] = [
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
				isSSOConfigValid({
					id: 'test-0',
					name: 'test',
					orgId: '32ed234',
					ssoEnabled: true,
					ssoType: SAML,
					samlConfig: {
						samlCert: config?.samlCert || '',
						samlEntity: config?.samlEntity || '',
						samlIdp: config?.samlIdp || '',
					},
				}),
			).toBe(false);
		});
	});

	validCase.forEach((config) => {
		it('should return invalid saml config', () => {
			expect(
				isSSOConfigValid({
					id: 'test-0',
					name: 'test',
					orgId: '32ed234',
					ssoEnabled: true,
					ssoType: SAML,
					samlConfig: {
						samlCert: config?.samlCert || '',
						samlEntity: config?.samlEntity || '',
						samlIdp: config?.samlIdp || '',
					},
				}),
			).toBe(true);
		});
	});
});
