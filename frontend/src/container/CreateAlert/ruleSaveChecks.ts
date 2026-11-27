import { buildNotificationChannelLinkPermissions } from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
	buildRuleUpdatePermission,
	RuleAttachPermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { getLinkSaveChecks } from 'lib/authz/utils/getLinkSaveChecks';

/**
 * What creating a rule, or sending a test notification, needs: `create`, and
 * `attach` on the rule and on every channel it notifies.
 */
export function getRuleCreateChecks(channelIds: string[]): BrandedPermission[] {
	return getLinkSaveChecks({
		ownerChecks: [RuleCreatePermission],
		owner: {
			attach: RuleAttachPermission,
			detach: buildRuleDetachPermission('*'),
		},
		buildItemPermissions: buildNotificationChannelLinkPermissions,
		savedIds: [],
		incomingIds: channelIds,
	});
}

interface RuleSaveChecksInput {
	/** Absent for a new rule. */
	ruleId?: string;
	savedChannelIds: string[];
	selectedChannelIds: string[];
}

/** What saving a rule needs, as the rule routes check it. */
export function getRuleSaveChecks({
	ruleId,
	savedChannelIds,
	selectedChannelIds,
}: RuleSaveChecksInput): BrandedPermission[] {
	if (!ruleId) {
		return getRuleCreateChecks(selectedChannelIds);
	}
	return getLinkSaveChecks({
		ownerChecks: [buildRuleUpdatePermission(ruleId)],
		owner: {
			attach: buildRuleAttachPermission(ruleId),
			detach: buildRuleDetachPermission(ruleId),
		},
		buildItemPermissions: buildNotificationChannelLinkPermissions,
		savedIds: savedChannelIds,
		incomingIds: selectedChannelIds,
	});
}
