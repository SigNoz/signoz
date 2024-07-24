import getTopLevelOperations, {
	ServiceDataProps,
} from 'api/metrics/getTopLevelOperations';
import { QueryKey, useQuery, UseQueryResult } from 'react-query';

type UseGetTopLevelOperations = (
	queryKey: QueryKey,
) => UseQueryResult<ServiceDataProps>;

const useGetTopLevelOperations: UseGetTopLevelOperations = (queryKey) =>
	useQuery<ServiceDataProps>({
		queryKey,
		queryFn: (): Promise<ServiceDataProps> => getTopLevelOperations({}),
	});

export default useGetTopLevelOperations;
