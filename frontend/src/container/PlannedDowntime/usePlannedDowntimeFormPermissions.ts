import { useCallback, useMemo, useState } from 'react';
import type { DefaultOptionType } from 'antd/es/select';
import type { AlertmanagertypesPlannedMaintenanceDTO } from 'api/generated/services/sigNoz.schemas';
import { AUTHZ_LOADING_TOOLTIP } from 'lib/authz/components/constants';
import { formatDeniedMessage } from 'lib/authz/components/formatDeniedMessage';
import {
	buildPlannedMaintenanceAttachPermission,
	buildPlannedMaintenanceDetachPermission,
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

interface UsePlannedDowntimeFormPermissionsArgs {
	initialValues: Partial<AlertmanagertypesPlannedMaintenanceDTO>;
	isEditMode: boolean;
	alertOptions: DefaultOptionType[];
	isAllRules: boolean;
	selectedRules: DefaultOptionType[];
}

export interface RuleAccess {
	disabled: boolean;
	/** The denial, or that the check is still running. */
	reason?: string;
}

export interface UsePlannedDowntimeFormPermissionsReturn {
	/** Editing a schedule the user may not update. */
	isReadOnly: boolean;
	saveChecks: BrandedPermission[];
	/** Whether a rule can be added or, if the schedule already has it, removed. */
	getRuleAccess: (ruleId: string) => RuleAccess;
	/** Starts the `attach` checks on rules the schedule does not silence. */
	onPickerOpen: () => void;
}

const ALLOWED: RuleAccess = { disabled: false };
const PENDING: RuleAccess = { disabled: true, reason: AUTHZ_LOADING_TOOLTIP };

const toIds = (options: DefaultOptionType[]): string[] =>
	options
		.map((option) => option.value)
		.filter((value) => value !== undefined && value !== null)
		.map(String);

/**
 * The schedule's own verbs when editing, and per rule `detach` if the schedule
 * silences it, `attach` if not. Silenced rules are checked up front, since
 * their tags can be removed without opening the picker; every other rule once
 * the picker opens. Save is checked by its own tooltip against `saveChecks`.
 */
export function usePlannedDowntimeFormPermissions({
	initialValues,
	isEditMode,
	alertOptions,
	isAllRules,
	selectedRules,
}: UsePlannedDowntimeFormPermissionsArgs): UsePlannedDowntimeFormPermissionsReturn {
	const { user } = useAppContext();
	const [hasPickerOpened, setHasPickerOpened] = useState(false);
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

	const upfrontChecks = useMemo(
		() => [
			...(scheduleChecks ? Object.values(scheduleChecks) : []),
			...storedIds.map(buildRuleDetachPermission),
		],
		[scheduleChecks, storedIds],
	);
	const pickerChecks = useMemo(
		() =>
			toIds(alertOptions)
				.filter((id) => !storedIds.includes(id))
				.map(buildRuleAttachPermission),
		[alertOptions, storedIds],
	);

	const upfront = useAuthZ(upfrontChecks, {
		enabled: upfrontChecks.length > 0,
	});
	const picker = useAuthZ(pickerChecks, {
		enabled: hasPickerOpened && pickerChecks.length > 0,
	});

	const getRuleAccess = useCallback(
		(ruleId: string): RuleAccess => {
			if (upfront.error || picker.error) {
				return ALLOWED;
			}

			const scheduleCheck = storedIds.includes(ruleId)
				? scheduleChecks?.detach
				: scheduleChecks?.attach;
			const required = [scheduleCheck, ruleCheck(ruleId)].filter(
				(permission): permission is BrandedPermission => !!permission,
			);
			const results = { ...upfront.permissions, ...picker.permissions };
			// A check reports loading only once its fetch starts, a render after the
			// picker opens; a missing result keeps the rule from flashing enabled.
			if (required.some((permission) => !results[permission])) {
				return PENDING;
			}

			const denied = required.filter(
				(permission) => !results[permission].isGranted,
			);
			return denied.length > 0
				? { disabled: true, reason: formatDeniedMessage(denied, user.id) }
				: ALLOWED;
		},
		[
			upfront.error,
			upfront.permissions,
			picker.error,
			picker.permissions,
			storedIds,
			scheduleChecks,
			ruleCheck,
			user.id,
		],
	);

	const onPickerOpen = useCallback(() => setHasPickerOpened(true), []);

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
			!upfront.isLoading &&
			!upfront.error &&
			!upfront.isGranted(scheduleChecks.update),
		saveChecks,
		getRuleAccess,
		onPickerOpen,
	};
}
