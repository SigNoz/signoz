import getOnboardingStatus, {
	OnboardingStatusResponse,
} from 'api/messagingQueues/onboarding/getOnboardingStatus';
import { useQuery, UseQueryOptions, UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';

type UseOnboardingStatus = (
	options?: UseQueryOptions<
		SuccessResponse<OnboardingStatusResponse> | ErrorResponse
	>,
) => UseQueryResult<SuccessResponse<OnboardingStatusResponse> | ErrorResponse>;

export const useOnboardingStatus: UseOnboardingStatus = (options) =>
	useQuery<SuccessResponse<OnboardingStatusResponse> | ErrorResponse>({
		queryKey: ['onboardingStatus'],
		queryFn: () => getOnboardingStatus(Date.now() - 15 * 60 * 1000, Date.now()),
		...options,
	});
