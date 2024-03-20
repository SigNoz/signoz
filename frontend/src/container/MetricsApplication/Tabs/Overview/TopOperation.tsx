import getTopOperations from 'api/metrics/getTopOperations';
import TopOperationsTable from 'container/MetricsApplication/TopOperationsTable';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { PayloadProps } from 'types/api/metrics/getTopOperations';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

function TopOperation(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { servicename: encodedServiceName } = useParams<{
		servicename?: string;
	}>();
	const servicename = decodeURIComponent(encodedServiceName || '');

	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const { data, isLoading } = useQuery<PayloadProps>({
		queryKey: [minTime, maxTime, servicename, selectedTags],
		queryFn: (): Promise<PayloadProps> =>
			getTopOperations({
				service: servicename || '',
				start: minTime,
				end: maxTime,
				selectedTags,
			}),
	});

	const topOperationData = data || [];

	return <TopOperationsTable data={topOperationData} isLoading={isLoading} />;
}

export default TopOperation;
