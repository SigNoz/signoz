import { BrandedPermission } from '../types';
import { buildPermission } from '../utils';

export const AuthDomainListPermission = buildPermission(
	'list',
	'auth-domain:*',
);

export const buildAuthDomainDeletePermission = (
	id: string,
): BrandedPermission => buildPermission('delete', `auth-domain:${id}`);
