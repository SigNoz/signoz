import { Space } from 'antd';
import getService from 'api/metrics/getService';
import ReleaseNote from 'components/ReleaseNote';
import Spinner from 'components/Spinner';
import MetricTable from 'container/MetricsTable';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import { useNotifications } from 'hooks/useNotifications';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useEffect, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';
import { Tags } from 'types/reducer/trace';

function Metrics(): JSX.Element {
	const { minTime, maxTime, selectedTime } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const location = useLocation();
	const { queries } = useResourceAttribute();

	const selectedTags = useMemo(
		() => (convertRawQueriesToTraceSelectedTags(queries, '') as Tags[]) || [],
		[queries],
	);

	const { data, error, isLoading } = useQuery(
		[minTime, maxTime, selectedTime],
		() =>
			getService({
				end: maxTime,
				start: minTime,
				selectedTags,
			}),
	);

	const { notifications } = useNotifications();

	useEffect(() => {
		if (error) {
			notifications.error({
				message: data?.error,
			});
		}
	}, [error, data?.error, notifications]);

	if (isLoading) {
		return <Spinner tip="Loading..." />;
	}

	return (
		<Space direction="vertical" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />

			<ResourceAttributesFilter />
			<MetricTable
				services={data?.payload || []}
				loading={isLoading}
				error={!!data?.error}
			/>
		</Space>
	);
}

export default Metrics;
