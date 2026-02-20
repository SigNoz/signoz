import { useQuery, UseQueryResult } from 'react-query';
import { ValidateFunnelResponse, validateFunnelSteps } from 'api/traceFunnels';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { FunnelStepData } from 'types/api/traceFunnels';

export const useValidateFunnelSteps = ({
	funnelId,
	selectedTime,
	startTime,
	endTime,
	enabled,
	steps,
}: {
	funnelId: string;
	selectedTime: string;
	startTime: number;
	endTime: number;
	enabled: boolean;
	steps: FunnelStepData[];
}): UseQueryResult<
	SuccessResponse<ValidateFunnelResponse> | ErrorResponse,
	Error
> =>
	useQuery({
		queryFn: ({ signal }) =>
			validateFunnelSteps(
				{ start_time: startTime, end_time: endTime, steps },
				signal,
			),
		queryKey: [
			REACT_QUERY_KEY.VALIDATE_FUNNEL_STEPS,
			funnelId,
			selectedTime,
			steps.map((step) => {
				// eslint-disable-next-line @typescript-eslint/naming-convention
				const { latency_type: _latency_type, ...rest } = step;
				return rest;
			}),
		],
		enabled,
		staleTime: 0,
	});
