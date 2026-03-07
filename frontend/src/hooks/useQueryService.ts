import {
	QueryKey,
	useQuery,
	UseQueryOptions,
	UseQueryResult,
} from 'react-query';
import getService from 'api/metrics/getService';
import { AxiosError } from 'axios';
import {
	CustomTimeType,
	Time,
} from 'container/TopNav/DateTimeSelectionV2/types';
import { PayloadProps } from 'types/api/metrics/getService';
import { Tags } from 'types/reducer/trace';

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
