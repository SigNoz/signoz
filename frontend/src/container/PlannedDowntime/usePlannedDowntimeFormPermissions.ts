import { type ReactNode, useMemo } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
	buildPlannedMaintenanceUpdatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/planned-maintenance.permissions';
import {
	buildRuleAttachPermission,
	buildRuleDetachPermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { deniedTooltip } from 'lib/authz/components/deniedTooltip';
import type { BrandedPermission } from 'lib/authz/hooks/useAuthZ/types';
import type {
	LinkAccess,
	LinkPermissions,
} from 'lib/authz/hooks/useLinkPickerAccess/types';
import { useLinkPickerAccess } from 'lib/authz/hooks/useLinkPickerAccess/useLinkPickerAccess';
import { useAppContext } from 'providers/App/App';

import { getDowntimeSaveChecks } from './downtimeSaveChecks';

interface UsePlannedDowntimeFormPermissionsArgs {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	isEditMode: boolean;
	alertOptions: DefaultOptionType[];
	isAllRules: boolean;
	selectedRules: DefaultOptionType[];
}

export interface UsePlannedDowntimeFormPermissionsReturn {
	/** Editing a schedule the user may not update. */
	isReadOnly: boolean;
	/** The denial a read-only control shows; set whenever editing, so a control keeps its tooltip. */
	readOnlyReason?: ReactNode;
	saveChecks: BrandedPermission[];
	/** Whether a rule can be added or, if the schedule already has it, removed. */
	getRuleAccess: (ruleId: string) => LinkAccess;
	/** Starts the `attach` checks on unsilenced rules once the picker opens. */
	onPickerVisibleChange: (open: boolean) => void;
}

const toIds = (options: DefaultOptionType[]): string[] =>
	options
		.map((option) => option.value)
		.filter((value) => value !== undefined && value !== null)
		.map(String);

const buildRulePermissions = (id: string): LinkPermissions => ({
	attach: buildRuleAttachPermission(id),
	detach: buildRuleDetachPermission(id),
});

/**
 * The schedule's own verbs when editing, and per rule `detach` if the schedule
 * silences it, `attach` if not. Save is checked by its own button against
 * `saveChecks`.
 */
export function usePlannedDowntimeFormPermissions({
	initialValues,
	isEditMode,
	alertOptions,
	isAllRules,
	selectedRules,
}: UsePlannedDowntimeFormPermissionsArgs): UsePlannedDowntimeFormPermissionsReturn {
	const { user } = useAppContext();
	const scheduleId = isEditMode ? initialValues.id : undefined;

	const storedIds = useMemo(
		() => (scheduleId ? (initialValues.alertIds ?? []) : []),
		[scheduleId, initialValues.alertIds],
	);
	const incomingIds = useMemo(() => {
		if (isAllRules) {
			return [];
		}
		const picked = toIds(selectedRules);
		return picked.length > 0 ? picked : undefined;
	}, [isAllRules, selectedRules]);
	const optionIds = useMemo(() => toIds(alertOptions), [alertOptions]);

	const update = useMemo(
		() =>
			scheduleId ? buildPlannedMaintenanceUpdatePermission(scheduleId) : undefined,
		[scheduleId],
	);
	const owner = useMemo(
		() =>
			scheduleId
				? {
						attach: buildPlannedMaintenanceAttachPermission(scheduleId),
						detach: buildPlannedMaintenanceDetachPermission(scheduleId),
					}
				: undefined,
		[scheduleId],
	);
	const ownerChecks = useMemo(() => (update ? [update] : []), [update]);

	const { getAccess, onPickerVisibleChange, isOwnerDenied } =
		useLinkPickerAccess({
			owner,
			ownerChecks,
			linkedIds: storedIds,
			optionIds,
			buildItemPermissions: buildRulePermissions,
		});

	const saveChecks = useMemo(
		() =>
			getDowntimeSaveChecks({
				scheduleId,
				storedAlertIds: storedIds,
				incomingAlertIds: incomingIds,
			}),
		[scheduleId, storedIds, incomingIds],
	);

	const readOnlyReason = useMemo(
		() => (update ? deniedTooltip([update], user.id) : undefined),
		[update, user.id],
	);

	return {
		isReadOnly: !!update && isOwnerDenied(update),
		readOnlyReason,
		saveChecks,
		getRuleAccess: getAccess,
		onPickerVisibleChange,
	};
}
