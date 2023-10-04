import getFeaturesFlags from 'api/features/getFeatureFlags';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import { useQuery, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { FeatureFlagProps } from 'types/api/features/getFeaturesFlags';

const useGetFeatureFlag = (
	onSuccessHandler: (routes: FeatureFlagProps[]) => void,
): UseQueryResult<FeatureFlagProps[], unknown> => {
	const userId: string = useSelector<AppState, string>(
		(state) => state.app.user?.userId || '',
	);

	return useQuery<FeatureFlagProps[]>({
		queryFn: getFeaturesFlags,
		queryKey: [REACT_QUERY_KEY.GET_FEATURES_FLAGS, userId],
		onSuccess: onSuccessHandler,
		retryOnMount: false,
	});
};

export default useGetFeatureFlag;
