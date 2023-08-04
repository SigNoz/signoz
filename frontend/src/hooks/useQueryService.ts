import getService from 'api/metrics/getService';
import { AxiosError } from 'axios';
import { Time } from 'container/TopNav/DateTimeSelection/config';
import { useQuery, UseQueryResult } from 'react-query';
import { PayloadProps } from 'types/api/metrics/getService';
import { Tags } from 'types/reducer/trace';

export const useQueryService = ({
	minTime,
	maxTime,
	selectedTime,
	selectedTags,
}: UseQueryServiceProps): UseQueryResult<PayloadProps, AxiosError> => {
	const queryKey = [minTime, maxTime, selectedTime, selectedTags];
	return useQuery<PayloadProps, AxiosError>(queryKey, () =>
		getService({
			end: maxTime,
			start: minTime,
			selectedTags,
		}),
	);
};

interface UseQueryServiceProps {
	minTime: number;
	maxTime: number;
	selectedTime: Time;
	selectedTags: Tags[];
}
