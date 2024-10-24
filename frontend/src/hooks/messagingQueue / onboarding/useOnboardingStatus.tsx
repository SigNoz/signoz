import getOnboardingStatus, {
	OnboardingStatusResponse,
} from 'api/messagingQueues/onboarding/getOnboardingStatus';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseOnboardingStatus = (
	options?: UseQueryOptions<
		SuccessResponse<OnboardingStatusResponse> | ErrorResponse
	>,
	endpointService?: string,
	queryKey?: string,
) => UseQueryResult<SuccessResponse<OnboardingStatusResponse> | ErrorResponse>;

export const useOnboardingStatus: UseOnboardingStatus = (
	options,
	endpointService,
	queryKey,
) =>
	useQuery<SuccessResponse<OnboardingStatusResponse> | ErrorResponse>({
		queryKey: [queryKey || `onboardingStatus-${endpointService}`],
		queryFn: () =>
			getOnboardingStatus({
				start: (Date.now() - 15 * 60 * 1000) * 1_000_000,
				end: Date.now() * 1_000_000,
				endpointService,
			}),
		...options,
	});
