import { Container } from '@signozhq/icons';
import { GetQueryResultsProps } from 'lib/dashboard/getQueryResults';

import { CustomTab } from '../Base/types';
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
	) => GetQueryResultsProps[];
	queryKey: string;
	category: InfraMonitoringEntity;
	docBasePath?: string;
}

export function createPodMetricsTab<T>({
	getQueryPayload,
	queryKey,
	category,
	docBasePath,
}: CreatePodMetricsTabParams<T>): CustomTab<T> {
	const widgetInfo = docBasePath
		? podUtilizationByPodWidgetInfo.map((widget) => ({
				...widget,
				docPath: widget.docPath ? `${docBasePath}${widget.docPath}` : undefined,
			}))
		: podUtilizationByPodWidgetInfo;

	return {
		key: VIEW_TYPES.POD_METRICS,
		label: 'Pod Metrics',
		icon: <Container size={14} />,
		render: ({ entity }) => (
			<EntityMetrics
				entity={entity}
				entityWidgetInfo={widgetInfo}
				getEntityQueryPayload={getQueryPayload}
				queryKey={queryKey}
				category={category}
				view={VIEW_TYPES.POD_METRICS}
			/>
		),
	};
}
