import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceUpdatePermission,
	PlannedMaintenanceAttachPermission,
	PlannedMaintenanceCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import type { LinkPermissions } from 'lib/authz/hooks/useLinkPickerAccess/types';
import { getLinkSaveChecks } from 'lib/authz/utils/getLinkSaveChecks';

/** An empty alert list silences every rule, which the backend checks as `*`. */
const ALL_RULES = '*';

const withAllRulesIfEmpty = (ids: string[]): string[] =>
	ids.length === 0 ? [ALL_RULES] : ids;

interface DowntimeSaveChecksInput {
	/** Absent for a new schedule. */
	scheduleId?: string;
	storedAlertIds: string[];
	/** Absent while no rule is picked: Save is blocked then, so nothing is linked. */
	incomingAlertIds?: string[];
}

const buildRulePermissions = (id: string): LinkPermissions => ({
	attach: buildRuleAttachPermission(id),
	detach: buildRuleDetachPermission(id),
});

/**
 * What saving a schedule needs, as the downtime routes check it. Create links
 * every picked rule, or every rule when none are. An edit diffs the incoming
 * list against the stored one, both reading empty as every rule: re-saving an
 * all-rules schedule links nothing new, and switching to all rules attaches
 * `*` and detaches the old ones. With nothing picked yet, nothing is linked.
 */
export function getDowntimeSaveChecks({
	scheduleId,
	storedAlertIds,
	incomingAlertIds,
}: DowntimeSaveChecksInput): BrandedPermission[] {
	const savedIds = withAllRulesIfEmpty(storedAlertIds);
	const incomingIds = incomingAlertIds && withAllRulesIfEmpty(incomingAlertIds);

	return getLinkSaveChecks(
		scheduleId
			? {
					ownerChecks: [buildPlannedMaintenanceUpdatePermission(scheduleId)],
					owner: {
						attach: buildPlannedMaintenanceAttachPermission(scheduleId),
						detach: buildPlannedMaintenanceDetachPermission(scheduleId),
					},
					buildItemPermissions: buildRulePermissions,
					savedIds,
					incomingIds: incomingIds ?? savedIds,
				}
			: {
					ownerChecks: [PlannedMaintenanceCreatePermission],
					owner: {
						attach: PlannedMaintenanceAttachPermission,
						detach: buildPlannedMaintenanceDetachPermission('*'),
					},
					buildItemPermissions: buildRulePermissions,
					savedIds: [],
					incomingIds: incomingIds ?? [],
				},
	);
}
