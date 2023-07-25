import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { QueryServiceProps } from 'types/api/metrics/getService';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

import ServiceTraceTable from './ServiceTracesTable';

function ServiceTraces(): JSX.Element {
	const { maxTime, minTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);
	const { queries } = useResourceAttribute();
	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries) as Tags[]) || [],
		[queries],
	);

	const { data, error, isLoading }: QueryServiceProps = useQueryService(
		minTime,
		maxTime,
		selectedTime,
		selectedTags,
	);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (error) {
			notifications.error({
				message: error.message,
			});
		}
	}, [error, notifications]);

	if (isLoading) {
		return <Spinner tip="Loading..." />;
	}

	return (
		<ServiceTraceTable
			services={data || []}
			loading={isLoading}
			error={!!error}
		/>
	);
}

export default ServiceTraces;
