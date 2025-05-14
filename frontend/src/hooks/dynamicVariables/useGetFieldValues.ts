import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { useQuery, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FieldValueResponse } from 'types/api/dynamicVariables/getFieldValues';

interface UseGetFieldValuesProps {
	/** Type of signal (traces, logs, metrics) */
	signal?: 'traces' | 'logs' | 'metrics';
	/** Name of the attribute for which values are being fetched */
	name: string;
	/** Optional search text */
	value?: string;
	/** Whether the query should be enabled */
	enabled?: boolean;
}

/**
 * Hook to fetch field values for a given signal type and field name
 *
 * If 'complete' in the response is true:
 * - All subsequent searches should be local (client has complete list)
 *
 * If 'complete' is false:
 * - All subsequent searches should use the API (passing the value param)
 */
export const useGetFieldValues = ({
	signal,
	name,
	value,
	enabled = true,
}: UseGetFieldValuesProps): UseQueryResult<
	SuccessResponse<FieldValueResponse> | ErrorResponse
> =>
	useQuery<SuccessResponse<FieldValueResponse> | ErrorResponse>({
		queryKey: ['fieldValues', signal, name, value],
		queryFn: () => getFieldValues(signal, name, value),
		enabled,
	});
