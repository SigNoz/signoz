import { useCallback, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { Ellipsis } from '@signozhq/icons';
import { Button } from '@signozhq/ui/button';
import { DropdownMenuSimple } from '@signozhq/ui/dropdown-menu';
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
import styles from './ActionsMenu.module.scss';

interface ActionsMenuProps {
	rule: AlertRule;
	onEdit: (rule: AlertRule, options?: { newTab?: boolean }) => void;
	isLoading?: boolean;
}

function ActionsMenu({
	rule,
	onEdit,
	isLoading: externalLoading = false,
}: ActionsMenuProps): JSX.Element {
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

	const menuItems = useMemo(
		() => [
			{
				key: 'toggle',
				label: rule.disabled ? 'Enable' : 'Disable',
				disabled: externalLoading,
				onClick: handleToggle,
			},
			{
				key: 'edit',
				label: 'Edit',
				disabled: externalLoading,
				onClick: handleEdit,
			},
			{
				key: 'edit-new-tab',
				label: 'Edit in New Tab',
				disabled: externalLoading,
				onClick: handleEditNewTab,
			},
			{
				key: 'clone',
				label: 'Clone',
				disabled: externalLoading,
				onClick: handleClone,
			},
			{ key: 'divider', type: 'divider' as const },
			{
				key: 'delete',
				label: 'Delete',
				disabled: externalLoading,
				danger: true,
				onClick: handleDelete,
			},
		],
		[
			rule.disabled,
			externalLoading,
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
			<DropdownMenuSimple menu={{ items: menuItems }} align="end">
				<Button
					variant="outlined"
					color="secondary"
					size="icon"
					className={styles.actionButton}
					data-testid="alert-actions"
				>
					<Ellipsis size={16} />
				</Button>
			</DropdownMenuSimple>
		</div>
	);
}

export default ActionsMenu;
