import getServiceOverview from 'api/metrics/getServiceOverview';
import Spinner from 'components/Spinner';
import Graph from 'container/GridGraphLayout/Graph/GraphWithoutDashboard';
import { GraphTitle } from 'container/MetricsApplication/constant';
import { getWidgetQueryBuilder } from 'container/MetricsApplication/MetricsApplication.factory';
import { letency } from 'container/MetricsApplication/MetricsPageQueries/OverviewQueries';
import { Card, GraphContainer } from 'container/MetricsApplication/styles';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import getStep from 'lib/getStep';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { PayloadProps } from 'types/api/metrics/getServiceOverview';
import { TagFilterItem } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';
import { v4 as uuid } from 'uuid';

import { ClickHandlerType } from '../Overview';
import { Button } from '../styles';
import { onViewTracePopupClick } from '../util';

function ServiceOverview({
	onDragSelect,
	handleGraphClick,
	selectedTraceTags,
	selectedTimeStamp,
	tagFilterItems,
}: ServiceOverviewProps): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { servicename } = useParams<{ servicename?: string }>();
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const latencyWidget = useMemo(
		() =>
			getWidgetQueryBuilder(
				{
					queryType: EQueryType.QUERY_BUILDER,
					promql: [],
					builder: letency({
						servicename,
						tagFilterItems,
					}),
					clickhouse_sql: [],
					id: uuid(),
				},
				GraphTitle.LATENCY,
			),
		[servicename, tagFilterItems],
	);

	const { isLoading } = useQuery<PayloadProps>({
		queryKey: [servicename, selectedTags, minTime, maxTime],
		queryFn: (): Promise<PayloadProps> =>
			getServiceOverview({
				service: servicename || '',
				start: minTime,
				end: maxTime,
				step: getStep({
					start: minTime,
					end: maxTime,
					inputFormat: 'ns',
				}),
				selectedTags,
			}),
	});

	return (
		<>
			<Button
				type="default"
				size="small"
				id="Service_button"
				onClick={onViewTracePopupClick({
					servicename,
					selectedTraceTags,
					timestamp: selectedTimeStamp,
				})}
			>
				View Traces
			</Button>
			<Card>
				<GraphContainer>
					{isLoading && <Spinner size="large" tip="Loading..." height="40vh" />}
					{!isLoading && (
						<Graph
							name="service_latency"
							onDragSelect={onDragSelect}
							widget={latencyWidget}
							yAxisUnit="ms"
							onClickHandler={handleGraphClick('Service')}
						/>
					)}
				</GraphContainer>
			</Card>
		</>
	);
}

interface ServiceOverviewProps {
	selectedTimeStamp: number;
	selectedTraceTags: string;
	onDragSelect: (start: number, end: number) => void;
	handleGraphClick: (type: string) => ClickHandlerType;
	tagFilterItems: TagFilterItem[];
}

export default ServiceOverview;
