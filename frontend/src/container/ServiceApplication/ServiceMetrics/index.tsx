import Spinner from 'components/Spinner';
import useGetTopLevelOperations from 'hooks/useGetTopLevelOperations';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useMemo } from 'react';
import { QueryKey } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import ServiceMetricsApplication from './ServiceMetricsApplication';

function ServicesUsingMetrics(): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const queryKey: QueryKey = [minTime, maxTime, selectedTags, selectedTime];
	const { data, isLoading, isError } = useGetTopLevelOperations(queryKey);

	if (isLoading) {
		return <Spinner tip="Loading..." />;
	}

	return (
		<ServiceMetricsApplication
			topLevelOperations={Object.entries(data || {})}
			loading={isLoading}
			error={isError}
		/>
	);
}

export default ServicesUsingMetrics;
