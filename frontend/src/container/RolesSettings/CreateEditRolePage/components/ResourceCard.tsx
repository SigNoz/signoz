import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import type { AuthZResource, AuthZVerb } from 'hooks/useAuthZ/types';

import { supportsOnlySelected } from '../../permissions.config';
import ActionToggle from './ActionToggle';

import styles from './ResourceCard.module.scss';
import {
	PermissionScope,
	ResourcePermissions,
} from 'container/RolesSettings/types';

interface ResourceCardProps {
	resource: ResourcePermissions;
	onActionChange: (
		resourceId: AuthZResource,
		action: AuthZVerb,
		scope: PermissionScope,
		selectedIds: string[],
	) => void;
	defaultExpanded?: boolean;
	isExpanded?: boolean;
	onExpandChange?: (expanded: boolean) => void;
	validationErrors?: Set<string>;
}

function ResourceCard({
	resource,
	onActionChange,
	defaultExpanded = false,
	isExpanded: controlledExpanded,
	onExpandChange,
	validationErrors,
}: ResourceCardProps): JSX.Element {
	const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
	const isControlled = controlledExpanded !== undefined;
	const isExpanded = isControlled ? controlledExpanded : internalExpanded;

	const handleToggleExpand = useCallback((): void => {
		if (isControlled) {
			onExpandChange?.(!controlledExpanded);
		} else {
			setInternalExpanded((prev) => !prev);
		}
	}, [isControlled, controlledExpanded, onExpandChange]);

	const handleScopeChange = useCallback(
		(action: AuthZVerb) =>
			(scope: PermissionScope): void => {
				const currentConfig = resource.actions[action];
				const selectedIds =
					scope === PermissionScope.ONLY_SELECTED
						? (currentConfig?.selectedIds ?? [])
						: [];
				onActionChange(resource.resourceId, action, scope, selectedIds);
			},
		[resource.resourceId, resource.actions, onActionChange],
	);

	const handleSelectedIdsChange = useCallback(
		(action: AuthZVerb) =>
			(ids: string[]): void => {
				const currentConfig = resource.actions[action];
				onActionChange(
					resource.resourceId,
					action,
					currentConfig?.scope ?? PermissionScope.ONLY_SELECTED,
					ids,
				);
			},
		[resource.resourceId, resource.actions, onActionChange],
	);

	const grantedCount = useMemo(() => {
		return Object.values(resource.actions).filter(
			(config) => !!config && config.scope !== PermissionScope.NONE,
		).length;
	}, [resource.actions]);

	const totalCount = resource.availableActions.length;

	return (
		<div
			className={styles.resourceCard}
			data-testid={`resource-card-${resource.resourceId}`}
		>
			<button
				type="button"
				className={styles.resourceCardHeader}
				onClick={handleToggleExpand}
				aria-expanded={isExpanded}
				aria-label={`${resource.resourceLabel}: ${grantedCount} of ${totalCount} permissions granted`}
				data-testid={`resource-card-header-${resource.resourceId}`}
			>
				<div className={styles.resourceCardHeaderLeft}>
					<span className={styles.resourceCardChevron}>
						{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
					</span>
					<span className={styles.resourceCardLabel}>{resource.resourceLabel}</span>
				</div>
				<div className={styles.resourceCardHeaderRight}>
					<span className={styles.resourceCardGrantedCount}>
						{grantedCount} / {totalCount} granted
					</span>
				</div>
			</button>

			{isExpanded && (
				<div className={styles.resourceCardBody}>
					{resource.availableActions.map((action) => {
						const actionConfig = resource.actions[action] ?? {
							scope: PermissionScope.NONE,
							selectedIds: [],
						};
						return (
							<ActionToggle
								key={action}
								action={action}
								scope={actionConfig.scope}
								selectedIds={actionConfig.selectedIds}
								resource={resource.resourceId}
								canSelectIndividually={supportsOnlySelected(action)}
								onScopeChange={handleScopeChange(action)}
								onSelectedIdsChange={handleSelectedIdsChange(action)}
								hasError={validationErrors?.has(`${resource.resourceId}:${action}`)}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default ResourceCard;
