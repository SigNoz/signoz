import getService from 'api/metrics/getService';
import { AxiosError } from 'axios';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { QueryServiceProps } from 'pages/Services';
import { useQuery } from 'react-query';
import { PayloadProps } from 'types/api/metrics/getService';
import { Tags } from 'types/reducer/trace';

export const useQueryService = (
	minTime: number,
	maxTime: number,
	selectedTime: Time,
	selectedTags: Tags[],
): QueryServiceProps => {
	const queryKey = [minTime, maxTime, selectedTime, selectedTags];
	const { data, isLoading, error } = useQuery<PayloadProps, AxiosError>(
		queryKey,
		() =>
			getService({
				end: maxTime,
				start: minTime,
				selectedTags,
			}),
	);
	return { data, error, isLoading };
};
