import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Ellipsis } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import AuthZDropdown from 'lib/authz/components/AuthZDropdown/AuthZDropdown';
import type { AuthZDropdownItemType } from 'lib/authz/components/AuthZDropdown/types';
import {
	buildRuleDeletePermission,
	buildRuleReadPermission,
	buildRuleUpdatePermission,
	RuleCreatePermission,
} from 'lib/authz/hooks/useAuthZ/permissions/rule.permissions';
import { toast } from '@signozhq/ui/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	deleteRuleByID,
	invalidateListRulesV3,
	patchRuleByID,
	cloneRuleByID,
} from 'api/generated/services/rules';
import type {
	RenderErrorResponseDTO,
	RuletypesPostableRuleDTO,
} from 'api/generated/services/sigNoz.schemas';
import type { AxiosError } from 'axios';

import type { AlertRule } from '../types';
import { ALERT_ACTIONS, alertActionLogEvent } from '../utils';

interface ActionsMenuProps {
	rule: AlertRule;
	onEdit: (rule: Pick<AlertRule, 'id'>, options?: { newTab?: boolean }) => void;
}

function ActionsMenu({ rule, onEdit }: ActionsMenuProps): JSX.Element {
	const queryClient = useQueryClient();
	const { updatePermission, deletePermission, editChecks, cloneChecks } =
		useMemo(() => {
			const id = rule.id ?? '';
			const read = buildRuleReadPermission(id);
			const update = buildRuleUpdatePermission(id);
			return {
				updatePermission: update,
				deletePermission: buildRuleDeletePermission(id),
				editChecks: [read, update],
				cloneChecks: [read, RuleCreatePermission],
			};
		}, [rule.id]);

	const handleToggle = useCallback((): void => {
		alertActionLogEvent(ALERT_ACTIONS.TOGGLE, rule);
		const newDisabled = !rule.disabled;
		toast.promise(
			patchRuleByID({ id: rule.id ?? '' }, {
				disabled: newDisabled,
			} as RuletypesPostableRuleDTO).then(() =>
				invalidateListRulesV3(queryClient),
			),
			{
				loading: newDisabled ? 'Disabling alert...' : 'Enabling alert...',
				success: newDisabled ? 'Alert disabled' : 'Alert enabled',
				error: (error): string => {
					const apiError = convertToApiError(
						error as AxiosError<RenderErrorResponseDTO>,
					);
					return apiError?.getErrorMessage() || 'Failed to toggle alert state';
				},
				position: 'top-right',
			},
		);
	}, [rule, queryClient]);

	const handleEdit = useCallback((): void => {
		alertActionLogEvent(ALERT_ACTIONS.EDIT, rule);
		onEdit(rule);
	}, [rule, onEdit]);

	const handleEditNewTab = useCallback((): void => {
		alertActionLogEvent(ALERT_ACTIONS.EDIT, rule);
		onEdit(rule, { newTab: true });
	}, [rule, onEdit]);

	const handleClone = useCallback((): void => {
		alertActionLogEvent(ALERT_ACTIONS.CLONE, rule);
		toast.promise(
			cloneRuleByID({
				id: rule.id,
			}).then(async (response) => {
				await invalidateListRulesV3(queryClient);
				const newRule = response.data;
				if (newRule) {
					onEdit(newRule);
				}
				return newRule;
			}),
			{
				loading: 'Cloning alert...',
				success: 'Alert cloned successfully',
				error: (error): string => {
					const apiError = convertToApiError(
						error as AxiosError<RenderErrorResponseDTO>,
					);
					return apiError?.getErrorMessage() || 'Failed to clone alert';
				},
				position: 'top-right',
			},
		);
	}, [rule, queryClient, onEdit]);

	const handleDelete = useCallback((): void => {
		alertActionLogEvent(ALERT_ACTIONS.DELETE, rule);
		toast.promise(
			deleteRuleByID({ id: rule.id ?? '' }).then(() =>
				invalidateListRulesV3(queryClient),
			),
			{
				loading: 'Deleting alert...',
				success: 'Alert deleted successfully',
				error: (error): string => {
					const apiError = convertToApiError(
						error as AxiosError<RenderErrorResponseDTO>,
					);
					return apiError?.getErrorMessage() || 'Failed to delete alert';
				},
				position: 'top-right',
			},
		);
	}, [rule, queryClient]);

	const menuItems = useMemo<AuthZDropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'toggle',
				label: rule.disabled ? 'Enable' : 'Disable',
				testId: 'alert-action-toggle',
				checks: [updatePermission],
				onClick: handleToggle,
			},
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				testId: 'alert-action-edit',
				checks: editChecks,
				onClick: handleEdit,
			},
			{
				type: 'item',
				value: 'edit-new-tab',
				label: 'Edit in New Tab',
				testId: 'alert-action-edit-new-tab',
				checks: editChecks,
				onClick: handleEditNewTab,
			},
			{
				type: 'item',
				value: 'clone',
				label: 'Clone',
				testId: 'alert-action-clone',
				checks: cloneChecks,
				onClick: handleClone,
			},
			{ type: 'separator', value: 'before-delete' },
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				testId: 'alert-action-delete',
				checks: [deletePermission],
				danger: true,
				onClick: handleDelete,
			},
		],
		[
			rule.disabled,
			updatePermission,
			deletePermission,
			editChecks,
			cloneChecks,
			handleToggle,
			handleEdit,
			handleEditNewTab,
			handleClone,
			handleDelete,
		],
	);

	const handleClick = (e: React.MouseEvent): void => {
		e.stopPropagation();
	};

	return (
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div onClick={handleClick}>
			<AuthZDropdown items={menuItems} nativeButton align="end" side="bottom">
				<Button
					aria-label="Action"
					variant="outlined"
					color="secondary"
					size="sm"
					icon
					testId="alert-actions"
				>
					<Ellipsis size={16} />
				</Button>
			</AuthZDropdown>
		</div>
	);
}

export default ActionsMenu;
