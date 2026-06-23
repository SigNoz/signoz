import { useCallback, useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import type { ScopeBadgeVariant } from './permissionDisplay.utils';
import { getScopeBadge } from './permissionDisplay.utils';
import SelectedItemsChips from './SelectedItemsChips';

import styles from './ActionRow.module.scss';
import { PermissionScope } from 'container/RolesSettings/types';

const BADGE_VARIANT_CLASS: Record<ScopeBadgeVariant, string> = {
	all: styles.all,
	none: styles.none,
	selected: styles.selected,
};

export interface ActionRowProps {
	actionName: string;
	actionLabel: string;
	scope: PermissionScope;
	selectedIds?: string[];
}

function ActionRow({
	actionName,
	actionLabel,
	scope,
	selectedIds = [],
}: ActionRowProps): JSX.Element {
	const isExpandable =
		scope === PermissionScope.ONLY_SELECTED && selectedIds.length > 0;

	const [isExpanded, setIsExpanded] = useState(isExpandable);

	const handleToggle = useCallback((): void => {
		setIsExpanded((prev) => !prev);
	}, []);

	const badge = getScopeBadge(scope, selectedIds.length);

	return (
		<div className={styles.row} data-testid={`permission-row-${actionName}`}>
			<div className={styles.rowHeader}>
				<div className={styles.rowLeft}>
					{isExpandable && (
						<button
							type="button"
							className={styles.chevron}
							onClick={handleToggle}
							aria-expanded={isExpanded}
							aria-label={`${isExpanded ? 'Collapse' : 'Expand'} selected items`}
							data-testid={`toggle-items-${actionName}`}
						>
							{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
						</button>
					)}
					<span className={styles.label}>{actionLabel}</span>
				</div>
				<span
					className={`${styles.badge} ${BADGE_VARIANT_CLASS[badge.variant]}`}
					data-testid={`scope-badge-${actionName}`}
				>
					{badge.label}
				</span>
			</div>

			{isExpanded && isExpandable && (
				<SelectedItemsChips
					ids={selectedIds}
					testId={`selected-items-${actionName}`}
				/>
			)}
		</div>
	);
}

export default ActionRow;
