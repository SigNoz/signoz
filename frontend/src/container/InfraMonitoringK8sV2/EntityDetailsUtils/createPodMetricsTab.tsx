import { Container } from '@signozhq/icons';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';

import { CustomTab } from '../Base/K8sBaseDetails';
import {
	InfraMonitoringEntity,
	podUtilizationByPodWidgetInfo,
	VIEW_TYPES,
} from '../constants';

import EntityMetrics from './EntityMetrics';

interface CreatePodMetricsTabParams<T> {
	getQueryPayload: (
		entity: T,
		start: number,
		end: number,
		dotMetricsEnabled: boolean,
	) => GetQueryResultsProps[];
	category: InfraMonitoringEntity;
	queryKey: string;
}

export function createPodMetricsTab<T>({
	getQueryPayload,
	category,
	queryKey,
}: CreatePodMetricsTabParams<T>): CustomTab<T> {
	return {
		key: VIEW_TYPES.POD_METRICS,
		label: 'Pod Metrics',
		icon: <Container size={14} />,
		render: ({ entity, timeRange, selectedInterval, handleTimeChange }) => (
			<EntityMetrics
				entity={entity}
				selectedInterval={selectedInterval}
				timeRange={timeRange}
				handleTimeChange={handleTimeChange}
				isModalTimeSelection
				entityWidgetInfo={podUtilizationByPodWidgetInfo}
				getEntityQueryPayload={getQueryPayload}
				category={category}
				queryKey={queryKey}
			/>
		),
	};
}
