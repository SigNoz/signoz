import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from '@signozhq/icons';
import { Skeleton } from 'antd';

import { useRolePermissions } from '../../hooks/useRolePermissions';

import ResourcePermissionCard from './ResourcePermissionCard';

import styles from './PermissionOverview.module.scss';

export interface PermissionOverviewProps {
	roleId: string;
	expandedResources?: Set<string>;
	onExpandedResourcesChange?: (expanded: Set<string>) => void;
}

function PermissionOverview({
	roleId,
	expandedResources: externalExpanded,
	onExpandedResourcesChange,
}: PermissionOverviewProps): JSX.Element {
	const { data: permissions, isLoading, isError } = useRolePermissions(roleId);
	const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
		new Set(),
	);

	const isControlled = externalExpanded !== undefined;
	const expandedResources = isControlled ? externalExpanded : internalExpanded;

	const updateExpandedResources = useCallback(
		(updater: (prev: Set<string>) => Set<string>): void => {
			if (isControlled) {
				onExpandedResourcesChange?.(updater(externalExpanded));
			} else {
				setInternalExpanded(updater);
			}
		},
		[isControlled, externalExpanded, onExpandedResourcesChange],
	);

	const resources = useMemo(
		() => permissions?.resources ?? [],
		[permissions?.resources],
	);

	const allExpanded = useMemo(
		() =>
			resources.length > 0 &&
			resources.every((r) => expandedResources.has(r.resourceId)),
		[resources, expandedResources],
	);

	const handleToggleAll = useCallback((): void => {
		updateExpandedResources((prev) => {
			if (resources.length > 0 && resources.every((r) => prev.has(r.resourceId))) {
				return new Set();
			}
			return new Set(resources.map((r) => r.resourceId));
		});
	}, [resources, updateExpandedResources]);

	const handleExpandChange = useCallback(
		(resourceId: string) =>
			(expanded: boolean): void => {
				updateExpandedResources((prev) => {
					const next = new Set(prev);
					if (expanded) {
						next.add(resourceId);
					} else {
						next.delete(resourceId);
					}
					return next;
				});
			},
		[updateExpandedResources],
	);

	if (isLoading) {
		return (
			<div className={styles.container} data-testid="permission-overview-loading">
				<Skeleton active paragraph={{ rows: 8 }} />
			</div>
		);
	}

	if (isError || !permissions) {
		return (
			<div className={styles.container} data-testid="permission-overview-error">
				<p className={styles.errorText}>Failed to load permissions</p>
			</div>
		);
	}

	return (
		<div className={styles.container} data-testid="permission-overview">
			<div className={styles.collapseAction}>
				<button
					type="button"
					className={styles.collapseButton}
					onClick={handleToggleAll}
					data-testid="toggle-all-button"
				>
					{allExpanded ? (
						<>
							<ChevronUp size={14} />
							Collapse all
						</>
					) : (
						<>
							<ChevronDown size={14} />
							Expand all
						</>
					)}
				</button>
			</div>
			<div className={styles.grid}>
				{resources.map((resource) => (
					<ResourcePermissionCard
						key={resource.resourceId}
						resource={resource}
						isExpanded={expandedResources.has(resource.resourceId)}
						onExpandChange={handleExpandChange(resource.resourceId)}
					/>
				))}
			</div>
		</div>
	);
}

export default PermissionOverview;
