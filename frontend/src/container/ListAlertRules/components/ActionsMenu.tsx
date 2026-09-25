import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Ellipsis } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { Dropdown, type DropdownItemType } from '@signozhq/ui/dropdown';
import { toast } from '@signozhq/ui/sonner';
import { convertToApiError } from 'api/ErrorResponseHandlerForGeneratedAPIs';
import {
	createRule,
	deleteRuleByID,
	invalidateListRules,
	patchRuleByID,
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
	onEdit: (rule: AlertRule, options?: { newTab?: boolean }) => void;
}

function ActionsMenu({ rule, onEdit }: ActionsMenuProps): JSX.Element {
	const queryClient = useQueryClient();

	const handleToggle = useCallback((): void => {
		alertActionLogEvent(ALERT_ACTIONS.TOGGLE, rule);
		const newDisabled = !rule.disabled;
		toast.promise(
			patchRuleByID({ id: rule.id ?? '' }, {
				disabled: newDisabled,
			} as RuletypesPostableRuleDTO).then(() => invalidateListRules(queryClient)),
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
			createRule({
				...rule,
				alert: `${rule.alert} - Copy`,
			} as RuletypesPostableRuleDTO).then(async (response) => {
				await invalidateListRules(queryClient);
				const newRule = response.data;
				if (newRule) {
					onEdit(newRule as AlertRule);
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
				invalidateListRules(queryClient),
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

	const menuItems = useMemo<DropdownItemType[]>(
		() => [
			{
				type: 'item',
				value: 'toggle',
				label: rule.disabled ? 'Enable' : 'Disable',
				onClick: handleToggle,
			},
			{
				type: 'item',
				value: 'edit',
				label: 'Edit',
				onClick: handleEdit,
			},
			{
				type: 'item',
				value: 'edit-new-tab',
				label: 'Edit in New Tab',
				onClick: handleEditNewTab,
			},
			{
				type: 'item',
				value: 'clone',
				label: 'Clone',
				onClick: handleClone,
			},
			{ type: 'separator', value: 'before-delete' },
			{
				type: 'item',
				value: 'delete',
				label: 'Delete',
				danger: true,
				onClick: handleDelete,
			},
		],
		[
			rule.disabled,
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
			<Dropdown items={menuItems} nativeButton align="end" side="bottom">
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
			</Dropdown>
		</div>
	);
}

export default ActionsMenu;
