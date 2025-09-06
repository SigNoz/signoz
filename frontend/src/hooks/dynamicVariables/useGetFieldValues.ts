import { getFieldValues } from 'api/dynamicVariables/getFieldValues';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import { FieldValueResponse } from 'types/api/dynamicVariables/getFieldValues';

interface UseGetFieldValuesProps {
	/** Type of signal (traces, logs, metrics) */
	signal?: 'traces' | 'logs' | 'metrics';
	/** Name of the attribute for which values are being fetched */
	name: string;
	/** Optional search text */
	searchText?: string;
	/** Whether the query should be enabled */
	enabled?: boolean;
	/** Start Unix Milli */
	startUnixMilli?: number;
	/** End Unix Milli */
	endUnixMilli?: number;
	/** Existing query */
	existingQuery?: string;
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
	searchText,
	startUnixMilli,
	endUnixMilli,
	enabled = true,
	existingQuery,
}: UseGetFieldValuesProps): UseQueryResult<
	SuccessResponseV2<FieldValueResponse>
> =>
	useQuery<SuccessResponseV2<FieldValueResponse>>({
		queryKey: [
			'fieldValues',
			signal,
			name,
			searchText,
			startUnixMilli,
			endUnixMilli,
			existingQuery,
		],
		queryFn: () =>
			getFieldValues(
				signal,
				name,
				searchText,
				startUnixMilli,
				endUnixMilli,
				existingQuery,
			),
		enabled,
	});
