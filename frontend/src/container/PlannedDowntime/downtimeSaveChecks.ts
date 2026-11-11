import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceReadPermission,
	buildPlannedMaintenanceUpdatePermission,
	PlannedMaintenanceAttachPermission,
	PlannedMaintenanceCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';

/** An empty alert list silences every rule, which the backend checks as `*`. */
const ALL_RULES = '*';

const withAllRulesIfEmpty = (ids: string[]): string[] =>
	ids.length === 0 ? [ALL_RULES] : ids;

const difference = (from: string[], remove: string[]): string[] => {
	const removed = new Set(remove);
	return [...new Set(from.filter((id) => !removed.has(id)))];
};

interface DowntimeSaveChecksInput {
	/** Absent for a new schedule. */
	scheduleId?: string;
	storedAlertIds: string[];
	incomingAlertIds: string[];
}

/**
 * What saving a schedule needs, as the downtime routes check it. Create links
 * every picked rule, or every rule when none are. An edit diffs the incoming
 * list against the stored one, where only the stored side reads empty as every
 * rule: re-saving an all-rules schedule detaches `*`, and switching to all
 * rules detaches the old ones without attaching `*`.
 */
export function getDowntimeSaveChecks({
	scheduleId,
	storedAlertIds,
	incomingAlertIds,
}: DowntimeSaveChecksInput): BrandedPermission[] {
	if (!scheduleId) {
		return [
			PlannedMaintenanceCreatePermission,
			PlannedMaintenanceAttachPermission,
			...withAllRulesIfEmpty(incomingAlertIds).map(buildRuleAttachPermission),
		];
	}

	const stored = withAllRulesIfEmpty(storedAlertIds);
	const attached = difference(incomingAlertIds, stored);
	const detached = difference(stored, incomingAlertIds);

	const checks = [
		buildPlannedMaintenanceReadPermission(scheduleId),
		buildPlannedMaintenanceUpdatePermission(scheduleId),
	];
	if (attached.length > 0) {
		checks.push(
			buildPlannedMaintenanceAttachPermission(scheduleId),
			...attached.map(buildRuleAttachPermission),
		);
	}
	if (detached.length > 0) {
		checks.push(
			buildPlannedMaintenanceDetachPermission(scheduleId),
			...detached.map(buildRuleDetachPermission),
		);
	}
	return checks;
}
