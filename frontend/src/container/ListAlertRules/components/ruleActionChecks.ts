import {
	buildRuleDeletePermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

export type RuleAction = 'toggle' | 'edit' | 'clone' | 'delete';

/** What each row action needs. Edit and clone open or copy the stored rule, so they also need `read`. */
export const getRuleActionChecks = (
	ruleId: string,
): Record<RuleAction, BrandedPermission[]> => {
	const read = buildRuleReadPermission(ruleId);
	const update = buildRuleUpdatePermission(ruleId);
	return {
		toggle: [update],
		edit: [read, update],
		clone: [read, RuleCreatePermission],
		delete: [buildRuleDeletePermission(ruleId)],
	};
};
