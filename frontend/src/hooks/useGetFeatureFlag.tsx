import list from 'api/v1/features/list';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { SuccessResponseV2 } from 'types/api';
import APIError from 'types/api/error';
import { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';

export interface Props {
	onSuccessHandler: (routes: FeatureFlagProps[]) => void;
	isLoggedIn: boolean;
}
type UseGetFeatureFlag = UseQueryResult<
	SuccessResponseV2<FeatureFlagProps[]>,
	APIError
>;

export const useGetFeatureFlag = (
	onSuccessHandler: (routes: FeatureFlagProps[]) => void,
	isLoggedIn: boolean,
): UseGetFeatureFlag =>
	useQuery<SuccessResponseV2<FeatureFlagProps[]>, APIError>({
		queryKey: [REACT_QUERY_KEY.GET_FEATURES_FLAGS],
		queryFn: () => list(),
		onSuccess: (data) => {
			onSuccessHandler(data.data);
		},
		retryOnMount: false,
		enabled: !!isLoggedIn,
	});
