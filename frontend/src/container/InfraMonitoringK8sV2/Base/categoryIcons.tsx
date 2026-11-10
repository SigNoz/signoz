import type { ComponentProps } from 'react';
import {
	ArrowUpDown,
	Bolt,
	Box,
	Boxes,
	Computer,
	Container,
	FilePenLine,
	Group,
	HardDrive,
	Server,
	Workflow,
} from '@signozhq/icons';

import { InfraMonitoringEntity } from '../constants';

/**
 * One icon per category, so the section tabs and the drawer that opens from
 * them show a resource the same way.
 */
type IconSize = ComponentProps<typeof Container>['size'];

const CATEGORY_ICONS: Record<InfraMonitoringEntity, typeof Container> = {
	[InfraMonitoringEntity.HOSTS]: Server,
	[InfraMonitoringEntity.PODS]: Container,
	[InfraMonitoringEntity.CONTAINERS]: Box,
	[InfraMonitoringEntity.NODES]: Workflow,
	[InfraMonitoringEntity.NAMESPACES]: FilePenLine,
	[InfraMonitoringEntity.CLUSTERS]: Boxes,
	[InfraMonitoringEntity.DEPLOYMENTS]: Computer,
	[InfraMonitoringEntity.STATEFULSETS]: ArrowUpDown,
	[InfraMonitoringEntity.DAEMONSETS]: Group,
	[InfraMonitoringEntity.JOBS]: Bolt,
	[InfraMonitoringEntity.VOLUMES]: HardDrive,
};

export function CategoryIcon({
	category,
	size = 14,
}: {
	category: InfraMonitoringEntity;
	size?: IconSize;
}): JSX.Element {
	const Icon = CATEGORY_ICONS[category];

	return <Icon size={size} />;
}
