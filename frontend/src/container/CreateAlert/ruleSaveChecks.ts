import {
	buildNotificationChannelAttachPermission,
	buildNotificationChannelDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/notification-channel.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
	buildRuleUpdatePermission,
	RuleAttachPermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

const difference = (from: string[], remove: string[]): string[] => {
	const removed = new Set(remove);
	return [...new Set(from.filter((id) => !removed.has(id)))];
};

/**
 * What creating a rule, or sending a test notification, needs: `create`, and
 * `attach` on the rule and on every channel it notifies.
 */
export function getRuleCreateChecks(channelIds: string[]): BrandedPermission[] {
	const ids = [...new Set(channelIds)];
	if (ids.length === 0) {
		return [RuleCreatePermission];
	}
	return [
		RuleCreatePermission,
		RuleAttachPermission,
		...ids.map(buildNotificationChannelAttachPermission),
	];
}

interface RuleSaveChecksInput {
	/** Absent for a new rule. */
	ruleId?: string;
	savedChannelIds: string[];
	selectedChannelIds: string[];
}

/**
 * What saving a rule needs, as the rule routes check it. An edit needs
 * `update`, and `attach`/`detach` on the rule and on each channel it gains or
 * loses; channels it keeps are not checked.
 */
export function getRuleSaveChecks({
	ruleId,
	savedChannelIds,
	selectedChannelIds,
}: RuleSaveChecksInput): BrandedPermission[] {
	if (!ruleId) {
		return getRuleCreateChecks(selectedChannelIds);
	}

	const attached = difference(selectedChannelIds, savedChannelIds);
	const detached = difference(savedChannelIds, selectedChannelIds);

	const checks = [buildRuleUpdatePermission(ruleId)];
	if (attached.length > 0) {
		checks.push(
			buildRuleAttachPermission(ruleId),
			...attached.map(buildNotificationChannelAttachPermission),
		);
	}
	if (detached.length > 0) {
		checks.push(
			buildRuleDetachPermission(ruleId),
			...detached.map(buildNotificationChannelDetachPermission),
		);
	}
	return checks;
}
