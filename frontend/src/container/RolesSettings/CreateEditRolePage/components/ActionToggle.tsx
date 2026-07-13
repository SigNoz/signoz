import { useCallback, useMemo, useState } from 'react';
import { ConfirmDialog } from '@signozhq/ui/dialog';
import { Divider } from '@signozhq/ui/divider';
import { ToggleGroupSimple } from '@signozhq/ui/toggle-group';
import { Typography } from '@signozhq/ui/typography';

import { PermissionScope } from '../../types';
import { getResourcePanel } from '../../permissions.config';
import ItemInputSelector from './ItemInputSelector';

import styles from './ActionToggle.module.scss';
import { AuthZResource, AuthZVerb } from 'lib/authz/hooks/useAuthZ/types';
import { getActionLabel } from 'container/RolesSettings/ViewRolePage/components/permissionDisplay.utils';

const SCOPE_LABELS: Record<PermissionScope, string> = {
	[PermissionScope.NONE]: 'None',
	[PermissionScope.ALL]: 'All',
	[PermissionScope.ONLY_SELECTED]: 'Only selected',
};

interface ActionToggleProps {
	action: AuthZVerb;
	scope: string;
	selectedIds: string[];
	resource: AuthZResource;
	canSelectIndividually: boolean;
	onScopeChange: (scope: PermissionScope) => void;
	onSelectedIdsChange: (ids: string[]) => void;
	hasError?: boolean;
}

function ActionToggle({
	action,
	scope,
	selectedIds,
	resource,
	canSelectIndividually,
	onScopeChange,
	onSelectedIdsChange,
	hasError = false,
}: ActionToggleProps): JSX.Element {
	const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
	const [pendingScope, setPendingScope] = useState<PermissionScope | null>(null);

	const displayLabel = getActionLabel(action);

	const scopeItems: Array<{ value: PermissionScope; label: string }> =
		useMemo(() => {
			const items = [
				{ value: PermissionScope.NONE, label: SCOPE_LABELS[PermissionScope.NONE] },
				{ value: PermissionScope.ALL, label: SCOPE_LABELS[PermissionScope.ALL] },
			];
			if (canSelectIndividually) {
				items.push({
					value: PermissionScope.ONLY_SELECTED,
					label: SCOPE_LABELS[PermissionScope.ONLY_SELECTED],
				});
			}
			return items;
		}, [canSelectIndividually]);

	const handleToggleChange = useCallback(
		(value: string): void => {
			if (!value) {
				return;
			}

			const isLeavingOnlySelected =
				scope === PermissionScope.ONLY_SELECTED &&
				value !== PermissionScope.ONLY_SELECTED;
			const hasSelectedItems = selectedIds.length > 0;

			if (isLeavingOnlySelected && hasSelectedItems) {
				setPendingScope(value as PermissionScope);
				setConfirmDialogOpen(true);
				return;
			}

			onScopeChange(value as PermissionScope);
		},
		[scope, selectedIds.length, onScopeChange],
	);

	const handleConfirmScopeChange = useCallback((): void => {
		if (pendingScope) {
			onSelectedIdsChange([]);
			onScopeChange(pendingScope);
		}
		setConfirmDialogOpen(false);
		setPendingScope(null);
	}, [pendingScope, onSelectedIdsChange, onScopeChange]);

	const handleCancelScopeChange = useCallback((): void => {
		setConfirmDialogOpen(false);
		setPendingScope(null);
	}, []);

	return (
		<>
			<div
				className={styles.actionToggle}
				data-testid={`action-toggle-${resource}-${action}`}
			>
				<div className={styles.actionToggleHeader}>
					<Typography as="span" size="base">
						{displayLabel}
					</Typography>
					<ToggleGroupSimple
						type="single"
						size="sm"
						value={scope}
						onChange={handleToggleChange}
						items={scopeItems}
						className={styles.actionToggleScopeToggle}
						testId={`action-toggle-scope-${resource}-${action}`}
					/>
				</div>

				{scope === PermissionScope.ONLY_SELECTED && (
					<div className={styles.actionToggleSelectorWrapper}>
						<Divider />

						<ItemInputSelector
							placeholder={getResourcePanel(resource).selectorPlaceholder}
							selectedIds={selectedIds}
							onChange={onSelectedIdsChange}
							docsAnchor={getResourcePanel(resource).docsAnchor}
							hasError={hasError}
						/>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={confirmDialogOpen}
				onOpenChange={(next): void => {
					if (!next) {
						handleCancelScopeChange();
					}
				}}
				title="Change permission scope?"
				confirmText="Change scope"
				cancelText="Cancel"
				onConfirm={handleConfirmScopeChange}
				onCancel={handleCancelScopeChange}
			>
				<Typography>
					You have {selectedIds.length} item{selectedIds.length > 1 ? 's' : ''}{' '}
					selected. Changing the scope will clear your current items.
					<br />
					<br />
					Don&apos;t worry, this doesn&apos;t update this role yet, it only confirms
					that you want to clear the items.
				</Typography>
			</ConfirmDialog>
		</>
	);
}

export default ActionToggle;
