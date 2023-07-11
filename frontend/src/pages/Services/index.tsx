import { Space } from 'antd';
import { AxiosError } from 'axios';
import ReleaseNote from 'components/ReleaseNote';
import Spinner from 'components/Spinner';
import ResourceAttributesFilter from 'container/ResourceAttributesFilter';
import ServicesTable from 'container/ServiceTable';
import { useNotifications } from 'hooks/useNotifications';
import { useQueryService } from 'hooks/useQueryService';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { PayloadProps } from 'types/api/metrics/getService';
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
		<Space direction="vertical" style={{ width: '100%' }}>
			<ReleaseNote path={location.pathname} />

			<ResourceAttributesFilter />
			<ServicesTable services={data || []} loading={isLoading} error={!!error} />
		</Space>
	);
}

export interface QueryServiceProps {
	data: PayloadProps | undefined;
	error: AxiosError;
	isLoading: boolean;
}

export default Metrics;
