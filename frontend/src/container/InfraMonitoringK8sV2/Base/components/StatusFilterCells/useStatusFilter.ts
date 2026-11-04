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

interface StatusFilter {
	selected: string[];
	/**
	 * Replaces the filter rather than adding to it — a click on a status means
	 * "show me these", not "add these to what I already have". Empty clears it.
	 */
	setStatusFilter: (statuses: string[]) => void;
}

export function useStatusFilter(kind: StatusFilterKind): StatusFilter {
	const [podStatus, setPodStatus] = useInfraMonitoringPodStatusFilter();
	const [nodeStatus, setNodeStatus] = useInfraMonitoringNodeReadinessFilter();
	const [containerStatus, setContainerStatus] =
		useInfraMonitoringContainerStatusFilter();
	const [, setCurrentPage] = useInfraMonitoringPageListing();

	const setStatusFilter = useCallback(
		(statuses: string[]): void => {
			const next = statuses.length > 0 ? statuses : null;

			if (kind === 'pod') {
				void setPodStatus(next as InframonitoringtypesPodStatusDTO[] | null);
			} else if (kind === 'node') {
				void setNodeStatus(next as InframonitoringtypesNodeConditionDTO[] | null);
			} else {
				void setContainerStatus(
					next as InframonitoringtypesContainerStatusDTO[] | null,
				);
			}

			void setCurrentPage(1);
		},
		[kind, setPodStatus, setNodeStatus, setContainerStatus, setCurrentPage],
	);

	let selected: string[] = containerStatus;
	if (kind === 'pod') {
		selected = podStatus;
	} else if (kind === 'node') {
		selected = nodeStatus;
	}

	return { selected, setStatusFilter };
}
