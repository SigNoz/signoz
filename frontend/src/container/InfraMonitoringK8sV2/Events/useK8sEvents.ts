import { useMemo } from 'react';

import { useEntityEvents } from '../EntityDetailsUtils/EntityEvents/hooks';
import { K8sEventRow } from './types';
import { useK8sEventsTimeRange } from './useK8sEventsTimeRange';
import { toK8sEventRow } from './utils';

type UseK8sEventsResult = Omit<ReturnType<typeof useEntityEvents>, 'events'> & {
	events: K8sEventRow[];
};

export function useK8sEvents({
	expression,
	offset,
	pageSize,
}: {
	expression: string;
	offset: number;
	pageSize: number;
}): UseK8sEventsResult {
	const timeRange = useK8sEventsTimeRange();

	const result = useEntityEvents({
		queryKey: 'k8sClusterEvents',
		timeRange,
		expression,
		offset,
		pageSize,
	});

	const events = useMemo(
		() => result.events.map(toK8sEventRow),
		[result.events],
	);

	return { ...result, events };
}
