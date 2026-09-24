import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from '@signozhq/icons';
import type { AuthZResource, AuthZVerb } from 'lib/authz/hooks/useAuthZ/types';

import { Typography } from '@signozhq/ui/typography';

import { useRoleGrantedCount } from '../../hooks/useRoleGrantedCount';
import { supportsOnlySelected } from '../../permissions.config';
import ActionToggle from './ActionToggle';

import styles from './ResourceCard.module.scss';
import { PermissionScope, ResourcePermissions } from '../../types';
import cx from 'classnames';

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

	const [grantedCount, totalCount] = useRoleGrantedCount(resource);

	const hasErrorOnResource = useMemo(
		() =>
			Array.from(validationErrors ?? []).some((r) =>
				r.startsWith(resource.resourceId),
			),
		[validationErrors, resource.resourceId],
	);

	return (
		<div
			className={cx(
				styles.resourceCard,
				hasErrorOnResource && !isExpanded && styles.resourceCardError,
			)}
			data-testid={`resource-card-${resource.resourceId}`}
			data-state={hasErrorOnResource && !isExpanded ? 'error' : undefined}
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
					<Typography as="span" size="base" weight="medium">
						{resource.resourceLabel}
					</Typography>
				</div>
				<div className={styles.resourceCardHeaderRight}>
					<Typography as="span" size="base" color="muted">
						{grantedCount} / {totalCount} granted
					</Typography>
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
