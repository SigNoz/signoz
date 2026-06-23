import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';

import { getResourcePanel } from '../../permissions.config';
import { PermissionScope, ResourcePermissions } from '../../types';

import ActionRow from './ActionRow';
import { getActionLabel } from './permissionDisplay.utils';

import styles from './ResourcePermissionCard.module.scss';

export interface ResourcePermissionCardProps {
	resource: ResourcePermissions;
	isExpanded?: boolean;
	onExpandChange?: (expanded: boolean) => void;
}

function ResourcePermissionCard({
	resource,
	isExpanded: controlledExpanded,
	onExpandChange,
}: ResourcePermissionCardProps): JSX.Element {
	const [internalExpanded, setInternalExpanded] = useState(false);
	const isControlled = controlledExpanded !== undefined;
	const isExpanded = isControlled ? controlledExpanded : internalExpanded;

	const { resourceLabel, resourceKind, actions, availableActions } = resource;

	const panel = getResourcePanel(resourceKind);
	const Icon = panel.icon;

	const handleToggleExpand = useCallback((): void => {
		if (isControlled) {
			onExpandChange?.(!controlledExpanded);
		} else {
			setInternalExpanded((prev) => !prev);
		}
	}, [isControlled, controlledExpanded, onExpandChange]);

	const grantedCount = useMemo(() => {
		return availableActions.filter((actionName) => {
			const config = actions[actionName];
			return !!config && config.scope !== PermissionScope.NONE;
		}).length;
	}, [availableActions, actions]);

	const totalCount = availableActions.length;

	return (
		<section
			className={styles.card}
			data-testid={`resource-section-${resourceKind}`}
		>
			<button
				type="button"
				className={styles.header}
				onClick={handleToggleExpand}
				aria-expanded={isExpanded}
				aria-label={`${resourceLabel}: ${grantedCount} of ${totalCount} permissions granted`}
				data-testid={`resource-card-header-${resourceKind}`}
			>
				<div className={styles.headerLeft}>
					<span className={styles.chevron}>
						{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</span>
					<span className={styles.icon}>
						<Icon size={16} />
					</span>
					<h4 className={styles.title}>{resourceLabel}</h4>
				</div>
				<span
					className={styles.grantedCount}
					data-testid={`granted-count-${resourceKind}`}
				>
					{grantedCount} / {totalCount} granted
				</span>
			</button>

			{isExpanded && (
				<div className={styles.rows}>
					{availableActions.map((actionName) => {
						const config = actions[actionName];
						if (!config) {
							return null;
						}

						const selectedIds =
							config.scope === PermissionScope.ONLY_SELECTED ? config.selectedIds : [];

						return (
							<ActionRow
								key={actionName}
								actionName={actionName}
								actionLabel={getActionLabel(actionName)}
								scope={config.scope}
								selectedIds={selectedIds}
							/>
						);
					})}
				</div>
			)}
		</section>
	);
}

export default ResourcePermissionCard;
