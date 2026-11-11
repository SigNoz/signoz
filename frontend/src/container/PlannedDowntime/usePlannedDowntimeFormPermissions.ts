import { useCallback, useMemo } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { useRuleLinkPermissions } from 'hooks/alerts/useRuleLinkPermissions';
import { usePlannedMaintenancePermissions } from 'hooks/plannedDowntime/usePlannedMaintenancePermissions';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
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

export function usePlannedDowntimeFormPermissions({
	initialValues,
	isEditMode,
	alertOptions,
	isAllRules,
	selectedRules,
}: PlannedDowntimeFormPermissionsInput): PlannedDowntimeFormPermissions {
	const { user } = useAppContext();
	const scheduleId = isEditMode ? initialValues.id : undefined;
	const isEdit = !!scheduleId;

	const schedule = usePlannedMaintenancePermissions(scheduleId ?? '', {
		enabled: isEdit,
	});

	const ruleIds = useMemo(() => toIds(alertOptions), [alertOptions]);
	const link = useRuleLinkPermissions(ruleIds);

	const storedIds = useMemo(
		() => (isEdit ? (initialValues.alertIds ?? []) : []),
		[isEdit, initialValues.alertIds],
	);
	const incomingIds = useMemo(
		() => (isAllRules ? [] : toIds(selectedRules)),
		[isAllRules, selectedRules],
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

	const isScheduleResolved =
		!isEdit || (!schedule.isLoading && !schedule.hasError);
	const isLinkResolved = !link.isLoading && !link.hasError;

	const getRuleDenial = useCallback(
		(ruleId: string): string | undefined => {
			if (!isScheduleResolved || !isLinkResolved) {
				return undefined;
			}

			const denied: BrandedPermission[] = [];
			if (storedIds.includes(ruleId)) {
				if (isEdit && !schedule.canDetach) {
					denied.push(schedule.detachPermission);
				}
				if (!link.canDetach(ruleId)) {
					denied.push(buildRuleDetachPermission(ruleId));
				}
			} else {
				if (isEdit && !schedule.canAttach) {
					denied.push(schedule.attachPermission);
				}
				if (!link.canAttach(ruleId)) {
					denied.push(buildRuleAttachPermission(ruleId));
				}
			}

			return denied.length > 0 ? formatDeniedMessage(denied, user.id) : undefined;
		},
		[
			isScheduleResolved,
			isLinkResolved,
			storedIds,
			isEdit,
			schedule,
			link,
			user.id,
		],
	);

	return {
		isReadOnly: isEdit && isScheduleResolved && !schedule.canEdit,
		saveChecks,
		getRuleDenial,
	};
}
