import Spinner from 'components/Spinner';
import { useNotifications } from 'hooks/useNotifications';
import { useQueryService } from 'hooks/useQueryService';
import { useEffect } from 'react';
import { QueryServiceProps } from 'types/api/metrics/getService';

import { ServiceTableProps } from '../types';
import ServiceTraceTable from './ServiceTraceTable';

function ServiceTraces({
	minTime,
	maxTime,
	selectedTime,
	selectedTags,
}: ServiceTableProps): JSX.Element {
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
