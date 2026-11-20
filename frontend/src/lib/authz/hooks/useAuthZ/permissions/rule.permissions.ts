import { buildPermission } from '../utils';
import type { BrandedPermission } from '../types';

// Collection-level. Wildcard selector required for correct response key matching.
// `list` also covers rule views, which the backend gates on it.
export const RuleListPermission = buildPermission('list', 'rule:*');
export const RuleCreatePermission = buildPermission('create', 'rule:*');

// Resource-level. Requires a specific rule id.
export const buildRuleReadPermission = (id: string): BrandedPermission =>
	buildPermission('read', `rule:${id}`);
export const buildRuleUpdatePermission = (id: string): BrandedPermission =>
	buildPermission('update', `rule:${id}`);
export const buildRuleDeletePermission = (id: string): BrandedPermission =>
	buildPermission('delete', `rule:${id}`);
export const buildRuleAttachPermission = (id: string): BrandedPermission =>
	buildPermission('attach', `rule:${id}`);
export const buildRuleDetachPermission = (id: string): BrandedPermission =>
	buildPermission('detach', `rule:${id}`);
