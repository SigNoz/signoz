import type { QueryKey, UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import type { ServiceDataProps } from 'api/metrics/getTopLevelOperations';
import getTopLevelOperations from 'api/metrics/getTopLevelOperations';

interface UseGetTopLevelOperationsParams {
	start: number;
	end: number;
}

type UseGetTopLevelOperations = (
	queryKey: QueryKey,
	params: UseGetTopLevelOperationsParams,
) => UseQueryResult<ServiceDataProps>;

const useGetTopLevelOperations: UseGetTopLevelOperations = (queryKey, params) =>
	useQuery<ServiceDataProps>({
		queryKey,
		queryFn: (): Promise<ServiceDataProps> =>
			getTopLevelOperations({ start: params.start, end: params.end }),
	});

export default useGetTopLevelOperations;
