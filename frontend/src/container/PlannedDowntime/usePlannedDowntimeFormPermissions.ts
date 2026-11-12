import { useCallback, useMemo } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceReadPermission,
	buildPlannedMaintenanceUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import { useAuthZ } from 'lib/authz/hooks/useAuthZ/useAuthZ';
import { useAppContext } from 'providers/App/App';

import { getDowntimeSaveChecks } from './downtimeSaveChecks';

interface PlannedDowntimeFormPermissionsInput {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	isEditMode: boolean;
	alertOptions: DefaultOptionType[];
	isAllRules: boolean;
	selectedRules: DefaultOptionType[];
}

export interface PlannedDowntimeFormPermissions {
	/** Editing a schedule the user may read but not update. */
	isReadOnly: boolean;
	saveChecks: BrandedPermission[];
	/** Why a rule cannot be added or, if the schedule already has it, removed. */
	getRuleDenial: (ruleId: string) => string | undefined;
}

const toIds = (options: DefaultOptionType[]): string[] =>
	options
		.map((option) => option.value)
		.filter((value) => value !== undefined && value !== null)
		.map(String);

/**
 * Only the checks the form shows run here: the schedule's own verbs when
 * editing, and per rule `detach` if the schedule silences it, `attach` if not.
 * Save is checked by its own tooltip against `saveChecks`.
 */
export function usePlannedDowntimeFormPermissions({
	initialValues,
	isEditMode,
	alertOptions,
	isAllRules,
	selectedRules,
}: PlannedDowntimeFormPermissionsInput): PlannedDowntimeFormPermissions {
	const { user } = useAppContext();
	const scheduleId = isEditMode ? initialValues.id : undefined;

	const storedIds = useMemo(
		() => (scheduleId ? (initialValues.alertIds ?? []) : []),
		[scheduleId, initialValues.alertIds],
	);
	const incomingIds = useMemo(
		() => (isAllRules ? [] : toIds(selectedRules)),
		[isAllRules, selectedRules],
	);

	const scheduleChecks = useMemo(
		() =>
			scheduleId
				? {
						read: buildPlannedMaintenanceReadPermission(scheduleId),
						update: buildPlannedMaintenanceUpdatePermission(scheduleId),
						attach: buildPlannedMaintenanceAttachPermission(scheduleId),
						detach: buildPlannedMaintenanceDetachPermission(scheduleId),
					}
				: undefined,
		[scheduleId],
	);

	const ruleCheck = useCallback(
		(ruleId: string): BrandedPermission =>
			storedIds.includes(ruleId)
				? buildRuleDetachPermission(ruleId)
				: buildRuleAttachPermission(ruleId),
		[storedIds],
	);

	const checks = useMemo(
		() => [
			...(scheduleChecks ? Object.values(scheduleChecks) : []),
			...toIds(alertOptions).map(ruleCheck),
		],
		[scheduleChecks, alertOptions, ruleCheck],
	);

	const { isGranted, isLoading, error } = useAuthZ(checks, {
		enabled: checks.length > 0,
	});
	const isResolved = !isLoading && !error;

	const getRuleDenial = useCallback(
		(ruleId: string): string | undefined => {
			if (!isResolved) {
				return undefined;
			}

			const scheduleCheck = storedIds.includes(ruleId)
				? scheduleChecks?.detach
				: scheduleChecks?.attach;
			const denied = [scheduleCheck, ruleCheck(ruleId)].filter(
				(permission): permission is BrandedPermission =>
					!!permission && !isGranted(permission),
			);

			return denied.length > 0 ? formatDeniedMessage(denied, user.id) : undefined;
		},
		[isResolved, storedIds, scheduleChecks, ruleCheck, isGranted, user.id],
	);

	const saveChecks = useMemo(
		() =>
			getDowntimeSaveChecks({
				scheduleId,
				storedAlertIds: storedIds,
				incomingAlertIds: incomingIds,
			}),
		[scheduleId, storedIds, incomingIds],
	);

	return {
		isReadOnly:
			!!scheduleChecks &&
			isResolved &&
			!(isGranted(scheduleChecks.read) && isGranted(scheduleChecks.update)),
		saveChecks,
		getRuleDenial,
	};
}
