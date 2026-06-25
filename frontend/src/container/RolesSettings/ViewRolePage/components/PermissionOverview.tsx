import { useCallback, useMemo, useState } from 'react';
import { Typography } from '@signozhq/ui/typography';
import { Button, ButtonGroup } from '@signozhq/ui/button';
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

	const handleExpandAll = useCallback((): void => {
		updateExpandedResources(() => new Set(resources.map((r) => r.resourceId)));
	}, [resources, updateExpandedResources]);

	const handleCollapseAll = useCallback((): void => {
		updateExpandedResources(() => new Set());
	}, [updateExpandedResources]);

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
				<Typography.Text className={styles.errorText} align="center" color="danger">
					Failed to load permissions
				</Typography.Text>
			</div>
		);
	}

	return (
		<div className={styles.container} data-testid="permission-overview">
			<div className={styles.collapseAction}>
				<ButtonGroup
					variant="outlined"
					color="secondary"
					size="sm"
					testId="toggle-all-group"
				>
					<Button onClick={handleExpandAll} data-testid="expand-all-button">
						Expand all
					</Button>
					<Button onClick={handleCollapseAll} data-testid="collapse-all-button">
						Collapse all
					</Button>
				</ButtonGroup>
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
