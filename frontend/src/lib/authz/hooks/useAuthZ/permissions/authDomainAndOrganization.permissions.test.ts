import { formatPermission } from '../utils';
import {
	AuthDomainListPermission,
	buildAuthDomainDeletePermission,
} from './auth-domain.permissions';
import {
	buildOrganizationReadPermission,
	buildOrganizationUpdatePermission,
} from './organization.permissions';

describe('auth domain permissions', () => {
	it('checks list on the collection wildcard', () => {
		expect(formatPermission(AuthDomainListPermission)).toBe('list:auth-domain:*');
	});

	it('checks delete on the given domain id', () => {
		expect(formatPermission(buildAuthDomainDeletePermission('domain-1'))).toBe(
			'delete:auth-domain:domain-1',
		);
	});
});

describe('organization permissions', () => {
	it('checks read on the given org id', () => {
		expect(formatPermission(buildOrganizationReadPermission('org-1'))).toBe(
			'read:organization:org-1',
		);
	});

	it('checks update on the given org id', () => {
		expect(formatPermission(buildOrganizationUpdatePermission('org-1'))).toBe(
			'update:organization:org-1',
		);
	});
});
