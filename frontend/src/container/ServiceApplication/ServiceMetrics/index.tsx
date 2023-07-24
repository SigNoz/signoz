import getTopLevelOperations, {
	ServiceDataProps,
} from 'api/metrics/getTopLevelOperations';
import { useQuery } from 'react-query';

import { ServiceTableProps } from '../types';

function ServiceMetrics({
	servicename,
	minTime,
	maxTime,
	selectedTags,
}: ServiceTableProps): JSX.Element {
	const { data, isLoading, error, isError } = useQuery<ServiceDataProps>({
		queryKey: [servicename, minTime, maxTime, selectedTags],
		queryFn: getTopLevelOperations,
	});

	console.log(data, isLoading, error, isError);

	return (
		<div>
			<h1>ServiceMetrics</h1>
		</div>
	);
}

export default ServiceMetrics;
