import { BrandedPermission } from '../types';
import { buildPermission } from '../utils';

export const IngestionKeyListPermission = buildPermission(
	'list',
	'ingestion-key:*',
);

export const IngestionKeyCreatePermission = buildPermission(
	'create',
	'ingestion-key:*',
);

export const buildIngestionKeyUpdatePermission = (
	keyId: string,
): BrandedPermission => buildPermission('update', `ingestion-key:${keyId}`);

export const buildIngestionKeyDeletePermission = (
	keyId: string,
): BrandedPermission => buildPermission('delete', `ingestion-key:${keyId}`);

export const buildIngestionKeyAttachPermission = (
	keyId: string,
): BrandedPermission => buildPermission('attach', `ingestion-key:${keyId}`);

export const buildIngestionKeyDetachPermission = (
	keyId: string,
): BrandedPermission => buildPermission('detach', `ingestion-key:${keyId}`);

export const IngestionLimitCreatePermission = buildPermission(
	'create',
	'ingestion-limit:*',
);
export const buildIngestionLimitUpdatePermission = (
	id: string,
): BrandedPermission => buildPermission('update', `ingestion-limit:${id}`);

export const buildIngestionLimitDeletePermission = (
	id: string,
): BrandedPermission => buildPermission('delete', `ingestion-limit:${id}`);
