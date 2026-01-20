import { getFieldKeys } from 'api/dynamicVariables/getFieldKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { FieldKeyResponse } from 'types/api/dynamicVariables/getFieldKeys';

interface UseGetFieldKeysProps {
	/** Type of signal (traces, logs, metrics) */
	signal?: 'traces' | 'logs' | 'metrics';
	/** Optional search text */
	name?: string;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

/**
 * Hook to fetch field keys for a given signal type
 *
 * If 'complete' in the response is true:
 * - All subsequent searches should be local (client has complete list)
 *
 * If 'complete' is false:
 * - All subsequent searches should use the API (passing the name param)
 */
export const useGetFieldKeys = ({
	signal,
	name,
	enabled = true,
}: UseGetFieldKeysProps): UseQueryResult<SuccessResponseV2<FieldKeyResponse>> =>
	useQuery<SuccessResponseV2<FieldKeyResponse>>({
		queryKey: ['fieldKeys', signal, name],
		queryFn: () => getFieldKeys(signal, name),
		enabled,
	});
