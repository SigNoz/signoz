import { useCallback } from 'react';
import {
	InframonitoringtypesContainerStatusDTO,
	InframonitoringtypesNodeConditionDTO,
	InframonitoringtypesPodStatusDTO,
} from 'api/generated/services/sigNoz.schemas';

import {
	useInfraMonitoringContainerStatusFilter,
	useInfraMonitoringNodeReadinessFilter,
	useInfraMonitoringPageListing,
	useInfraMonitoringPodStatusFilter,
} from '../../../hooks';

export type StatusFilterKind = 'pod' | 'node' | 'container';

/**
 * Replaces the status filter with the clicked statuses, rather than adding to it —
 * a click on a count means "show me these", not "add these to what I already have".
 */
export function useSetStatusFilter(
	kind: StatusFilterKind,
): (statuses: string[]) => void {
	const [, setPodStatus] = useInfraMonitoringPodStatusFilter();
	const [, setNodeStatus] = useInfraMonitoringNodeReadinessFilter();
	const [, setContainerStatus] = useInfraMonitoringContainerStatusFilter();
	const [, setCurrentPage] = useInfraMonitoringPageListing();

	return useCallback(
		(statuses: string[]): void => {
			if (statuses.length === 0) {
				return;
			}

			if (kind === 'pod') {
				void setPodStatus(statuses as InframonitoringtypesPodStatusDTO[]);
			} else if (kind === 'node') {
				void setNodeStatus(statuses as InframonitoringtypesNodeConditionDTO[]);
			} else {
				void setContainerStatus(
					statuses as InframonitoringtypesContainerStatusDTO[],
				);
			}

			void setCurrentPage(1);
		},
		[kind, setPodStatus, setNodeStatus, setContainerStatus, setCurrentPage],
	);
}
