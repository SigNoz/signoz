import type { QueryKey, UseQueryOptions, UseQueryResult } from 'react-query';
import { useQuery } from 'react-query';
import getService from 'api/metrics/getService';
import type { AxiosError } from 'axios';
import type {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import type { PayloadProps } from 'types/api/metrics/getService';
import type { Tags } from 'hooks/useResourceAttribute/types';

export const useQueryService = ({
	minTime,
	maxTime,
	selectedTime,
	selectedTags,
	options,
}: UseQueryServiceProps): UseQueryResult<PayloadProps, AxiosError> =>
	useQuery<PayloadProps, AxiosError>({
		queryFn: () => getService({ end: maxTime, selectedTags, start: minTime }),
		queryKey: [minTime, maxTime, selectedTime, selectedTags],
		...options,
	});

interface UseQueryServiceProps {
	minTime: number;
	maxTime: number;
	selectedTime: Time | CustomTimeType;
	selectedTags: Tags[];
	options?: UseQueryOptions<PayloadProps, AxiosError, PayloadProps, QueryKey>;
}
